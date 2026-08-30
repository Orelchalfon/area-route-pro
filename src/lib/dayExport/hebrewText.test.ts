import { describe, expect, it } from 'vitest';
import { containsRtl, toVisualOrder } from './hebrewText';
import { visualLineBreak, type TextMeasurer } from './pdfDocument';

// A PDF viewer draws glyphs in the order the file lists them and runs no bidi algorithm of
// its own, so Hebrew has to reach jsPDF already in VISUAL order. These tests describe that
// order as "what you would read left-to-right across the page", which is the only way to
// state it unambiguously in a source file a bidi-aware editor will re-order on screen.

const pageOrder = (text: string) => [...toVisualOrder(text)].join('|');

describe('toVisualOrder', () => {
  it('leaves text with no Hebrew in it exactly as it is', () => {
    expect(toVisualOrder('052-1234567')).toBe('052-1234567');
    expect(toVisualOrder('10:00-10:20')).toBe('10:00-10:20');
    expect(toVisualOrder('Rothschild 1, Tel Aviv')).toBe('Rothschild 1, Tel Aviv');
    expect(toVisualOrder('')).toBe('');
  });

  it('lays a Hebrew word out right-to-left', () => {
    // "שלום" — the ש ends up rightmost, so it is the LAST character on the page line.
    expect(pageOrder('שלום')).toBe('ם|ו|ל|ש');
  });

  it('keeps a number inside Hebrew reading left-to-right', () => {
    // "אחרי 10:00" — the clock time must not come out as "00:01".
    expect(pageOrder('אחרי 10:00')).toBe('1|0|:|0|0| |י|ר|ח|א');
  });

  it('keeps a house number and its letter suffix in the right places', () => {
    expect(pageOrder('האלון 12א')).toBe('א|1|2| |ן|ו|ל|א|ה');
  });

  it('keeps a phone number intact inside a Hebrew sentence', () => {
    expect(toVisualOrder('טלפון 052-1234567')).toContain('052-1234567');
  });
});

describe('containsRtl', () => {
  it('separates Hebrew from plain ASCII', () => {
    expect(containsRtl('הערה')).toBe(true);
    expect(containsRtl('note 2026')).toBe(false);
    expect(containsRtl('')).toBe(false);
  });
});

// A fake measurer that wraps on a fixed number of characters, so the ORDER of the produced
// lines is testable without a real font.
const measurer = (charsPerLine: number): TextMeasurer => ({
  internal: { scaleFactor: 1 },
  splitTextToSize: (text: string) => {
    const out: string[] = [];
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > charsPerLine && line) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) out.push(line);
    return out;
  },
});

describe('visualLineBreak', () => {
  it('wraps in logical order first and flips each line afterwards', () => {
    // Wrapping text that is ALREADY visual is the classic RTL bug: the lines come out in
    // the wrong order. "אחת שתיים שלוש" must break into "אחת שתיים" / "שלוש".
    const lines = visualLineBreak(measurer(10))('אחת שתיים שלוש', 10);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(toVisualOrder('אחת שתיים'));
    expect(lines[1]).toBe(toVisualOrder('שלוש'));
  });

  it('keeps the line breaks autoTable already split out of a technician note', () => {
    const lines = visualLineBreak(measurer(80))(['שורה ראשונה', 'שורה שנייה'], 80);
    expect(lines).toEqual([
      toVisualOrder('שורה ראשונה'),
      toVisualOrder('שורה שנייה'),
    ]);
  });

  it('returns an empty line rather than nothing for an empty cell', () => {
    expect(visualLineBreak(measurer(10))('', 10)).toEqual(['']);
  });
});
