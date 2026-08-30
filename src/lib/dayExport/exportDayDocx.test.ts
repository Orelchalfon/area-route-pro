import { inflateRawSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportDayDocx } from './exportDayDocx';
import type { DayExportMeta, DayExportRow } from './rows';

// Word needs no bidi work and no embedded font — it stores logical order and runs the
// algorithm itself — but it only lays the table out right-to-left if the file says so.
// These assertions read the generated XML, which is where those switches actually live.

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
    notes: 'פילטר שנתי',
    status: 'בוצע',
    technicianNotes: 'הוחלף פילטר ראשי.\nלחזור בעוד חצי שנה.',
  },
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

let downloaded: Blob[] = [];

beforeEach(() => {
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
      downloaded.push(blob);
      return 'blob:stub';
    },
    revokeObjectURL: () => {},
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function documentXml(): Promise<string> {
  const buffer = await new Promise<Buffer>((resolvePromise) => {
    const reader = new FileReader();
    reader.onload = () => resolvePromise(Buffer.from(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(downloaded[0]);
  });
  return readZipEntry(buffer, 'word/document.xml');
}

// A .docx is a zip. Rather than pull in a zip library for one assertion, walk the central
// directory (whose sizes and offsets are always filled in) and inflate the one entry.
function readZipEntry(zip: Buffer, wanted: string): string {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let offset = zip.readUInt32LE(eocd + 16);
  const entries = zip.readUInt16LE(eocd + 10);
  for (let i = 0; i < entries; i++) {
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (name === wanted) {
      const localNameLength = zip.readUInt16LE(localOffset + 26);
      const localExtraLength = zip.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const data = zip.subarray(start, start + compressedSize);
      return (method === 0 ? data : inflateRawSync(data)).toString('utf8');
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`${wanted} not found in the generated file`);
}

describe('exportDayDocx', () => {
  it('writes an RTL landscape table carrying every column', async () => {
    await exportDayDocx(meta, rows, 'דף-יום-2026-08-30.docx');
    expect(downloaded).toHaveLength(1);

    const xml = await documentXml();

    // The table's columns run right-to-left, and the paragraphs inside them are bidi.
    expect(xml).toContain('<w:bidiVisual');
    expect(xml).toContain('<w:bidi/>');
    // 297mm x 210mm: docx swaps the portrait dimensions for a landscape section, so this
    // is the assertion that catches handing it the numbers the wrong way round.
    expect(xml).toContain('w:w="16838"');
    expect(xml).toContain('w:orient="landscape"');

    for (const header of ['שעה', 'שם לקוח', 'טלפון', 'כתובת', 'סוג', 'הערות', 'סטטוס', 'הערת טכנאי']) {
      expect(xml).toContain(header);
    }
    expect(xml).toContain('דף יום — יום ראשון 30/08');
    expect(xml).toContain('טכנאי: שילה');
    expect(xml).toContain('052-1234567');
    expect(xml).toContain('בוצע');
  });

  it('gives a multi-line technician note one paragraph per line', async () => {
    await exportDayDocx(meta, rows, 'x.docx');
    const xml = await documentXml();
    expect(xml).toContain('הוחלף פילטר ראשי.');
    expect(xml).toContain('לחזור בעוד חצי שנה.');
    // Never as one run with a literal newline in it — Word would collapse the break.
    expect(xml).not.toContain('הוחלף פילטר ראשי.\nלחזור');
  });
});
