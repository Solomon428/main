import { extractTextNative } from './pdf-extractor';
import { ocrPage } from './ocr.service';

export async function extractTextFromInvoice(pdfBuffer: Buffer): Promise<{ text: string; method: 'native' | 'ocr' }> {
  // Determine parsing mode from environment (optional safety flags)
  const modeEnv = (process.env.PDF_PARSER_MODE ?? 'AUTO').toString().toUpperCase();

  // First attempt native extraction, unless OCR_ONLY mode is enforced
  let text = '' as string;
  let method: 'native' | 'ocr' = 'native';

  if (modeEnv !== 'OCR_ONLY') {
    try {
      text = await extractTextNative(pdfBuffer);
      if (text && text.trim().length > 200) {
        return { text, method: 'native' };
      }
    } catch {
      // fall through to OCR
      text = '';
    }
  }

  // Fallback to OCR for the first few pages to capture data
  try {
    const pagesToTry = 3;
    const promises = [] as Promise<string>[];
    for (let i = 1; i <= pagesToTry; i++) {
      promises.push(ocrPage(pdfBuffer, i));
    }
    const pagesText = await Promise.all(promises);
    const combined = pagesText.filter(t => !!t).join('\n');
    return { text: combined, method: 'ocr' };
  } catch {
    // Last resort: return whatever native text we have
    return { text: text ?? '', method: 'native' };
  }
}
