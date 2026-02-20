import { v4 as uuidv4 } from 'uuid';
import { DateTime, Duration } from 'luxon';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

// ==================== DOMAIN TYPES ====================
export enum ReportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf',
  JSON = 'json',
  HTML = 'html',
  XML = 'xml'
}

export enum ReportType {
  FINANCIAL_SUMMARY = 'financial_summary',
  TRANSACTION_HISTORY = 'transaction_history',
  COMPLIANCE_AUDIT = 'compliance_audit',
  CUSTOMER_ACTIVITY = 'customer_activity',
  RISK_EXPOSURE = 'risk_exposure',
  SLA_PERFORMANCE = 'sla_performance',
  CUSTOM = 'custom'
}

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export interface ReportDefinition {
  id: string;
  name: string;
  type: ReportType;
  description?: string;
  parametersSchema: {
    type: 'object';
    properties: Record<string, {
      type: 'string' | 'number' | 'boolean' | 'date' | 'array';
      format?: 'date' | 'date-time' | 'email' | 'uri';
      enum?: string[];
      minimum?: number;
      maximum?: number;
      items?: { type: string };
      required?: boolean;
      description?: string;
    }>;
    required?: string[];
  };
  queryTemplate: string; // SQL/template for data retrieval
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_demand';
    dayOfWeek?: number; // 1=Mon, 7=Sun
    dayOfMonth?: number; // 1-31
    hour: number; // 0-23
    minute: number; // 0-59
    timezone: string;
  };
  retentionDays: number;
  accessControl: {
    roles: string[];
    users?: string[];
    departments?: string[];
  };
  metadata?: Record<string, any>;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface ReportExecution {
  id: string;
  definitionId: string;
  format: ReportFormat;
  parameters: Record<string, any>;
  status: ReportStatus;
  initiatedBy: string;
  initiatedAt: DateTime;
  completedAt?: DateTime;
  expiresAt: DateTime;
  outputSizeBytes?: number;
  outputUrl?: string;
  error?: string;
  meta Record<string, any>;
}

export interface ReportDataRow {
  [key: string]: string | number | boolean | DateTime | null | undefined;
}

export interface ReportData {
  columns: { key: string; label: string; type?: string; format?: string }[];
  rows: ReportDataRow[];
  metadata: {
    totalRows: number;
    reportDate: DateTime;
    parameters: Record<string, any>;
    definitionName: string;
  };
}

export interface ReportingConfig {
  storageProvider: 'local' | 's3' | 'azure_blob' | 'gcs';
  storagePath: string;
  maxExecutionTimeSeconds: number;
  maxRowsPerReport: number;
  enableCaching: boolean;
  cacheTtlSeconds: number;
  formatsEnabled: ReportFormat[];
  defaultTimezone: string;
  retentionPolicy: {
    completedDays: number;
    failedDays: number;
  };
  watermarkText?: string;
  companyLogoUrl?: string;
}

// ==================== CUSTOM ERRORS ====================
export class ReportingError extends Error {
  constructor(message: string, public readonly code: string) {
    super(`[REPORTING-${code}] ${message}`);
    this.name = 'ReportingError';
  }
}

export class FormatNotSupportedError extends ReportingError {
  constructor(format: ReportFormat) {
    super(`Format ${format} not supported in current configuration`, 'FORMAT_UNSUPPORTED');
    this.name = 'FormatNotSupportedError';
  }
}

export class ReportTimeoutError extends ReportingError {
  constructor(executionId: string, maxSeconds: number) {
    super(`Report execution ${executionId} exceeded ${maxSeconds}s timeout`, 'TIMEOUT');
    this.name = 'ReportTimeoutError';
  }
}

export class DataRetrievalError extends ReportingError {
  constructor(message: string) {
    super(`Data retrieval failed: ${message}`, 'DATA_RETRIEVAL');
    this.name = 'DataRetrievalError';
  }
}

// ==================== FORMAT EXPORTERS ====================
export interface ReportExporter {
  format: ReportFormat;
  export(reportData: ReportData, options?: Record<string, any>): Promise<Buffer>;
  getMimeType(): string;
  getFileExtension(): string;
}

