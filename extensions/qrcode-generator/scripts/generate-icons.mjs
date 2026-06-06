// One-off generator for the three distinct command icons, built from Lucide glyphs (ISC licensed).
// Run with: npm install --no-save sharp lucide-static && node scripts/generate-icons.mjs
// Produces 512x512 PNGs in ../assets.
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(here, "..", "assets");
const lucideDir = join(here, "..", "node_modules", "lucide-static", "icons");

const BG = "#16181D"; // shared dark background → consistent family
const FG = "#FFFFFF"; // glyph stroke

// Each command gets a distinct, simple Lucide glyph.
const icons = {
  "generate-icon.png": "qr-code",
  "clipboard-icon.png": "clipboard-copy",
  "selection-icon.png": "text-cursor",
};

// Pull the inner shapes out of a Lucide SVG (attributes never contain ">", so the first ">" closes the tag).
function lucideInner(name) {
  const svg = readFileSync(join(lucideDir, `${name}.svg`), "utf-8");
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, "").trim();
}

const GLYPH = 300; // glyph size within the 512 canvas
const scale = GLYPH / 24; // Lucide icons use a 24x24 viewBox
const offset = (512 - GLYPH) / 2;

for (const [file, name] of Object.entries(icons)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="112" fill="${BG}"/>
    <g transform="translate(${offset} ${offset}) scale(${scale})"
       fill="none" stroke="${FG}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      ${lucideInner(name)}
    </g>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(assetsDir, file));
  console.log("wrote", file, "from lucide:", name);
}
