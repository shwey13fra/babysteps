// Minimal local declaration for pdf-parse, which ships no types.
// A local .d.ts rather than @types/pdf-parse: no new dependency (CLAUDE.md rule 5), and
// only the two fields this project uses are declared.
declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
  }
  function pdfParse(data: Buffer | Uint8Array): Promise<PdfParseResult>;
  export default pdfParse;
}