export class CSVExporter implements ReportExporter {
  format = ReportFormat.CSV;
  
  async export(reportData: ReportData): Promise<Buffer> {
    const headers = reportData.columns.map(col => `"${this.escapeCsv(col.label)}"`);
    const rows = reportData.rows.map(row => 
      reportData.columns.map(col => 
        `"${this.escapeCsv(String(row[col.key] ?? ''))}"`
      ).join(',')
    );
    
    const csv = [headers.join(','), ...rows].join('\n');
    return Buffer.from(csv, 'utf-8');
  }
  
  private escapeCsv(value: string): string {
    return value.replace(/"/g, '""');
  }
  
  getMimeType(): string {
    return 'text/csv';
  }
  
  getFileExtension(): string {
    return 'csv';
  }
}

export class ExcelExporter implements ReportExporter {
  format = ReportFormat.EXCEL;
  
  async export(reportData: ReportData, options: { includeChart?: boolean; password?: string } = {}): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportData.metadata.definitionName || 'Report');
    
    // Add header row with styling
    const headerRow = worksheet.addRow(reportData.columns.map(col => col.label));
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add data rows
    for (const row of reportData.rows) {
      const rowData = reportData.columns.map(col => {
        const value = row[col.key];
        if (value instanceof DateTime) {
          return value.toISODate();
        }
        if (typeof value === 'number') {
          if (col.format === 'currency') {
            return value;
          }
          if (col.format === 'percentage') {
            return value / 100;
          }
        }
        return value ?? '';
      });
      worksheet.addRow(rowData);
    }
    
    // Auto-size columns
    reportData.columns.forEach((col, idx) => {
      const column = worksheet.getColumn(idx + 1);
      column.width = Math.min(30, Math.max(col.label.length + 2, 12));
    });
    
    // Add metadata footer
    worksheet.addRow([]);
    worksheet.addRow([`Report generated: ${DateTime.now().toISO()}`]);
    worksheet.addRow([`Total rows: ${reportData.metadata.totalRows}`]);
    
    // Add chart if requested
    if (options.includeChart && reportData.rows.length > 0) {
      // Simple bar chart example (would be customized per report type)
      const chart = worksheet.addChart({
        type: 'bar',
         {
          labels: reportData.rows.slice(0, 10).map((_, i) => `Row ${i + 1}`),
          datasets: [
            {
              label: 'Value',
              data: reportData.rows.slice(0, 10).map(row => Number(row[reportData.columns[1]?.key ?? '']) || 0)
            }
          ]
        }
      });
    }
    
    // Protect sheet if password provided
    if (options.password) {
      worksheet.protect(options.password, {
        selectLockedCells: true,
        selectUnlockedCells: true
      });
    }
    
    return await workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }
  
  getMimeType(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  
  getFileExtension(): string {
    return 'xlsx';
  }
}

export class PDFExporter implements ReportExporter {
  format = ReportFormat.PDF;
  
  constructor(private readonly config: { watermarkText?: string; companyLogoUrl?: string }) {}
  
