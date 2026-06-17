// Generates the favicon/app-icon set in public/ from the brand logo.
//
// Requires sharp + png-to-ico (dev-only; not part of the app's runtime deps):
//   npm i -D sharp png-to-ico
//   node scripts/generate-icons.mjs
//
// Source logo: src/assets/logo.png (a 512x512 raster of the טל חרמון mark).
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'src/assets/logo.png');
const PUBLIC = path.join(root, 'public');

const png = (size) => sharp(SOURCE).resize(size, size, { fit: 'cover' }).png();

async function run() {
  // PNG icons referenced from index.html / the web manifest.
  await png(96).toFile(path.join(PUBLIC, 'favicon-96x96.png'));
  await png(180).toFile(path.join(PUBLIC, 'apple-touch-icon.png'));
  await png(192).toFile(path.join(PUBLIC, 'web-app-manifest-192x192.png'));
  await png(512).toFile(path.join(PUBLIC, 'web-app-manifest-512x512.png'));

  // Multi-resolution favicon.ico for the browser's automatic /favicon.ico request.
  const icoSources = await Promise.all([16, 32, 48].map((s) => png(s).toBuffer()));
  await writeFile(path.join(PUBLIC, 'favicon.ico'), await pngToIco(icoSources));

  console.log('Generated icons in public/: favicon.ico, favicon-96x96.png, apple-touch-icon.png, web-app-manifest-{192,512}.png');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
