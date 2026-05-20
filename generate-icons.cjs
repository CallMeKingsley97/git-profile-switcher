/**
 * Generate a 1024x1024 source PNG using SDF-based anti-aliased drawing,
 * then run `tauri icon` to produce all platform icons (.png/.icns/.ico).
 *
 * Design:
 *   - Indigo→violet gradient rounded-square background
 *   - Stylized Git branch graph: a main line + a merging branch
 *   - Three commit nodes in distinct colors (identities)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const SIZE = 1024;

// ----- color helpers -----
const hex = (s) => {
  const n = parseInt(s.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// ----- SDF primitives (operate on point relative to center where appropriate) -----
const sdRoundRect = (px, py, cx, cy, hw, hh, r) => {
  const dx = Math.abs(px - cx) - (hw - r);
  const dy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(dx, 0), ay = Math.max(dy, 0);
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(dx, dy), 0) - r;
};
const sdCircle = (px, py, cx, cy, r) => Math.hypot(px - cx, py - cy) - r;
const sdCapsule = (px, py, ax, ay, bx, by, r) => {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const h = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
};

// ----- composite a source color over destination with anti-aliased coverage -----
const overSDF = (pixel, sdf, color) => {
  const cov = clamp01(0.5 - sdf);
  if (cov <= 0) return;
  const [r, g, b] = color;
  const a = cov;
  pixel[0] = mix(pixel[0], r, a);
  pixel[1] = mix(pixel[1], g, a);
  pixel[2] = mix(pixel[2], b, a);
  pixel[3] = Math.max(pixel[3], a * 255);
};

function render(size) {
  const buf = Buffer.alloc(size * size * 4);

  // Palette
  const gradTop = hex('#6366F1'); // indigo-500
  const gradBot = hex('#A855F7'); // violet-500
  const white = [255, 255, 255];
  const nodeA = hex('#F472B6'); // pink
  const nodeB = hex('#FB923C'); // orange
  const nodeC = hex('#34D399'); // emerald

  // Geometry (normalized to 1024 then scaled)
  const k = size / 1024;
  const cx = size / 2, cy = size / 2;
  const bgHalf = size / 2 - 8 * k;
  const bgRadius = 230 * k;

  const lineW = 56 * k; // capsule "radius" is half of line width
  const lineR = lineW / 2;
  const nodeR = 78 * k;
  const innerR = 36 * k;

  const ax = 360 * k, ay = 280 * k;          // top-left node
  const bx = 664 * k, by = 280 * k;          // top-right node
  const mx = 360 * k, my = 744 * k;          // bottom (merge) node
  const jx = 360 * k, jy = 560 * k;          // junction on main line
  const elbowR = 120 * k;                    // bend radius for branch

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const pixel = [0, 0, 0, 0];

      // Background rounded square with diagonal gradient
      const bg = sdRoundRect(x, y, cx, cy, bgHalf, bgHalf, bgRadius);
      if (bg < 0.5) {
        const t = clamp01((x + y) / (size * 2));
        const bgColor = [
          mix(gradTop[0], gradBot[0], t),
          mix(gradTop[1], gradBot[1], t),
          mix(gradTop[2], gradBot[2], t),
        ];
        overSDF(pixel, bg, bgColor);
      }

      // Branch lines (white)
      // Main vertical line: a -> m
      const sMain = sdCapsule(x, y, ax, ay, mx, my, lineR);
      overSDF(pixel, sMain, white);

      // Branch: from b straight down to elbow, arc, then merge into main at jy
      // Segment 1: vertical at bx from by to (jy - elbowR)
      const s1 = sdCapsule(x, y, bx, by, bx, jy - elbowR, lineR);
      overSDF(pixel, s1, white);
      // Segment 2: horizontal from (ax + elbowR) to bx at (jy - elbowR)
      // (we draw it after arc for clean overlap)
      // Arc as a partial annulus near (bx - elbowR, jy - elbowR), radius elbowR
      const arcCx = bx - elbowR, arcCy = jy - elbowR;
      const dxA = x - arcCx, dyA = y - arcCy;
      const distArc = Math.abs(Math.hypot(dxA, dyA) - elbowR) - lineR;
      // Restrict arc to lower-right quadrant relative to its center
      const inArcQuadrant = dxA >= -1 && dyA >= -1;
      if (inArcQuadrant) overSDF(pixel, distArc, white);
      // Segment 3: horizontal from arcCx to ax + elbowR? Actually arc already
      // connects bx down to jy via 90° turn. Now connect arc end to junction:
      const s3 = sdCapsule(x, y, arcCx, jy, ax + elbowR, jy, lineR);
      overSDF(pixel, s3, white);
      // Arc 2: bend from horizontal into vertical at main line
      const arc2Cx = ax + elbowR, arc2Cy = jy - elbowR;
      const dxB = x - arc2Cx, dyB = y - arc2Cy;
      const distArc2 = Math.abs(Math.hypot(dxB, dyB) - elbowR) - lineR;
      const inArc2Quadrant = dxB <= 1 && dyB >= -1;
      if (inArc2Quadrant) overSDF(pixel, distArc2, white);

      // Nodes: white outer ring + colored inner dot
      const drawNode = (nx, ny, color) => {
        const outer = sdCircle(x, y, nx, ny, nodeR);
        overSDF(pixel, outer, white);
        const inner = sdCircle(x, y, nx, ny, innerR);
        overSDF(pixel, inner, color);
      };
      drawNode(ax, ay, nodeA);
      drawNode(bx, by, nodeB);
      drawNode(mx, my, nodeC);

      buf[idx] = Math.round(pixel[0]);
      buf[idx + 1] = Math.round(pixel[1]);
      buf[idx + 2] = Math.round(pixel[2]);
      buf[idx + 3] = Math.round(pixel[3]);
    }
  }
  return buf;
}

// ----- PNG encoding -----
function encodePNG(rgba, width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const scan = width * 4 + 1;
  const raw = Buffer.alloc(height * scan);
  for (let y = 0; y < height; y++) {
    raw[y * scan] = 0;
    rgba.copy(raw, y * scan + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ----- main -----
const sourcePath = path.join(__dirname, 'src-tauri', 'icons', 'source.png');
console.log(`Rendering ${SIZE}x${SIZE} source icon…`);
const rgba = render(SIZE);
fs.writeFileSync(sourcePath, encodePNG(rgba, SIZE, SIZE));
console.log(`Wrote ${sourcePath}`);

console.log('Running `tauri icon` to generate platform icons…');
execSync(`npx --yes @tauri-apps/cli icon "${sourcePath}"`, {
  stdio: 'inherit',
  cwd: __dirname,
});
console.log('Done.');