  async export(reportData: ReportData, options: { orientation?: 'portrait' | 'landscape'; pageSize?: string } = {}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 50,
        size: options.pageSize || 'A4',
        layout: options.orientation || 'portrait'
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      
      // Add logo if configured
      if (this.config.companyLogoUrl && this.config.companyLogoUrl.startsWith('http')) {
        // In production: fetch logo from URL and embed
        doc.fontSize(14).text('CONFIDENTIAL', 50, 50, { align: 'center' });
      } else if (this.config.companyLogoUrl) {
        try {
          const logoPath = path.resolve(this.config.companyLogoUrl);
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 40, { width: 100 });
          }
        } catch (err) {
          console.warn('Failed to embed logo:', err);
        }
      }
      
      // Title
      doc.moveDown(2);
      doc.fontSize(24).text(reportData.metadata.definitionName || 'Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated: ${DateTime.now().toLocaleString(DateTime.DATETIME_FULL)}`, { align: 'center' });
      doc.moveDown(1);
      
      // Parameters table
      if (Object.keys(reportData.metadata.parameters).length > 0) {
        doc.fontSize(12).text('Parameters:', { underline: true });
        Object.entries(reportData.metadata.parameters).forEach(([key, value]) => {
          doc.text(`${key}: ${String(value)}`);
        });
        doc.moveDown(1);
      }
      
      // Column headers
      const columnWidths = this.calculateColumnWidths(reportData.columns, doc);
      const startX = 50;
      let currentY = doc.y + 10;
      
      doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), 25).fill('#4472C4');
      reportData.columns.forEach((col, idx) => {
        const x = startX + columnWidths.slice(0, idx).reduce((a, b) => a + b, 0);
        doc.fillColor('white').fontSize(10).text(col.label, x + 5, currentY + 8);
      });
      
      currentY += 25;
      
      // Data rows
      reportData.rows.forEach((row, rowIndex) => {
        // Alternate row coloring
        const isEven = rowIndex % 2 === 0;
        doc.fillColor(isEven ? '#F2F2F2' : '#FFFFFF');
        doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), 20).fill();
        
        reportData.columns.forEach((col, colIndex) => {
          const x = startX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0);
          const value = row[col.key];
          const displayValue = value instanceof DateTime 
            ? value.toISODate() 
            : value?.toString() || '';
          
          doc.fillColor('black').fontSize(9).text(displayValue, x + 5, currentY + 5, {
            width: columnWidths[colIndex] - 10,
            ellipsis: true
          });
        });
        
        currentY += 20;
        
        // Page break if needed
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
          
          // Repeat header on new page
          doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), 25).fill('#4472C4');
          reportData.columns.forEach((col, idx) => {
            const x = startX + columnWidths.slice(0, idx).reduce((a, b) => a + b, 0);
            doc.fillColor('white').fontSize(10).text(col.label, x + 5, currentY + 8);
          });
          currentY += 25;
        }
      });
      
      // Footer with row count
      doc.moveDown(1);
      doc.fontSize(9).text(`Total rows: ${reportData.metadata.totalRows}`, { align: 'right' });
      
      // Watermark
      if (this.config.watermarkText) {
        doc.fillColor('gray').opacity(0.3);
        doc.fontSize(60).text(this.config.watermarkText, 200, 300, {
          align: 'center',
          rotate: 45
        });
        doc.opacity(1.0);
      }
      
      doc.end();
    });
  }
  
  private calculateColumnWidths(columns: { label: string }[], doc: typeof PDFDocument): number[] {
    const pageWidth = doc.page.width - 100; // margins
    const baseWidth = pageWidth / columns.length;
    
    return columns.map(col => Math.min(baseWidth * 1.5, Math.max(baseWidth * 0.7, 100)));
  }
  
  getMimeType(): string {
    return 'application/pdf';
  }
  
  getFileExtension(): string {
    return 'pdf';
  }
}

export class JSONExporter implements ReportExporter {
  format = ReportFormat.JSON;
  
  async export(reportData: ReportData): Promise<Buffer> {
    const output = {
      meta reportData.metadata,
      columns: reportData.columns,
      rows: reportData.rows.map(row => {
        const transformed: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (value instanceof DateTime) {
            transformed[key] = value.toISO();
          } else {
            transformed[key] = value;
          }
        }
        return transformed;
      })
    };
    
    return Buffer.from(JSON.stringify(output, null, 2), 'utf-8');
  }
  
  getMimeType(): string {
    return 'application/json';
  }
  
  getFileExtension(): string {
    return 'json';
  }
}

// ==================== STORAGE PROVIDERS ====================
export interface ReportStorageProvider {
  store(execution: ReportExecution, content: Buffer): Promise<string>; // returns URL/path
  retrieve(url: string): Promise<Buffer>;
  delete(url: string): Promise<void>;
  cleanupExpired(): Promise<number>;
}

export class LocalStorageProvider implements ReportStorageProvider {
  constructor(private readonly basePath: string) {
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
  }
  
