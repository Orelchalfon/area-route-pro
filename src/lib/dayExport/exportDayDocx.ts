import {
  AlignmentType,
  BorderStyle,
  Document,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

import { downloadBlob } from "./download";
import { containsRtl } from "./hebrewText";
import type { DayExportMeta, DayExportRow } from "./rows";

// The same day table as a .docx. Unlike the PDF this needs no bidi work and no embedded
// font: Word stores text in logical order and runs the bidi algorithm itself, so the
// Hebrew just goes in as-is. Reached through a dynamic import, like the PDF exporter.

// A4 in twips (1mm = 56.6929tw), 10mm margins — the same geometry as the PDF, so the two
// files have identical column proportions. These are the PORTRAIT dimensions on purpose:
// docx swaps width and height itself when the orientation is landscape (createPageSize),
// so handing it 297mm-wide would produce a 210mm-wide page.
const MM = 56.6929;
const PAGE_WIDTH = Math.round(210 * MM);
const PAGE_HEIGHT = Math.round(297 * MM);
const MARGIN = Math.round(10 * MM);

interface ColumnDef {
  header: string;
  widthMm: number;
  center: boolean;
  value: (row: DayExportRow) => string;
}

// Logical order. `visuallyRightToLeft` on the table makes Word lay the first column out
// on the RIGHT, so this array is NOT reversed the way the PDF's is.
const COLUMNS: ColumnDef[] = [
  { header: "#", widthMm: 8, center: true, value: (r) => String(r.order) },
  { header: "שעה", widthMm: 22, center: true, value: (r) => r.time },
  { header: "שם לקוח", widthMm: 34, center: false, value: (r) => r.name },
  { header: "טלפון", widthMm: 24, center: true, value: (r) => r.phone },
  { header: "כתובת", widthMm: 42, center: false, value: (r) => r.address },
  { header: "סוג", widthMm: 24, center: false, value: (r) => r.type },
  { header: "הערות", widthMm: 48, center: false, value: (r) => r.notes },
  { header: "סטטוס", widthMm: 20, center: true, value: (r) => r.status },
  {
    header: "הערת טכנאי",
    widthMm: 55,
    center: false,
    value: (r) => r.technicianNotes,
  },
];

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "969BA5" };
const TABLE_BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
  insideHorizontal: BORDER,
  insideVertical: BORDER,
};

function textParagraphs(
  text: string,
  { center = false, bold = false, size = 18 } = {},
): Paragraph[] {
  // A technician's note can hold real line breaks; each becomes its own paragraph so the
  // cell grows instead of running the lines together.
  const lines = text.split(/\r?\n/);
  return lines.map(
    (line) =>
      new Paragraph({
        bidirectional: true,
        alignment: center ? AlignmentType.CENTER : AlignmentType.RIGHT,
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({
            text: line,
            bold,
            size,
            // Marks the run as complex-script so Word picks its Hebrew face for it.
            // Left off pure-ASCII runs (times, phone numbers) on purpose.
            rightToLeft: containsRtl(line),
          }),
        ],
      }),
  );
}

function cell(text: string, column: ColumnDef, bold = false): TableCell {
  return new TableCell({
    width: { size: Math.round(column.widthMm * MM), type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    shading: bold ? { fill: "EAEEF4" } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: textParagraphs(text, { center: column.center || bold, bold }),
  });
}

export async function exportDayDocx(
  meta: DayExportMeta,
  rows: DayExportRow[],
  filename: string,
): Promise<void> {
  const subtitle = [
    `תאריך: ${meta.dateText}`,
    `טכנאי: ${meta.technicianName}`,
    meta.areas.length > 0 ? `אזורים: ${meta.areas.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("   |   ");

  const table = new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: COLUMNS.map((c) => Math.round(c.widthMm * MM)),
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        tableHeader: true, // repeats on every page
        children: COLUMNS.map((c) => cell(c.header, c, true)),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: COLUMNS.map((c) => cell(c.value(row), c)),
          }),
      ),
    ],
  });

  const doc = new Document({
    // docx embeds nothing, so this has to be a face the reader's machine already has.
    styles: { default: { document: { run: { font: "Arial", size: 18 } } } },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
            },
            margin: {
              top: MARGIN,
              right: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
            },
          },
        },
        children: [
          ...textParagraphs(`דף יום — ${meta.dayLabel}`, {
            bold: true,
            size: 30,
          }),
          ...textParagraphs(subtitle, { size: 20 }),
          new Paragraph({ text: "", spacing: { after: 120 } }),
          table,
        ],
      },
    ],
  });

  downloadBlob(await Packer.toBlob(doc), filename);
}
