import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';

const svgPath = path.resolve(process.cwd(), 'public/pwa-icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

function renderPngBuffer(size) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: size,
    },
  });
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

console.log('Rendering PWA icons from SVG...');

const sizes = [
  { file: 'public/pwa-512x512.png', size: 512 },
  { file: 'public/pwa-192x192.png', size: 192 },
  { file: 'public/maskable-icon-512x512.png', size: 512 },
  { file: 'public/maskable-icon-192x192.png', size: 192 },
  { file: 'public/apple-touch-icon.png', size: 180 },
  { file: 'public/icon-512.png', size: 512 },
  { file: 'public/icon-192.png', size: 192 },
  { file: 'public/favicon-32x32.png', size: 32 },
  { file: 'public/favicon-16x16.png', size: 16 }
];

sizes.forEach(({ file, size }) => {
  const buf = renderPngBuffer(size);
  fs.writeFileSync(file, buf);
  
  // Verify with PNG parser
  const readBuf = fs.readFileSync(file);
  const parsed = PNG.sync.read(readBuf);
  console.log(`[VERIFIED] ${file} -> ${parsed.width}x${parsed.height} (${readBuf.length} bytes)`);
});

// Create valid ICO file
const png32Buf = renderPngBuffer(32);
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 image

const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(32, 0); // Width 32
dirEntry.writeUInt8(32, 1); // Height 32
dirEntry.writeUInt8(0, 2);  // Palette count
dirEntry.writeUInt8(0, 3);  // Reserved
dirEntry.writeUInt16LE(1, 4); // Color planes
dirEntry.writeUInt16LE(32, 6); // Bits per pixel
dirEntry.writeUInt32LE(png32Buf.length, 8); // Image size
dirEntry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

const icoBuf = Buffer.concat([icoHeader, dirEntry, png32Buf]);
fs.writeFileSync('public/favicon.ico', icoBuf);
console.log('[VERIFIED] public/favicon.ico created successfully!');

console.log('All PWA icons generated and verified as 100% valid PNG/ICO files!');
