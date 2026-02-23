// Simple wrapper to parse a PDF buffer using pdf-parse (supports multiple versions)
export async function parsePdfBuffer(pdfBuffer: Buffer): Promise<string> {
  try {
    const mod: any = await import('pdf-parse');
    const PDFParse = mod?.PDFParse;
    if (PDFParse) {
      const parser = new PDFParse({ data: pdfBuffer });
      const res: any = await parser.getText();
      if (parser.destroy) await parser.destroy();
      if (res?.text) return res.text;
      if (typeof res === 'string') return res;
      return '';
    }
  } catch {
    // ignore and fallback to function API
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse: any = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    return data?.text ?? '';
  } catch {
    return '';
  }
}
