// bidi-js ships no type declarations. Only the two entry points the PDF export uses are
// described here; the shapes match dist/bidi.mjs (getEmbeddingLevels / getReorderedString).
declare module "bidi-js" {
  export interface EmbeddingLevelsResult {
    levels: Uint8Array;
    paragraphs: { start: number; end: number; level: number }[];
  }
  export interface Bidi {
    getEmbeddingLevels(
      text: string,
      baseDirection?: "ltr" | "rtl" | "auto",
    ): EmbeddingLevelsResult;
    getReorderedString(
      text: string,
      embeddingLevels: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): string;
    getReorderedIndices(
      text: string,
      embeddingLevels: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): number[];
  }
  export default function bidiFactory(): Bidi;
}
