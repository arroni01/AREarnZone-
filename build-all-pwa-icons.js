import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';

const svgPath = path.resolve(process.cwd(), 'public/pwa-icon.svg');
if (!fs.existsSync(svgPath)) {
  console.error('Error: public/pwa-icon.svg not found!');
  process.exit(1);
}

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

console.log('Generating official AR EARN ZONE high-resolution PWA icons...');

const iconMap = [
  // Standard square icons
  { name: 'pwa-72x72.png', size: 72 },
  { name: 'pwa-96x96.png', size: 96 },
  { name: 'pwa-128x128.png', size: 128 },
  { name: 'pwa-144x144.png', size: 144 },
  { name: 'pwa-152x152.png', size: 152 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-384x384.png', size: 384 },
  { name: 'pwa-512x512.png', size: 512 },

  // Secondary aliases
  { name: 'icon-72.png', size: 72 },
  { name: 'icon-96.png', size: 96 },
  { name: 'icon-128.png', size: 128 },
  { name: 'icon-144.png', size: 144 },
  { name: 'icon-152.png', size: 152 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-384.png', size: 384 },
  { name: 'icon-512.png', size: 512 },

  // Maskable icons (Full bleed 100% canvas fill with safe-zone logo)
  { name: 'maskable-icon-192x192.png', size: 192 },
  { name: 'maskable-icon-512x512.png', size: 512 },

  // Apple & Favicon
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-16x16.png', size: 16 },
];

const targetDirs = ['public'];
if (fs.existsSync('dist')) {
  targetDirs.push('dist');
}

iconMap.forEach(({ name, size }) => {
  const buf = renderPngBuffer(size);

  // Validate PNG buffer
  const parsed = PNG.sync.read(buf);
  if (parsed.width !== size || parsed.height !== size) {
    throw new Error(`Failed validating ${name}: generated ${parsed.width}x${parsed.height} instead of ${size}x${size}`);
  }

  targetDirs.forEach((dir) => {
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, buf);
    console.log(`[SAVED] ${filePath} (${size}x${size}, ${buf.length} bytes)`);
  });
});

// Generate favicon.ico (32x32)
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

targetDirs.forEach((dir) => {
  const icoPath = path.join(dir, 'favicon.ico');
  fs.writeFileSync(icoPath, icoBuf);
  console.log(`[SAVED] ${icoPath} (${icoBuf.length} bytes)`);
});

console.log('Successfully generated and validated all PWA icons!');
