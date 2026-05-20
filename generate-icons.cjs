const fs = require('fs');
const path = require('path');

// Generate a simple colored PNG with valid RGBA data
function generatePNG(width, height, r, g, b) {
  const pixels = width * height;
  const pixelData = Buffer.alloc(pixels * 4);

  for (let i = 0; i < pixels; i++) {
    pixelData[i * 4] = r;     // R
    pixelData[i * 4 + 1] = g; // G
    pixelData[i * 4 + 2] = b; // B
    pixelData[i * 4 + 3] = 255; // A (fully opaque)
  }

  // PNG file structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk (image data) - simplified, uncompressed
  const zlib = require('zlib');
  const scanlineSize = width * 4 + 1; // +1 for filter byte
  const rawData = Buffer.alloc(height * scanlineSize);

  for (let y = 0; y < height; y++) {
    rawData[y * scanlineSize] = 0; // filter type: none
    pixelData.copy(rawData, y * scanlineSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = calculateCRC(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function calculateCRC(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const iconsDir = path.join(__dirname, 'src-tauri', 'icons');

// Generate icons with a blue color (representing Git)
const icons = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 }
];

icons.forEach(({ name, size }) => {
  const png = generatePNG(size, size, 41, 128, 185); // Blue color
  fs.writeFileSync(path.join(iconsDir, name), png);
  console.log(`Generated ${name} (${size}x${size})`);
});

console.log('All icons generated successfully!');
