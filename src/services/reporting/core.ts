import { v4 as uuidv4 } from "uuid";
import path from "path";
import {
  ReportDefinition,
  ReportExecution,
  ReportData,
  ReportFormat,
  ReportStatus,
} from "./types";
import {
  ReportExporter,
  CSVExporter,
  ExcelExporter,
  PDFExporter,
  JSONExporter,
  ReportStorageProvider,
  LocalStorageProvider,
} from "./exporters";

export interface ReportingConfig {
  maxRowsPerReport: number;
  maxExecutionTimeSeconds: number;
  enableCaching: boolean;
  cacheExpiryMinutes: number;
  formatsEnabled: ReportFormat[];
  storagePath: string;
  watermarkText?: string;
  companyLogoUrl?: string;
}

export class ReportingError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ReportingError";
  }
}

export class FormatNotSupportedError extends ReportingError {
  constructor(format: ReportFormat) {
    super(`Format ${format} is not supported`, "FORMAT_NOT_SUPPORTED");
    this.name = "FormatNotSupportedError";
  }
}

export class ReportingService {
  private readonly exporters: Map<ReportFormat, ReportExporter>;
  private readonly storageProvider: ReportStorageProvider;
  private readonly cache: Map<string, { data: ReportData; expiresAt: Date }>;

  constructor(
    private readonly config: ReportingConfig,
    private readonly repositories: {
      reportDefinitionRepo: {
        findById: (id: string) => Promise<ReportDefinition | null>;
        findScheduled: (currentTime: Date) => Promise<ReportDefinition[]>;
      };
      reportExecutionRepo: {
        save: (execution: ReportExecution) => Promise<ReportExecution>;
        findById: (id: string) => Promise<ReportExecution | null>;
        findPending: () => Promise<ReportExecution[]>;
        markExpired: (before: Date) => Promise<number>;
      };
      dataProvider: {
        executeQuery: (
          queryTemplate: string,
          parameters: Record<string, unknown>,
          maxRows: number,
        ) => Promise<any[]>;
        getColumnMeta: (
          queryTemplate: string,
        ) => Promise<{ key: string; label: string; type?: string }[]>;
      };
    },
    exporters?: ReportExporter[],
    storageProvider?: ReportStorageProvider,
    private readonly opts: {
      logger?: (level: string, msg: string, meta?: unknown) => void;
      notificationService?: {
        sendReportReady: (
          execution: ReportExecution,
          downloadUrl: string,
        ) => Promise<void>;
        sendReportFailed: (
          execution: ReportExecution,
          error: string,
        ) => Promise<void>;
      };
      accessControlService?: {
        canGenerateReport: (
          userId: string,
          definition: ReportDefinition,
        ) => Promise<boolean>;
      };
    } = {},
  ) {
    this.exporters = new Map();
    const defaultExporters: ReportExporter[] = [
      new CSVExporter(),
      new ExcelExporter(),
      new PDFExporter({
        watermarkText: config.watermarkText,
        companyLogoUrl: config.companyLogoUrl,
      }),
      new JSONExporter(),
    ];

    for (const exporter of exporters || defaultExporters) {
      if (config.formatsEnabled.includes(exporter.format)) {
        this.exporters.set(exporter.format, exporter);
      }
    }

    this.storageProvider =
      storageProvider ||
      new LocalStorageProvider(path.join(config.storagePath, "reports"));

    this.cache = new Map();
    this.validateConfig();
  }

  private validateConfig(): void {
    if (
      this.config.maxRowsPerReport <= 0 ||
      this.config.maxRowsPerReport > 1000000
    ) {
      throw new ReportingError(
        "maxRowsPerReport must be between 1 and 1,000,000",
        "CONFIG_ERR",
      );
    }

    if (
      this.config.maxExecutionTimeSeconds <= 0 ||
      this.config.maxExecutionTimeSeconds > 3600
    ) {
      throw new ReportingError(
        "maxExecutionTimeSeconds must be between 1 and 3600",
        "CONFIG_ERR",
      );
    }
  }

  async generateReport(
    definitionId: string,
    format: ReportFormat,
    parameters: Record<string, unknown>,
    userId: string,
    options: { skipCache?: boolean; priority?: string } = {},
  ): Promise<ReportExecution> {
    if (!this.exporters.has(format)) {
      throw new FormatNotSupportedError(format);
    }

    const definition =
      await this.repositories.reportDefinitionRepo.findById(definitionId);
    if (!definition) {
      throw new ReportingError(
        `Report definition ${definitionId} not found`,
        "DEFINITION_NOT_FOUND",
      );
    }

    if (this.opts.accessControlService) {
      const allowed = await this.opts.accessControlService.canGenerateReport(
        userId,
        definition,
      );
      if (!allowed) {
        throw new ReportingError(
          "User not authorized to generate this report",
          "UNAUTHORIZED",
        );
      }
    }

    this.validateParameters(parameters, definition.parametersSchema);

    const cacheKey = this.getCacheKey(definitionId, format, parameters);
    if (!options.skipCache && this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached && new Date() < cached.expiresAt) {
        this.opts.logger?.("debug", "Using cached report", {
          definitionId,
          cacheKey,
        });
        return this.createExecutionFromCache(
          definition,
          format,
          parameters,
          userId,
          cached.data,
        );
      }
    }

