// ============================================================================
// Type Declarations for Missing Modules
// ============================================================================

declare module 'winston' {
  export const format: any;
  export const createLogger: any;
  export const transports: any;
  export const Logger: any;
}

declare module 'sharp' {
  const sharp: any;
  export default sharp;
}

declare module 'pdf-poppler' {
  export function pdfToText(path: string, options?: any): Promise<string>;
  export function pdfToImages(path: string, options?: any): Promise<string[]>;
}

declare module 'file-type' {
  function fileType(buffer: Buffer): Promise<{ ext: string; mime: string } | undefined>;
  export = fileType;
}

declare module '@google-cloud/vision' {
  export const ImageAnnotatorClient: any;
}

declare module '@aws-sdk/client-textract' {
  export class TextractClient {}
  export class AnalyzeDocumentCommand {}
}
