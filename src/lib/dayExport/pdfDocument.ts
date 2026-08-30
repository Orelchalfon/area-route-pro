import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { toVisualOrder } from "./hebrewText";
import type { DayExportMeta, DayExportRow } from "./rows";

// The day's table as a PDF. Kept free of any browser API — the caller creates the jsPDF
// instance and registers the Hebrew font — so the exact shipped layout can be rendered
// and eyeballed from Node.

export const PDF_FONT = "Assistant";
const MARGIN_MM = 10;
const FONT_SIZE = 9;

interface ColumnDef {
  header: string;
  width: number; // mm
  halign: "right" | "center";
  value: (row: DayExportRow) => string;
}

// Logical order: first entry is the RIGHTMOST column. A4 landscape at 10mm margins leaves
// 277mm, which is exactly what these widths add up to.
const COLUMNS: ColumnDef[] = [
  { header: "#", width: 8, halign: "center", value: (r) => String(r.order) },
  { header: "שעה", width: 22, halign: "center", value: (r) => r.time },
  { header: "שם לקוח", width: 34, halign: "right", value: (r) => r.name },
  { header: "טלפון", width: 24, halign: "center", value: (r) => r.phone },
  { header: "כתובת", width: 42, halign: "right", value: (r) => r.address },
  { header: "סוג", width: 24, halign: "right", value: (r) => r.type },
  { header: "הערות", width: 48, halign: "right", value: (r) => r.notes },
  { header: "סטטוס", width: 20, halign: "center", value: (r) => r.status },
  {
    header: "הערת טכנאי",
    width: 55,
    halign: "right",
    value: (r) => r.technicianNotes,
  },
];

/** The slice of jsPDF the line breaker needs — so it can be exercised without a font. */
export interface TextMeasurer {
  splitTextToSize(text: string, width: number): string[];
  internal: { scaleFactor: number };
}

/**
 * autoTable's own line-breaking step, replaced.
 *
 * Pre-wrapping against a width we guess and hope autoTable agrees with is the classic way
 * to scramble RTL line order. Hooking `overflow` instead hands us the cell's REAL content
 * width, with the cell's font already applied to the doc — so the text is wrapped in
 * logical order at the true width and only then flipped to visual, line by line.
 */
export function visualLineBreak(doc: TextMeasurer) {
  return (text: string | string[], width: number): string[] => {
    // autoTable has already split the raw value on "\n" — multi-line technician notes
    // arrive here as several entries and keep their own breaks.
    const lines = Array.isArray(text) ? text : [text];
    const out: string[] = [];
    for (const line of lines) {
      // +1pt for the same rounding slack autoTable's built-in linebreak allows.
      const wrapped = doc.splitTextToSize(
        line,
        width + 1 / doc.internal.scaleFactor,
      );
      if (wrapped.length === 0) out.push("");
      else for (const piece of wrapped) out.push(toVisualOrder(piece));
    }
    return out;
  };
}

export function renderDayPdf(
  doc: jsPDF,
  meta: DayExportMeta,
  rows: DayExportRow[],
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rightEdge = pageWidth - MARGIN_MM;

  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(15);
  doc.text(toVisualOrder(`דף יום — ${meta.dayLabel}`), rightEdge, 15, {
    align: "right",
  });

  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(10);
  const subtitle = [
    `תאריך: ${meta.dateText}`,
    `טכנאי: ${meta.technicianName}`,
    meta.areas.length > 0 ? `אזורים: ${meta.areas.join(", ")}` : "",
  ].filter(Boolean);
  doc.text(toVisualOrder(subtitle.join("   |   ")), rightEdge, 21.5, {
    align: "right",
  });

  // Reversed ONCE, and head / body / columnStyles are all derived from the same reversed
  // array — reversing the columns but not the width map is how RTL tables drift.
  const visualColumns = [...COLUMNS].reverse();
  const breakLines = visualLineBreak(doc);

  autoTable(doc, {
    startY: 26,
    margin: { top: MARGIN_MM, right: MARGIN_MM, bottom: 14, left: MARGIN_MM },
    theme: "grid",
    tableWidth: "wrap",
    head: [visualColumns.map((c) => c.header)],
    // Logical text goes in; `overflow` flips it to visual after wrapping.
    body: rows.map((row) => visualColumns.map((c) => c.value(row))),
    styles: {
      font: PDF_FONT,
      fontStyle: "normal",
      fontSize: FONT_SIZE,
      cellPadding: 1.6,
      valign: "top",
      overflow: breakLines,
      lineColor: [150, 155, 165],
      lineWidth: 0.15,
      textColor: [25, 25, 30],
    },
    headStyles: {
      font: PDF_FONT,
      fontStyle: "bold",
      fillColor: [234, 238, 244],
      textColor: [25, 25, 30],
      halign: "center",
    },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: Object.fromEntries(
      visualColumns.map((c, i) => [i, { cellWidth: c.width, halign: c.halign }]),
    ),
    didDrawPage: (data) => {
      doc.setFont(PDF_FONT, "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 120);
      doc.text(
        toVisualOrder(`עמוד ${data.pageNumber}`),
        pageWidth / 2,
        pageHeight - 6,
        { align: "center" },
      );
      doc.setTextColor(25, 25, 30);
    },
  });
}
