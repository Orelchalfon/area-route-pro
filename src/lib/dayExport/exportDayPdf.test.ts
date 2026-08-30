import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DayExportMeta, DayExportRow } from './rows';

// Covers the part of the PDF export that only exists in a browser: fetching the embedded
// Hebrew font and handing the finished file to the user. The font is served from a hashed
// Vite asset URL precisely because netlify.toml's catch-all redirect answers an unknown
// path with index.html and status 200 — which addFont would accept in silence and turn
// into a PDF full of empty boxes. Hence the magic-byte guard, and hence this test.

const fontBytes = (name: string) =>
  readFileSync(resolve(__dirname, '../../assets/fonts', name));

const meta: DayExportMeta = {
  dayLabel: 'יום ראשון 30/08',
  dateText: '30/08/2026',
  technicianName: 'שילה',
  areas: ['שומרון'],
};

const rows: DayExportRow[] = [
  {
    order: 1,
    time: '10:00-10:20',
    name: 'ישראל ישראלי',
    phone: '052-1234567',
    address: 'הרצל 5, כפר סבא',
    type: 'החלפת פילטר',
    notes: 'פילטר שנתי — להגיע אחרי 10:00',
    status: 'בוצע',
    technicianNotes: 'הוחלף פילטר ראשי.\nלחזור בעוד חצי שנה.',
  },
  // Everything optional missing — generation must not fall over.
  {
    order: 2,
    time: '10:20-11:20',
    name: '—',
    phone: '',
    address: '',
    type: 'תקלה',
    notes: '',
    status: '',
    technicianNotes: '',
  },
];

let downloaded: { blob: Blob; filename: string }[] = [];

beforeEach(() => {
  vi.resetModules(); // the font cache lives at module scope
  downloaded = [];
  const realCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const element = realCreateElement(tag);
    if (tag === 'a') (element as HTMLAnchorElement).click = () => {};
    return element;
  });
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: (blob: Blob) => {
      downloaded.push({ blob, filename: 'pending' });
      return 'blob:stub';
    },
    revokeObjectURL: () => {},
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const readBlob = (blob: Blob) =>
  new Promise<Buffer>((resolvePromise) => {
    const reader = new FileReader();
    reader.onload = () => resolvePromise(Buffer.from(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });

describe('exportDayPdf', () => {
  it('embeds the fonts it fetched and produces a real PDF', async () => {
    vi.stubGlobal('fetch', async (url: string) => ({
      ok: true,
      arrayBuffer: async () => {
        const file = url.includes('Bold')
          ? 'Assistant-Bold.ttf'
          : 'Assistant-Regular.ttf';
        const bytes = fontBytes(file);
        return bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        );
      },
    }));

    const { exportDayPdf } = await import('./exportDayPdf');
    await exportDayPdf(meta, rows, 'דף-יום-2026-08-30.pdf');

    expect(downloaded).toHaveLength(1);
    const buffer = await readBlob(downloaded[0].blob);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // A PDF with two embedded TrueType subsets is comfortably past 20KB; a font that
    // failed to embed would come out far smaller.
    expect(buffer.byteLength).toBeGreaterThan(20_000);
    expect(buffer.toString('latin1')).toContain('Assistant');
  });

  it('refuses the SPA fallback rather than writing a PDF of empty boxes', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true, // netlify answers an unknown path with index.html and status 200
      arrayBuffer: async () =>
        new TextEncoder().encode('<!doctype html><html></html>').buffer,
    }));

    const { exportDayPdf } = await import('./exportDayPdf');
    await expect(exportDayPdf(meta, rows, 'x.pdf')).rejects.toThrow(
      'קובץ הגופן העברי לא נטען כראוי',
    );
    expect(downloaded).toHaveLength(0);
  });
});
