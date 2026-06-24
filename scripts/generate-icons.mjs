// Generates the favicon/app-icon set in public/ from the brand logo.
//
// Uses pure-JS tooling (no native build), dev-only / not an app runtime dep:
//   npm i -D jimp@0.22 png-to-ico
//   node scripts/generate-icons.mjs
//
// Source logo: src/assets/logo.png (a 512x512 raster of the טל חרמון mark).
import Jimp from 'jimp';
import pngToIco from 'png-to-ico';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'src/assets/logo.png');
const PUBLIC = path.join(root, 'public');

const base = await Jimp.read(SOURCE);
const png = (size) => base.clone().resize(size, size).getBufferAsync(Jimp.MIME_PNG);

// PNG icons referenced from index.html / the web manifest.
await writeFile(path.join(PUBLIC, 'favicon-96x96.png'), await png(96));
await writeFile(path.join(PUBLIC, 'apple-touch-icon.png'), await png(180));
await writeFile(path.join(PUBLIC, 'web-app-manifest-192x192.png'), await png(192));
await writeFile(path.join(PUBLIC, 'web-app-manifest-512x512.png'), await png(512));

// Multi-resolution favicon.ico for the browser's automatic /favicon.ico request.
await writeFile(
  path.join(PUBLIC, 'favicon.ico'),
  await pngToIco([await png(16), await png(32), await png(48)]),
);

console.log('Generated public/: favicon.ico, favicon-96x96.png, apple-touch-icon.png, web-app-manifest-{192,512}.png');
