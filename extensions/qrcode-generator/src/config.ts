export type QRColor = string;

export const DEFAULT_COLOR = "#000000";

/** Curated, high-contrast presets shown in the color dropdown. */
export const COLOR_PRESETS: { title: string; value: string }[] = [
  { title: "Black", value: "#000000" },
  { title: "Blue", value: "#0A66C2" },
  { title: "Green", value: "#1D8348" },
  { title: "Red", value: "#C0392B" },
  { title: "Purple", value: "#6C3483" },
  { title: "Orange", value: "#D35400" },
];

/** Sentinel value used by the dropdown to reveal the custom hex field. */
export const CUSTOM_COLOR_VALUE = "custom";

// Accept hex with or without a leading "#", in 3- or 6-digit form.
const HEX_REGEX = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHexColor(value: string | undefined): value is string {
  return typeof value === "string" && HEX_REGEX.test(value.trim());
}

/** Ensure a valid hex value carries a leading "#" so the qrcode library can parse it. */
export function normalizeHexColor(value: string): string {
  return `#${value.trim().replace(/^#/, "")}`;
}

function normalizeHex(hex: string): string {
  const value = hex.trim().replace(/^#/, "");
  if (value.length === 3) {
    return value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return value;
}

/** Relative luminance (0 = black, 1 = white) per WCAG, used for the contrast guardrail. */
export function relativeLuminance(hex: string): number {
  const value = normalizeHex(hex);
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.4 * channels[2];
}

/**
 * A QR code needs a dark foreground against a light background to scan reliably.
 * Warn when the chosen foreground is too light (i.e. too little contrast vs. white).
 */
export function isLowContrast(hex: string): boolean {
  if (!isValidHexColor(hex)) {
    return false;
  }
  return relativeLuminance(hex) > 0.4;
}

/** Options for raster (PNG) QR codes. `preview` adds a white background for on-screen visibility. */
export function buildQrOptions(options: { color?: QRColor; preview?: boolean } = {}) {
  const { color = DEFAULT_COLOR, preview = false } = options;
  return {
    width: 512,
    color: {
      dark: normalizeHexColor(color),
      light: preview ? "#FFFFFF" : "#00000000", // white bg for preview, transparent otherwise
    },
  } as const;
}

/** Options for SVG QR codes (transparent background via `none`). */
export function buildSvgOptions(options: { color?: QRColor } = {}) {
  const { color = DEFAULT_COLOR } = options;
  return {
    width: 1536,
    color: {
      dark: normalizeHexColor(color),
      light: "none",
    },
  } as const;
}
