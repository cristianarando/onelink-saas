/**
 * Theme Contrast and Accessibility Utilities
 * Guarantees WCAG AA / AAA contrast for badges, text, and special cards across all themes.
 */

export function isLightColor(colorStr?: string | null): boolean {
  if (!colorStr) return false;
  const c = colorStr.trim().toLowerCase();

  // Image backgrounds render behind a dark scrim overlay for guaranteed legibility
  if (c.startsWith("http://") || c.startsWith("https://") || c.startsWith("url(")) {
    return false;
  }

  // Common named / hex values
  if (
    c === "white" ||
    c === "#fff" ||
    c === "#ffffff" ||
    c === "#f8fafc" ||
    c === "#faf8f5" ||
    c === "#fafafa" ||
    c === "#f4f4f5" ||
    c === "#f1f5f9" ||
    c === "#f2f5ef" ||
    c === "#fef08a" ||
    c === "#e2e8f0" ||
    c === "#e5e7eb"
  ) {
    return true;
  }

  // Handle CSS gradients
  if (c.includes("gradient")) {
    // If gradient contains known dark tones, it is dark
    if (
      c.includes("#090") ||
      c.includes("#180") ||
      c.includes("#022") ||
      c.includes("#0f1") ||
      c.includes("#000") ||
      c.includes("#111") ||
      c.includes("#1f1") ||
      c.includes("#222") ||
      c.includes("#333") ||
      c.includes("#064") ||
      c.includes("#0c0") ||
      c.includes("#2e0")
    ) {
      return false;
    }
    // Check if it's explicitly light pastels
    if (c.includes("#fff") || c.includes("#faf") || c.includes("#f8f") || c.includes("#f4f")) {
      return true;
    }
    return false;
  }

  // Parse HEX (#RGB, #RRGGBB)
  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      // Standard perceived luminance
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum > 0.52;
    }
  }

  // Parse RGB / RGBA
  if (c.startsWith("rgb")) {
    const parts = c.match(/\d+(\.\d+)?/g);
    if (parts && parts.length >= 3) {
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
      if (a < 0.3) return false;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum > 0.52;
    }
  }

  return false;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColorToRgb(colorStr?: string | null): RgbColor | null {
  if (!colorStr) return null;
  const c = colorStr.trim().toLowerCase();

  if (c === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (c === "black") return { r: 0, g: 0, b: 0, a: 1 };

  if (c.startsWith("http://") || c.startsWith("https://") || c.startsWith("url(")) {
    // Dark scrim background baseline
    return { r: 18, g: 18, b: 24, a: 1 };
  }

  if (c.includes("gradient")) {
    const hexMatch = c.match(/#[0-9a-f]{3,6}/i);
    if (hexMatch) return parseColorToRgb(hexMatch[0]);
    return isLightColor(c) ? { r: 245, g: 245, b: 245, a: 1 } : { r: 15, g: 23, b: 42, a: 1 };
  }

  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return { r, g, b, a: 1 };
      }
    }
  }

  if (c.startsWith("rgb")) {
    const parts = c.match(/\d+(\.\d+)?/g);
    if (parts && parts.length >= 3) {
      return {
        r: Math.min(255, Math.max(0, parseFloat(parts[0]))),
        g: Math.min(255, Math.max(0, parseFloat(parts[1]))),
        b: Math.min(255, Math.max(0, parseFloat(parts[2]))),
        a: parts[3] !== undefined ? Math.min(1, Math.max(0, parseFloat(parts[3]))) : 1,
      };
    }
  }

  return null;
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const transform = (v: number) => {
    const srgb = v / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(rgb.r) + 0.7152 * transform(rgb.g) + 0.0722 * transform(rgb.b);
}

/**
 * Computes WCAG 2.1 contrast ratio between foreground and background colors (1.0 - 21.0).
 */
export function getContrastRatio(
  fg?: string | null,
  bg?: string | null,
  backdrop?: string | null
): number {
  const fgRgb = parseColorToRgb(fg) || { r: 255, g: 255, b: 255, a: 1 };
  const rawBgRgb = parseColorToRgb(bg) || { r: 9, g: 9, b: 11, a: 1 };
  const baseRgb = parseColorToRgb(backdrop) || { r: 9, g: 9, b: 11, a: 1 };

  // Alpha composite translucent surfaces (e.g. Frosted Glass) over backdrop
  const effectiveBg =
    rawBgRgb.a < 1
      ? {
          r: rawBgRgb.r * rawBgRgb.a + baseRgb.r * (1 - rawBgRgb.a),
          g: rawBgRgb.g * rawBgRgb.a + baseRgb.g * (1 - rawBgRgb.a),
          b: rawBgRgb.b * rawBgRgb.a + baseRgb.b * (1 - rawBgRgb.a),
        }
      : rawBgRgb;

  const l1 = relativeLuminance(fgRgb);
  const l2 = relativeLuminance(effectiveBg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function getWcagBadge(ratio: number): {
  label: "AAA" | "AA" | "Low Contrast";
  ratioText: string;
  pass: boolean;
} {
  const ratioText = `${ratio.toFixed(1)}:1`;
  if (ratio >= 7) {
    return { label: "AAA", ratioText, pass: true };
  }
  if (ratio >= 4.5) {
    return { label: "AA", ratioText, pass: true };
  }
  return { label: "Low Contrast", ratioText, pass: false };
}

export function suggestAccessibleTextColor(
  bgColor?: string | null,
  backdrop?: string | null
): "#ffffff" | "#09090b" {
  const whiteRatio = getContrastRatio("#ffffff", bgColor, backdrop);
  const darkRatio = getContrastRatio("#09090b", bgColor, backdrop);
  return whiteRatio >= darkRatio ? "#ffffff" : "#09090b";
}

/**
 * Resolves a creator's selected theme typeface to the loaded Next.js font CSS variable stack.
 */
export function resolveThemeFontFamily(fontFamily?: string | null): string {
  switch ((fontFamily || "Geist").trim()) {
    case "Space Grotesk":
      return "var(--font-space-grotesk), sans-serif";
    case "Inter":
      return "var(--font-inter), sans-serif";
    case "Plus Jakarta Sans":
      return "var(--font-jakarta), sans-serif";
    case "JetBrains Mono":
      return "var(--font-jetbrains-mono), monospace";
    case "Merriweather":
    case "Serif":
      return "var(--font-merriweather), Georgia, serif";
    case "Outfit":
      return "var(--font-outfit), sans-serif";
    case "Playfair Display":
      return "var(--font-playfair), Georgia, serif";
    case "DM Sans":
      return "var(--font-dm-sans), sans-serif";
    case "Fira Code":
      return "var(--font-fira-code), monospace";
    case "Geist":
    default:
      return "var(--font-geist-sans), sans-serif";
  }
}
