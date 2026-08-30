import { jsPDF } from "jspdf";

import { downloadBlob } from "./download";
import { renderDayPdf } from "./pdfDocument";
import { registerHebrewFont } from "./pdfFont";
import type { DayExportMeta, DayExportRow } from "./rows";

// Reached only through a dynamic import from DayApprovalDialog, so jspdf / jspdf-autotable
// / bidi-js land in their own chunk instead of the monthly-schedule bundle every manager
// downloads on login.
export async function exportDayPdf(
  meta: DayExportMeta,
  rows: DayExportRow[],
  filename: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await registerHebrewFont(doc);
  renderDayPdf(doc, meta, rows);
  downloadBlob(doc.output("blob"), filename);
}