  async store(execution: ReportExecution, content: Buffer): Promise<string> {
    const dir = path.join(this.basePath, execution.definitionId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filename = `${execution.id}.${execution.format}`;
    const filepath = path.join(dir, filename);
    
    await fs.promises.writeFile(filepath, content);
    
    return `/reports/${execution.definitionId}/${filename}`;
  }
  
  async retrieve(url: string): Promise<Buffer> {
    const filepath = path.join(this.basePath, url.replace('/reports/', ''));
    return fs.promises.readFile(filepath);
  }
  
  async delete(url: string): Promise<void> {
    const filepath = path.join(this.basePath, url.replace('/reports/', ''));
    await fs.promises.unlink(filepath);
  }
  
  async cleanupExpired(): Promise<number> {
    // Implementation would scan directories and remove expired files
    return 0;
  }
}

// ==================== REPORTING SERVICE ====================
export class ReportingService {
  private readonly exporters: Map<ReportFormat, ReportExporter>;
  private readonly storageProvider: ReportStorageProvider;
  private readonly cache: Map<string, {  ReportData; expiresAt: DateTime }>;
  
  constructor(
    private readonly config: ReportingConfig,
    private readonly repositories: {
      reportDefinitionRepo: {
        findById: (id: string) => Promise<ReportDefinition | null>;
        findScheduled: (currentTime: DateTime) => Promise<ReportDefinition[]>;
      };
      reportExecutionRepo: {
        save: (execution: ReportExecution) => Promise<ReportExecution>;
        findById: (id: string) => Promise<ReportExecution | null>;
        findPending: () => Promise<ReportExecution[]>;
        markExpired: (before: DateTime) => Promise<number>;
      };
      dataProvider: {
        executeQuery: (queryTemplate: string, parameters: Record<string, any>, maxRows: number) => Promise<ReportDataRow[]>;
        getColumnMeta (queryTemplate: string) => Promise<{ key: string; label: string; type?: string }[]>;
      };
    },
    exporters?: ReportExporter[],
    storageProvider?: ReportStorageProvider,
    private readonly opts: {
      logger?: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: any) => void;
      notificationService?: {
        sendReportReady: (execution: ReportExecution, downloadUrl: string) => Promise<void>;
        sendReportFailed: (execution: ReportExecution, error: string) => Promise<void>;
      };
      accessControlService?: {
        canGenerateReport: (userId: string, definition: ReportDefinition) => Promise<boolean>;
      };
    } = {}
  ) {
    // Initialize exporters
    this.exporters = new Map();
    const defaultExporters: ReportExporter[] = [
      new CSVExporter(),
      new ExcelExporter(),
      new PDFExporter({ watermarkText: config.watermarkText, companyLogoUrl: config.companyLogoUrl }),
      new JSONExporter()
    ];
    
    for (const exporter of exporters || defaultExporters) {
      if (config.formatsEnabled.includes(exporter.format)) {
        this.exporters.set(exporter.format, exporter);
      }
    }
    
    // Initialize storage
    this.storageProvider = storageProvider || new LocalStorageProvider(
      path.join(config.storagePath, 'reports')
    );
    
    // Initialize cache
    this.cache = new Map();
    
    // Validate config
    this.validateConfig();
  }
  
  private validateConfig(): void {
    if (this.config.maxRowsPerReport <= 0 || this.config.maxRowsPerReport > 1000000) {
      throw new ReportingError('maxRowsPerReport must be between 1 and 1,000,000', 'CONFIG_ERR');
    }
    
    if (this.config.maxExecutionTimeSeconds <= 0 || this.config.maxExecutionTimeSeconds > 3600) {
      throw new ReportingError('maxExecutionTimeSeconds must be between 1 and 3600', 'CONFIG_ERR');
    }
  }
  
