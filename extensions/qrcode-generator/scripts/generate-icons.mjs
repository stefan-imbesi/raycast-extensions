// One-off generator for the three distinct command icons.
// Run with: npm install --no-save sharp && node scripts/generate-icons.mjs
// Produces 512x512 PNGs in ../assets. Refine the art later as desired.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

const BG = "#111827"; // shared dark background → consistent family (Aesthetic-Usability)
const FG = "#FFFFFF"; // QR glyph

// A simple, recognizable QR glyph: three finder patterns + a few data modules.
function finder(x, y, size) {
  const t = size / 6;
  return `
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${t / 2}" fill="${FG}"/>
    <rect x="${x + t}" y="${y + t}" width="${size - 2 * t}" height="${size - 2 * t}" rx="${t / 3}" fill="${BG}"/>
    <rect x="${x + 2 * t}" y="${y + 2 * t}" width="${size - 4 * t}" height="${size - 4 * t}" rx="${t / 4}" fill="${FG}"/>`;
}

function dataModules() {
  const m = 24;
  const cells = [
    [3, 3],
    [5, 3],
    [3, 5],
    [4, 6],
    [6, 4],
    [6, 6],
    [5, 7],
    [7, 5],
  ];
  const ox = 168;
  const oy = 168;
  return cells.map(([cx, cy]) => `<rect x="${ox + cx * m}" y="${oy + cy * m}" width="${m - 6}" height="${m - 6}" rx="3" fill="${FG}"/>`).join("\n");
}

const qrGlyph = `
  ${finder(96, 96, 110)}
  ${finder(306, 96, 110)}
  ${finder(96, 306, 110)}
  ${dataModules()}`;

function badgeCircle(color, inner) {
  return `
    <circle cx="392" cy="392" r="92" fill="${BG}"/>
    <circle cx="392" cy="392" r="76" fill="${color}"/>
    ${inner}`;
}

const clipboardBadge = badgeCircle(
  "#0A66C2",
  `<rect x="360" y="352" width="64" height="80" rx="10" fill="#FFFFFF"/>
   <rect x="376" y="344" width="32" height="20" rx="6" fill="#FFFFFF"/>
   <rect x="376" y="380" width="32" height="8" rx="4" fill="#0A66C2"/>
   <rect x="376" y="398" width="32" height="8" rx="4" fill="#0A66C2"/>`,
);

const selectionBadge = badgeCircle(
  "#1D8348",
  `<rect x="386" y="352" width="12" height="80" rx="4" fill="#FFFFFF"/>
   <rect x="368" y="352" width="48" height="12" rx="4" fill="#FFFFFF"/>
   <rect x="368" y="420" width="48" height="12" rx="4" fill="#FFFFFF"/>`,
);

const icons = {
  "generate-icon.png": qrGlyph,
  "clipboard-icon.png": qrGlyph + clipboardBadge,
  "selection-icon.png": qrGlyph + selectionBadge,
};

for (const [name, content] of Object.entries(icons)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="112" fill="${BG}"/>
    ${content}
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(assetsDir, name));
  console.log("wrote", name);
}
