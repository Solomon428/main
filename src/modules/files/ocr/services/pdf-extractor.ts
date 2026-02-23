// Native text extraction for PDFs using pdf-parse (v2 style) with a backward-compatible fallback
// This module focuses on extracting raw text from a PDF buffer.
export async function extractTextNative(pdfBuffer: Buffer): Promise<string> {
  try {
    // Try the v2 API (PDFParse class) if available
    const mod: any = await import('pdf-parse');
    const PDFParse = mod?.PDFParse;
    if (PDFParse) {
      const parser = new PDFParse({ data: pdfBuffer });
      const result: any = await parser.getText();
      if (parser.destroy) await parser.destroy();
      // In v2, result may contain { text: '...' }
      if (result?.text !== undefined) return result.text;
      // Fallback to string if the API returns text directly
      if (typeof result === 'string') return result;
      return '';
    }
  } catch {
    // ignore and fall back to older API below
  }
  // Fallback to the classic callable API for older pdf-parse versions
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse: any = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    return data?.text ?? '';
  } catch (e) {
    throw new Error(`Native extraction failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