  async generateReport(
    definitionId: string,
    format: ReportFormat,
    parameters: Record<string, any>,
    userId: string,
    options: { skipCache?: boolean; priority?: 'low' | 'normal' | 'high' } = {}
  ): Promise<ReportExecution> {
    // Validate format support
    if (!this.exporters.has(format)) {
      throw new FormatNotSupportedError(format);
    }
    
    // Retrieve definition
    const definition = await this.repositories.reportDefinitionRepo.findById(definitionId);
    if (!definition) {
      throw new ReportingError(`Report definition ${definitionId} not found`, 'DEFINITION_NOT_FOUND');
    }
    
    // Access control check
    if (this.opts.accessControlService) {
      const allowed = await this.opts.accessControlService.canGenerateReport(userId, definition);
      if (!allowed) {
        throw new ReportingError('User not authorized to generate this report', 'UNAUTHORIZED');
      }
    }
    
    // Validate parameters against schema
    this.validateParameters(parameters, definition.parametersSchema);
    
    // Check cache (unless skipped)
    const cacheKey = this.getCacheKey(definitionId, format, parameters);
    if (!options.skipCache && this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached && DateTime.now() < cached.expiresAt) {
        this.opts.logger?.('debug', 'Using cached report', { definitionId, cacheKey });
        return this.createExecutionFromCache(definition, format, parameters, userId, cached.data);
      }
    }
    
