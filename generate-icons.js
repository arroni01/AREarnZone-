import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';

const svgPath = path.resolve(process.cwd(), 'public/pwa-icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

function renderPng(width, height) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

console.log('Rendering high-res icons...');

const png512 = renderPng(512, 512);
const png192 = renderPng(192, 192);
const png180 = renderPng(180, 180);
const png64 = renderPng(64, 64);
const png32 = renderPng(32, 32);

// Write files
fs.writeFileSync('public/pwa-512x512.png', png512);
fs.writeFileSync('public/icon-512.png', png512);
fs.writeFileSync('public/icon-512.jpg', png512); // Fallback copy if requested

fs.writeFileSync('public/pwa-192x192.png', png192);
fs.writeFileSync('public/icon-192.png', png192);
fs.writeFileSync('public/icon-192.jpg', png192); // Fallback copy if requested

fs.writeFileSync('public/maskable-icon-192x192.png', png192);
fs.writeFileSync('public/maskable-icon-512x512.png', png512);

fs.writeFileSync('public/apple-touch-icon.png', png180);
fs.writeFileSync('public/apple-touch-icon.jpg', png180);

fs.writeFileSync('public/favicon-32x32.png', png32);
fs.writeFileSync('public/favicon.jpg', png64);

// Create valid ICO file from PNG buffer (ICO header + directory entry + PNG payload)
function createIcoFromPng(pngBuf) {
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
  dirEntry.writeUInt32LE(pngBuf.length, 8); // Image size in bytes
  dirEntry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

  return Buffer.concat([icoHeader, dirEntry, pngBuf]);
}

const icoBuf = createIcoFromPng(png32);
fs.writeFileSync('public/favicon.ico', icoBuf);

console.log('Icon generation completed successfully!');
