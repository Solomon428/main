import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  ReportDefinition,
  ReportExecution,
  ReportData,
  ReportDataRow,
  ReportFormat,
  ReportOptions,
} from "./types";

export interface ReportExporter {
  format: ReportFormat;
  export(reportData: ReportData): Promise<Buffer>;
  getMimeType(): string;
  getFileExtension(): string;
}

export class CSVExporter implements ReportExporter {
  format = ReportFormat.CSV;

  async export(reportData: ReportData): Promise<Buffer> {
    const headers = reportData.columns.map((col) => col.label).join(",");
    const rows = reportData.rows.map((row) =>
      reportData.columns
        .map((col) => {
          const value = row[col.key];
          if (value === null || value === undefined) return "";
          const str = String(value);
          return str.includes(",") || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(","),
    );
    return Buffer.from([headers, ...rows].join("\n"), "utf-8");
  }

  getMimeType(): string {
    return "text/csv";
  }

  getFileExtension(): string {
    return "csv";
  }
}

export class ExcelExporter implements ReportExporter {
  format = ReportFormat.EXCEL;

  async export(reportData: ReportData): Promise<Buffer> {
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report");

    worksheet.addRow(reportData.columns.map((col) => col.label));

    for (const row of reportData.rows) {
      worksheet.addRow(reportData.columns.map((col) => row[col.key]));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  getMimeType(): string {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  getFileExtension(): string {
    return "xlsx";
  }
}

export class PDFExporter implements ReportExporter {
  format = ReportFormat.PDF;

  constructor(
    private options?: { watermarkText?: string; companyLogoUrl?: string },
  ) {}

  async export(reportData: ReportData): Promise<Buffer> {
    const PDFDocument = require("pdfkit");
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        if (this.options?.watermarkText) {
          doc
            .fillColor("#aaa")
            .fontSize(50)
            .text(this.options.watermarkText, 0, 0, {
              align: "center",
              angle: 45,
            });
        }

        doc.fillColor("#000").fontSize(16).text("Report", { align: "center" });
        doc.moveDown();

        const tableTop = doc.y;
        const colWidths = reportData.columns.map(() => 150);

        doc.fontSize(10).fillColor("#333");
        let x = 50;
        for (const col of reportData.columns) {
          doc.text(col.label, x, tableTop, {
            width: colWidths[reportData.columns.indexOf(col)],
            align: "left",
          });
          x += colWidths[reportData.columns.indexOf(col)];
        }

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

        let y = tableTop + 20;
        for (const row of reportData.rows) {
          x = 50;
          for (const col of reportData.columns) {
            const value =
              row[col.key] !== null && row[col.key] !== undefined
                ? String(row[col.key])
                : "";
            doc.text(value, x, y, {
              width: colWidths[reportData.columns.indexOf(col)],
              align: "left",
            });
            x += colWidths[reportData.columns.indexOf(col)];
          }
          y += 15;
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  getMimeType(): string {
    return "application/pdf";
  }

  getFileExtension(): string {
    return "pdf";
  }
}

export class JSONExporter implements ReportExporter {
  format = ReportFormat.JSON;

  async export(reportData: ReportData): Promise<Buffer> {
    const output = {
      metadata: reportData.metadata,
      columns: reportData.columns,
      rows: reportData.rows.map((row) => {
        const transformed: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          if (value instanceof Date) {
            transformed[key] = value.toISOString();
          } else {
            transformed[key] = value;
          }
        }
        return transformed;
      }),
    };
    return Buffer.from(JSON.stringify(output, null, 2), "utf-8");
  }

  getMimeType(): string {
    return "application/json";
  }

  getFileExtension(): string {
    return "json";
  }
}

export interface ReportStorageProvider {
  store(execution: ReportExecution, content: Buffer): Promise<string>;
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
    const filepath = path.join(this.basePath, url.replace("/reports/", ""));
    return fs.promises.readFile(filepath);
  }

  async delete(url: string): Promise<void> {
    const filepath = path.join(this.basePath, url.replace("/reports/", ""));
    await fs.promises.unlink(filepath);
  }

  async cleanupExpired(): Promise<number> {
    return 0;
  }
}