    // Create execution record
    const execution: ReportExecution = {
      id: uuidv4(),
      definitionId,
      format,
      parameters,
      status: ReportStatus.PENDING,
      initiatedBy: userId,
      initiatedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: definition.retentionDays }),
      meta {
        priority: options.priority || 'normal',
        cacheKey
      }
    };
    
    await this.repositories.reportExecutionRepo.save(execution);
    
    // Execute asynchronously (in production: queue to worker)
    this.executeReportInBackground(execution, definition, options.priority || 'normal')
      .catch(err => {
        this.opts.logger?.('error', 'Report generation failed', {
          executionId: execution.id,
          error: err.message
        });
      });
    
    return execution;
  }
  
  private async executeReportInBackground(
    execution: ReportExecution,
    definition: ReportDefinition,
    priority: 'low' | 'normal' | 'high'
  ): Promise<void> {
    try {
      // Update status to GENERATING
      execution.status = ReportStatus.GENERATING;
      execution.metadata = { ...execution.metadata, startedAt: DateTime.now().toISO() };
      await this.repositories.reportExecutionRepo.save(execution);
      
      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new ReportTimeoutError(execution.id, this.config.maxExecutionTimeSeconds)), 
          this.config.maxExecutionTimeSeconds * 1000)
      );
      
      const reportDataPromise = this.retrieveReportData(definition, execution.parameters);
      
      const reportData = await Promise.race([reportDataPromise, timeoutPromise]);
      
      // Export to requested format
      const exporter = this.exporters.get(execution.format);
      if (!exporter) throw new FormatNotSupportedError(execution.format);
      
      const content = await exporter.export(reportData, execution.metadata.exportOptions || {});
      
      // Store output
      const outputUrl = await this.storageProvider.store(execution, content);
      
      // Update execution record
      execution.status = ReportStatus.COMPLETED;
      execution.completedAt = DateTime.now();
      execution.outputUrl = outputUrl;
      execution.outputSizeBytes = content.length;
      execution.metadata = {
        ...execution.metadata,
        generationTimeMs: execution.completedAt.diff(DateTime.fromISO(execution.metadata.startedAt)).milliseconds,
        columnCount: reportData.columns.length,
        rowCount: reportData.metadata.totalRows
      };
      
      await this.repositories.reportExecutionRepo.save(execution);
      
      // Store in cache
      if (this.config.enableCaching) {
        this.cache.set(
          execution.metadata.cacheKey as string,
          {
             reportData,
            expiresAt: DateTime.now().plus({ seconds: this.config.cacheTtlSeconds })
          }
        );
      }
      
      // Notify user
      await this.opts.notificationService?.sendReportReady(execution, outputUrl);
      
      this.opts.logger?.('info', 'Report generation completed', {
        executionId: execution.id,
        definitionId: execution.definitionId,
        format: execution.format,
        rowCount: reportData.metadata.totalRows,
        sizeBytes: content.length
      });
      
    } catch (error) {
      execution.status = ReportStatus.FAILED;
      execution.completedAt = DateTime.now();
      execution.error = error instanceof Error ? error.message : String(error);
      execution.metadata = { ...execution.metadata, errorStack: error instanceof Error ? error.stack : undefined };
      
      await this.repositories.reportExecutionRepo.save(execution);
      
      await this.opts.notificationService?.sendReportFailed(execution, execution.error);
      
      this.opts.logger?.('error', 'Report generation failed', {
        executionId: execution.id,
        error: execution.error,
        stack: execution.metadata.errorStack
      });
    }
  }
  
  private async retrieveReportData(definition: ReportDefinition, parameters: Record<string, any>): Promise<ReportData> {
    try {
      // Get column metadata first
      let columns = await this.repositories.dataProvider.getColumnMetadata(definition.queryTemplate);
      
      // If no columns returned, infer from first row
      const rows = await this.repositories.dataProvider.executeQuery(
        definition.queryTemplate,
        parameters,
        this.config.maxRowsPerReport
      );
      
      if (columns.length === 0 && rows.length > 0) {
        columns = Object.keys(rows[0]).map(key => ({
          key,
          label: this.formatColumnName(key),
          type: typeof rows[0][key]
        }));
      }
      
      // Enforce row limit
      if (rows.length > this.config.maxRowsPerReport) {
        this.opts.logger?.('warn', 'Report row limit exceeded', {
          requested: rows.length,
          limit: this.config.maxRowsPerReport
        });
        rows.length = this.config.maxRowsPerReport;
      }
      
      return {
        columns,
        rows,
        meta {
          totalRows: rows.length,
          reportDate: DateTime.now(),
          parameters,
          definitionName: definition.name
        }
      };
      
    } catch (err) {
      throw new DataRetrievalError(err instanceof Error ? err.message : String(err));
    }
  }
  
  private formatColumnName(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1') // Split camelCase
      .replace(/_/g, ' ')         // Replace underscores
      .replace(/\b\w/g, c => c.toUpperCase()) // Capitalize words
      .trim();
  }
  
  private validateParameters(params: Record<string, any>, schema: any): void {
    if (!schema || !schema.properties) return;
    
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const value = params[key];
      
      if (schema.required?.includes(key) && (value === undefined || value === null)) {
        throw new ReportingError(`Required parameter missing: ${key}`, 'VALIDATION_ERR');
      }
      
      if (value !== undefined && value !== null) {
        // Type validation
        switch (propSchema.type) {
          case 'string':
            if (typeof value !== 'string') {
              throw new ReportingError(`Parameter ${key} must be a string`, 'VALIDATION_ERR');
            }
            if (propSchema.minLength && value.length < propSchema.minLength) {
              throw new ReportingError(`Parameter ${key} too short`, 'VALIDATION_ERR');
            }
            break;
          
          case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
              throw new ReportingError(`Parameter ${key} must be a number`, 'VALIDATION_ERR');
            }
            if (propSchema.minimum !== undefined && value < propSchema.minimum) {
              throw new ReportingError(`Parameter ${key} below minimum`, 'VALIDATION_ERR');
            }
            if (propSchema.maximum !== undefined && value > propSchema.maximum) {
              throw new ReportingError(`Parameter ${key} above maximum`, 'VALIDATION_ERR');
            }
            break;
          
          case 'boolean':
            if (typeof value !== 'boolean') {
              throw new ReportingError(`Parameter ${key} must be a boolean`, 'VALIDATION_ERR');
            }
            break;
          
          case 'date':
            if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              throw new ReportingError(`Parameter ${key} must be YYYY-MM-DD`, 'VALIDATION_ERR');
            }
            break;
        }
      }
    }
  }
  
  private getCacheKey(definitionId: string, format: ReportFormat, parameters: Record<string, any>): string {
    const paramStr = Object.keys(parameters)
      .sort()
      .map(k => `${k}=${JSON.stringify(parameters[k])}`)
      .join('|');
    
    return crypto.createHash('md5')
      .update(`${definitionId}|${format}|${paramStr}`)
      .digest('hex');
  }
  
  private async createExecutionFromCache(
    definition: ReportDefinition,
    format: ReportFormat,
    parameters: Record<string, any>,
    userId: string,
    cachedData: ReportData
  ): Promise<ReportExecution> {
    const exporter = this.exporters.get(format);
    if (!exporter) throw new FormatNotSupportedError(format);
    
    const content = await exporter.export(cachedData);
    const execution: ReportExecution = {
      id: uuidv4(),
      definitionId: definition.id,
      format,
      parameters,
      status: ReportStatus.COMPLETED,
      initiatedBy: userId,
      initiatedAt: DateTime.now(),
      completedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: definition.retentionDays }),
      outputSizeBytes: content.length,
      outputUrl: `/cache/${uuidv4()}.${format}`,
      meta {
        fromCache: true,
        cacheHit: true,
        rowCount: cachedData.metadata.totalRows
      }
    };
    
    // Store cached content
    await this.storageProvider.store(execution, content);
    
    await this.repositories.reportExecutionRepo.save(execution);
    
    return execution;
  }
  
  async getReportExecution(executionId: string): Promise<ReportExecution | null> {
    return this.repositories.reportExecutionRepo.findById(executionId);
  }
  
  async downloadReport(executionId: string, userId: string): Promise<{ content: Buffer; mimeType: string; filename: string }> {
    const execution = await this.repositories.reportExecutionRepo.findById(executionId);
    if (!execution) {
      throw new ReportingError(`Execution ${executionId} not found`, 'NOT_FOUND');
    }
    
    if (execution.status !== ReportStatus.COMPLETED) {
      throw new ReportingError('Report not ready for download', 'NOT_READY');
    }
    
    if (DateTime.now() > execution.expiresAt) {
      throw new ReportingError('Report download link expired', 'EXPIRED');
    }
    
    // Access control: only initiator or admins can download
    if (execution.initiatedBy !== userId) {
      // In production: check admin roles via access control service
      throw new ReportingError('Unauthorized download attempt', 'UNAUTHORIZED');
    }
    
    const content = await this.storageProvider.retrieve(execution.outputUrl!);
    const exporter = this.exporters.get(execution.format);
    
    return {
      content,
      mimeType: exporter?.getMimeType() || 'application/octet-stream',
      filename: `${execution.definitionId}-${DateTime.now().toFormat('yyyyMMdd-HHmmss')}.${exporter?.getFileExtension() || 'dat'}`
    };
  }
  
  async scheduleReports(): Promise<number> {
    const now = DateTime.now().setZone(this.config.defaultTimezone);
    const dueDefinitions = await this.repositories.reportDefinitionRepo.findScheduled(now);
    
    for (const definition of dueDefinitions) {
      if (definition.schedule?.frequency === 'on_demand') continue;
      
      // Default parameters for scheduled reports
      const defaultParams: Record<string, any> = {
        startDate: now.minus({ days: 30 }).toISODate(),
        endDate: now.toISODate()
      };
      
      await this.generateReport(
        definition.id,
        ReportFormat.PDF, // Default format for scheduled reports
        defaultParams,
        'system-scheduler',
        { priority: 'low' }
      );
    }
    
    return dueDefinitions.length;
  }
  
  async cleanupExpiredReports(): Promise<{ executions: number; files: number }> {
    const cutoff = DateTime.now().minus({ days: 7 }); // Clean up failed executions after 7 days
    
    const expiredCount = await this.repositories.reportExecutionRepo.markExpired(cutoff);
    
    // Clean up storage
    const filesDeleted = await this.storageProvider.cleanupExpired();
    
    // Clean up cache
    for (const [key, value] of this.cache.entries()) {
      if (DateTime.now() > value.expiresAt) {
        this.cache.delete(key);
      }
    }
    
    this.opts.logger?.('info', 'Report cleanup completed', { expiredCount, filesDeleted, cacheSize: this.cache.size });
    
    return { executions: expiredCount, files: filesDeleted };
  }
  
  getSupportedFormats(): ReportFormat[] {
    return Array.from(this.exporters.keys());
  }
  
  async getReportDefinition(definitionId: string): Promise<ReportDefinition | null> {
    return this.repositories.reportDefinitionRepo.findById(definitionId);
  }
}

