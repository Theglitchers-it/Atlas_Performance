/**
 * Generate PWA icon PNGs - minimal valid PNGs with PT branding
 * Run: node scripts/generate-icons.js
 *
 * Creates simple solid-color PNG icons as placeholders.
 * Replace with designed icons for production.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.resolve(__dirname, '../public/icons');

// Brand color: #3B82F6 (blue-500)
const R = 59, G = 130, B = 246;

function createPNG(size) {
    // Create raw RGBA pixel data - solid color
    const channels = 4; // RGBA
    const rawData = Buffer.alloc(size * size * channels);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * channels;

            // Simple "PT" text area in center (white on blue)
            const cx = size / 2;
            const cy = size / 2;
            const textSize = size * 0.3;
            const inCenter = Math.abs(x - cx) < textSize && Math.abs(y - cy) < textSize * 0.6;

            if (inCenter) {
                // White text area
                rawData[idx] = 255;     // R
                rawData[idx + 1] = 255; // G
                rawData[idx + 2] = 255; // B
                rawData[idx + 3] = 255; // A
            } else {
                // Brand blue background
                rawData[idx] = R;
                rawData[idx + 1] = G;
                rawData[idx + 2] = B;
                rawData[idx + 3] = 255;
            }
        }
    }

    // PNG filter: prepend filter byte (0 = None) to each row
    const filteredData = Buffer.alloc(size * (size * channels + 1));
    for (let y = 0; y < size; y++) {
        filteredData[y * (size * channels + 1)] = 0; // filter byte
        rawData.copy(
            filteredData,
            y * (size * channels + 1) + 1,
            y * size * channels,
            (y + 1) * size * channels
        );
    }

    const compressedData = zlib.deflateSync(filteredData);

    // Build PNG file
    const chunks = [];

    // PNG signature
    chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

    // IHDR chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);  // width
    ihdr.writeUInt32BE(size, 4);  // height
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // color type: RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace
    chunks.push(createChunk('IHDR', ihdr));

    // IDAT chunk
    chunks.push(createChunk('IDAT', compressedData));

    // IEND chunk
    chunks.push(createChunk('IEND', Buffer.alloc(0)));

    return Buffer.concat(chunks);
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBuffer, data]);

    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);

    return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

for (const size of SIZES) {
    const png = createPNG(size);
    const filename = `icon-${size}x${size}.png`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), png);
    console.log(`Created ${filename} (${png.length} bytes)`);
}

// Also create apple-touch-icon (180x180) and favicon (32x32)
const appleTouchIcon = createPNG(180);
fs.writeFileSync(path.resolve(OUTPUT_DIR, '../apple-touch-icon.png'), appleTouchIcon);
console.log(`Created apple-touch-icon.png (${appleTouchIcon.length} bytes)`);

const favicon = createPNG(32);
fs.writeFileSync(path.resolve(OUTPUT_DIR, '../favicon.ico'), favicon);
console.log(`Created favicon.ico (${favicon.length} bytes)`);

console.log('\nDone! Replace these placeholders with designed icons for production.');
