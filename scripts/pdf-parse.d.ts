declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info?: { Title?: string; [key: string]: unknown };
  }
  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
  export = pdfParse;
}

// The internal lib module, imported directly by
// src/app/api/v1/analyze-document/route.ts to skip index.js's buggy
// module.parent-triggered debug block under bundling.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info?: { Title?: string; [key: string]: unknown };
  }
  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
  export = pdfParse;
}
