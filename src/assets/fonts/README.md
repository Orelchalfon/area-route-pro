# Fonts bundled for the PDF export

`Assistant-Regular.ttf` / `Assistant-Bold.ttf` — the same Assistant family the app loads
from Google Fonts on screen (`index.html`), vendored here because jsPDF's built-in fonts
are WinAnsi and carry no Hebrew at all: a PDF has to embed the face it draws with.

Fetched from Google Fonts (`fonts.gstatic.com`, family Assistant v24, weights 400 and 700)
and licensed under the SIL Open Font License 1.1 — see `OFL.txt`.

They are imported through Vite (`?url` in `src/lib/dayExport/pdfFont.ts`) so the build
emits them as hashed assets and only the PDF export chunk fetches them.
