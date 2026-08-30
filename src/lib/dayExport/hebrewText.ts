import bidiFactory, { type Bidi } from "bidi-js";

// PDF text is positioned glyph by glyph: a PDF viewer draws the characters in the order
// they were written and applies no bidi algorithm of its own. Hebrew therefore has to be
// handed to jsPDF already in VISUAL order. jsPDF's own setR2L() just reverses the whole
// string, which mangles the digit runs inside Hebrew text (phone numbers, house numbers,
// dates), so the real Unicode Bidirectional Algorithm is used instead.
//
// Hebrew needs no glyph shaping (unlike Arabic), which is why reordering alone is enough.
//
// Word needs none of this: .docx stores logical order and Word runs the UBA itself.

const RTL_CHARS = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

let bidi: Bidi | null = null;

/**
 * Logical → visual order for one already-wrapped LINE of text.
 *
 * Must be called per line, never on a paragraph that will be wrapped afterwards:
 * wrapping visually-ordered text puts the resulting lines in the wrong order.
 */
export function toVisualOrder(text: string): string {
  // Times, phone numbers and anything else pure-ASCII reorder to themselves.
  if (!text || !RTL_CHARS.test(text)) return text;
  if (!bidi) bidi = bidiFactory();
  return bidi.getReorderedString(text, bidi.getEmbeddingLevels(text, "rtl"));
}

/** Whether the text contains any right-to-left script at all. */
export function containsRtl(text: string): boolean {
  return RTL_CHARS.test(text);
}
