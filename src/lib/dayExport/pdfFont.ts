import type { jsPDF } from "jspdf";

import boldUrl from "@/assets/fonts/Assistant-Bold.ttf?url";
import regularUrl from "@/assets/fonts/Assistant-Regular.ttf?url";

import { PDF_FONT } from "./pdfDocument";

// jsPDF's built-in fonts are WinAnsi — they have no Hebrew at all — so the family the app
// already uses on screen is embedded into the file instead. The TTFs live under src/ and
// are imported through Vite so they come back as hashed, content-addressed asset URLs: a
// hand-written /fonts/... path would hit netlify.toml's catch-all SPA redirect and return
// index.html with status 200, which addFont accepts silently and turns into a PDF full of
// empty boxes.

const VFS_FILES = {
  normal: "Assistant-Regular.ttf",
  bold: "Assistant-Bold.ttf",
} as const;

/** sfnt magic: TrueType (0x00010000 / "true"), TrueType collection, or CFF/OpenType. */
function isFontFile(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const tag = String.fromCharCode(...bytes.subarray(0, 4));
  if (tag === "true" || tag === "ttcf" || tag === "OTTO") return true;
  return (
    bytes[0] === 0x00 &&
    bytes[1] === 0x01 &&
    bytes[2] === 0x00 &&
    bytes[3] === 0x00
  );
}

function toBase64(bytes: Uint8Array): string {
  // Chunked: a ~48KB spread would still be fine, but String.fromCharCode(...) blows the
  // argument limit on larger inputs and this is the kind of thing that gets reused.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function loadFont(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`טעינת הגופן העברי נכשלה (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!isFontFile(bytes)) {
    throw new Error("קובץ הגופן העברי לא נטען כראוי");
  }
  return toBase64(bytes);
}

// Fetched once per session, not once per export.
let fontsPromise: Promise<{ normal: string; bold: string }> | null = null;

function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([loadFont(regularUrl), loadFont(boldUrl)])
      .then(([normal, bold]) => ({ normal, bold }))
      .catch((error) => {
        fontsPromise = null; // let the next attempt retry
        throw error;
      });
  }
  return fontsPromise;
}

export async function registerHebrewFont(doc: jsPDF): Promise<void> {
  const fonts = await loadFonts();
  doc.addFileToVFS(VFS_FILES.normal, fonts.normal);
  doc.addFont(VFS_FILES.normal, PDF_FONT, "normal");
  doc.addFileToVFS(VFS_FILES.bold, fonts.bold);
  doc.addFont(VFS_FILES.bold, PDF_FONT, "bold");
  doc.setFont(PDF_FONT, "normal");
}
