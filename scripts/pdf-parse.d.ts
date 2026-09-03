declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info?: { Title?: string; [key: string]: unknown };
  }
  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
  export = pdfParse;
}