// ==================== MOCK REPOSITORIES FOR EXAMPLE ====================
export class MockReportDefinitionRepository {
  private readonly definitions: ReportDefinition[] = [
    {
      id: 'financial-summary',
      name: 'Financial Summary Report',
      type: ReportType.FINANCIAL_SUMMARY,
      description: 'Monthly financial performance summary',
      parametersSchema: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date', required: true },
          endDate: { type: 'string', format: 'date', required: true },
          currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'], required: false }
        },
        required: ['startDate', 'endDate']
      },
      queryTemplate: 'SELECT * FROM financial_summary WHERE date BETWEEN :startDate AND :endDate',
      schedule: {
        frequency: 'monthly',
        dayOfMonth: 1,
        hour: 6,
        minute: 0,
        timezone: 'America/New_York'
      },
      retentionDays: 90,
      accessControl: { roles: ['finance_manager', 'controller', 'cfo'] },
      createdAt: DateTime.now().minus({ days: 30 }),
      updatedAt: DateTime.now()
    }
  ];
  
  async findById(id: string): Promise<ReportDefinition | null> {
    return this.definitions.find(d => d.id === id) || null;
  }
  
  async findScheduled(currentTime: DateTime): Promise<ReportDefinition[]> {
    // Simplified: return all scheduled definitions for demo
    return this.definitions.filter(d => d.schedule && d.schedule.frequency !== 'on_demand');
  }
}