    const execution: ReportExecution = {
      id: uuidv4(),
      definitionId,
      format,
      parameters,
      status: ReportStatus.PENDING,
      initiatedBy: userId,
      initiatedAt: new Date(),
      expiresAt: new Date(
        Date.now() + definition.retentionDays * 24 * 60 * 60 * 1000,
      ),
    };

    await this.repositories.reportExecutionRepo.save(execution);

    try {
      execution.status = ReportStatus.GENERATING;
      await this.repositories.reportExecutionRepo.save(execution);

      const queryResult = await this.repositories.dataProvider.executeQuery(
        definition.queryTemplate,
        parameters,
        this.config.maxRowsPerReport,
      );

      const columns = await this.repositories.dataProvider.getColumnMeta(
        definition.queryTemplate,
      );

      const reportData: ReportData = {
        columns,
        rows: queryResult,
        metadata: {
          totalRows: queryResult.length,
          reportDate: new Date(),
          generatedBy: userId,
          parameters,
        },
      };

      const exporter = this.exporters.get(format)!;
      const content = await exporter.export(reportData);

      const outputUrl = await this.storageProvider.store(execution, content);

      execution.status = ReportStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.outputUrl = outputUrl;
      execution.outputSizeBytes = content.length;

      await this.repositories.reportExecutionRepo.save(execution);

      if (this.config.enableCaching) {
        this.cache.set(cacheKey, {
          data: reportData,
          expiresAt: new Date(
            Date.now() + this.config.cacheExpiryMinutes * 60 * 1000,
          ),
        });
      }

      this.opts.notificationService?.sendReportReady(execution, outputUrl);

      return execution;
    } catch (error) {
      execution.status = ReportStatus.FAILED;
      execution.error =
        error instanceof Error ? error.message : "Unknown error";
      await this.repositories.reportExecutionRepo.save(execution);

      this.opts.notificationService?.sendReportFailed(
        execution,
        error instanceof Error ? error.message : "Unknown error",
      );

      throw error;
    }
  }

  private validateParameters(
    params: Record<string, unknown>,
    schema: ReportDefinition["parametersSchema"],
  ): void {
    if (!schema.properties) return;

    const required = schema.required || [];
    for (const field of required) {
      if (!(field in params)) {
        throw new ReportingError(
          `Missing required parameter: ${field}`,
          "INVALID_PARAMETERS",
        );
      }
    }
  }

  private getCacheKey(
    definitionId: string,
    format: ReportFormat,
    params: Record<string, unknown>,
  ): string {
    return `${definitionId}:${format}:${JSON.stringify(params)}`;
  }

  private createExecutionFromCache(
    definition: ReportDefinition,
    format: ReportFormat,
    params: Record<string, unknown>,
    userId: string,
    data: ReportData,
  ): ReportExecution {
    return {
      id: uuidv4(),
      definitionId: definition.id,
      format,
      parameters: params,
      status: ReportStatus.COMPLETED,
      initiatedBy: userId,
      initiatedAt: new Date(),
      completedAt: new Date(),
      expiresAt: new Date(
        Date.now() + definition.retentionDays * 24 * 60 * 60 * 1000,
      ),
      outputSizeBytes: 0,
      outputUrl: "",
    };
  }

  async getReportExecution(
    executionId: string,
  ): Promise<ReportExecution | null> {
    return this.repositories.reportExecutionRepo.findById(executionId);
  }

  async getReportData(
    executionId: string,
  ): Promise<{ execution: ReportExecution; data?: Buffer }> {
    const execution =
      await this.repositories.reportExecutionRepo.findById(executionId);
    if (!execution) {
      throw new ReportingError("Execution not found", "NOT_FOUND");
    }

    if (execution.status !== ReportStatus.COMPLETED || !execution.outputUrl) {
      throw new ReportingError("Report not ready", "NOT_READY");
    }

    const data = await this.storageProvider.retrieve(execution.outputUrl);
    return { execution, data };
  }

  async listReportDefinitions(): Promise<ReportDefinition[]> {
    return [];
  }

  async deleteReportExecution(executionId: string): Promise<void> {
    const execution =
      await this.repositories.reportExecutionRepo.findById(executionId);
    if (execution?.outputUrl) {
      await this.storageProvider.delete(execution.outputUrl);
    }
  }
}
