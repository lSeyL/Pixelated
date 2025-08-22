import { hexToRgb, rgbToLab, deltaE76, ciede2000 } from "./color";

/** Precompute Lab for a palette of hex colors */
export function buildPaletteLab(paletteHexList) {
  return paletteHexList.map((hex) => {
    const rgb = hexToRgb(hex);
    return { hex, rgb, lab: rgbToLab(rgb) };
  });
}

/** Nearest color with selectable metric (default ΔE76) */
export function nearestColor(paletteLabArr, r, g, b, metric = "deltaE76") {
  const lab = rgbToLab({ r, g, b });
  let best = paletteLabArr[0];
  let bestD = Infinity;

  for (const p of paletteLabArr) {
    const d =
      metric === "ciede2000" ? ciede2000(lab, p.lab) : deltaE76(lab, p.lab); // default
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.rgb; // { r, g, b }
}
