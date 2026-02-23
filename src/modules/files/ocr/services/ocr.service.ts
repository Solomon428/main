// Node OCR service: hybrid OCR for PDFs using pdf-poppler + tesseract.js + sharp
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

async function convertPdfPageToImage(pdfBuffer: Buffer, pageNum: number): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));
  try {
    const { fromBuffer } = await import('pdf-poppler');
    await fromBuffer(pdfBuffer, {
      format: 'png',
      out_dir: tempDir,
      out_prefix: 'output',
      page: pageNum,
    } as any);
    // Expected produced file: output-<pageNum>.png or similar
    let imagePath = path.join(tempDir, `output-${pageNum}.png`);
    try {
      await fs.access(imagePath);
    } catch {
      const files = await fs.readdir(tempDir);
      const png = files.find(f => f.endsWith('.png'));
      if (png) imagePath = path.join(tempDir, png);
      else throw new Error('OCR image not generated');
    }
    const imageBuffer = await fs.readFile(imagePath);
    return imageBuffer;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  const sharpModule: any = await import('sharp');
  const sharpFn = sharpModule.default ?? sharpModule;
  return sharpFn(imageBuffer).greyscale().normalize().toBuffer();
}

export async function ocrPage(pdfBuffer: Buffer, pageNum: number): Promise<string> {
  const imageBuffer = await convertPdfPageToImage(pdfBuffer, pageNum);
  const preprocessed = await preprocessImage(imageBuffer);
  const workerModule: any = await import('tesseract.js');
  const worker = await workerModule.createWorker({ logger: () => {} });
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data } = await worker.recognize(preprocessed);
  await worker.terminate();
  return (data as any)?.text ?? '';
}