export class MockReportExecutionRepository {
  private readonly executions = new Map<string, ReportExecution>();
  
  async save(execution: ReportExecution): Promise<ReportExecution> {
    this.executions.set(execution.id, execution);
    return execution;
  }
  
  async findById(id: string): Promise<ReportExecution | null> {
    return this.executions.get(id) || null;
  }
  
  async findPending(): Promise<ReportExecution[]> {
    return Array.from(this.executions.values()).filter(e => e.status === ReportStatus.PENDING);
  }
  
  async markExpired(_before: DateTime): Promise<number> {
    return 0; // Mock
  }
}

export class MockDataProvider {
  async executeQuery(_query: string, _params: Record<string, any>, maxRows: number): Promise<ReportDataRow[]> {
    // Generate mock financial data
    const rows: ReportDataRow[] = [];
    for (let i = 0; i < Math.min(100, maxRows); i++) {
      rows.push({
        date: DateTime.now().minus({ days: i }),
        revenue: Math.floor(Math.random() * 10000) + 1000,
        expenses: Math.floor(Math.random() * 5000) + 500,
        profit: Math.floor(Math.random() * 5000) + 500,
        currency: 'USD'
      });
    }
    return rows;
  }
  
  async getColumnMetadata(_query: string): Promise<{ key: string; label: string; type?: string }[]> {
    return [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'revenue', label: 'Revenue', type: 'number' },
      { key: 'expenses', label: 'Expenses', type: 'number' },
      { key: 'profit', label: 'Profit', type: 'number' },
      { key: 'currency', label: 'Currency', type: 'string' }
    ];
  }
}

// ==================== EXAMPLE USAGE ====================
/*
const config: ReportingConfig = {
  storageProvider: 'local',
  storagePath: './report-storage',
  maxExecutionTimeSeconds: 300,
  maxRowsPerReport: 10000,
  enableCaching: true,
  cacheTtlSeconds: 3600,
  formatsEnabled: [ReportFormat.CSV, ReportFormat.EXCEL, ReportFormat.PDF, ReportFormat.JSON],
  defaultTimezone: 'UTC',
  retentionPolicy: { completedDays: 90, failedDays: 7 }
};

const reportingService = new ReportingService(
  config,
  {
    reportDefinitionRepo: new MockReportDefinitionRepository(),
    reportExecutionRepo: new MockReportExecutionRepository(),
    dataProvider: new MockDataProvider()
  }
);

// Usage:
// const execution = await reportingService.generateReport(
//   'financial-summary',
//   ReportFormat.EXCEL,
//   { startDate: '2026-01-01', endDate: '2026-01-31' },
//   'user-123'
// );
// 
// const download = await reportingService.downloadReport(execution.id, 'user-123');
// fs.writeFileSync(download.filename, download.content);
*/
