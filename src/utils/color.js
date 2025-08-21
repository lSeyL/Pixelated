// hex <-> rgb, sRGB -> Lab, ΔE76 (all in JS)

export function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const v = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r, g, b) {
  const to = (x) => x.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function srgbToLinear(c) {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function rgbToXyz({ r, g, b }) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  return {
    x: 0.4124 * R + 0.3576 * G + 0.1805 * B,
    y: 0.2126 * R + 0.7152 * G + 0.0722 * B,
    z: 0.0193 * R + 0.1192 * G + 0.9505 * B,
  };
}

export function rgbToLab(rgb) {
  const { x, y, z } = rgbToXyz(rgb);
  const xr = x / 0.95047, yr = y / 1.0, zr = z / 1.08883; // D65
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(xr), fy = f(yr), fz = f(zr);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function deltaE76(a, b) {
  const dL = a.L - b.L, da = a.a - b.a, db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// --- CIEDE2000 (compact JS) ---
export function ciede2000(lab1, lab2) {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;
  const avgLp = (L1 + L2) / 2;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const avgC = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt((avgC ** 7) / ((avgC ** 7) + (25 ** 7))));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const avgCp = (C1p + C2p) / 2;
  const h1p = (Math.atan2(b1, a1p) * 180 / Math.PI + 360) % 360;
  const h2p = (Math.atan2(b2, a2p) * 180 / Math.PI + 360) % 360;
  let dHp = h2p - h1p; if (dHp > 180) dHp -= 360; if (dHp < -180) dHp += 360;
  const dLp = L2 - L1, dCp = C2p - C1p;
  const dHpTerm = 2 * Math.sqrt(C1p * C2p) * Math.sin((dHp * Math.PI / 180) / 2);
  let avgHp = h1p + h2p; if (Math.abs(h1p - h2p) > 180) avgHp += 360; avgHp /= 2;
  const T = 1
    - 0.17 * Math.cos((avgHp - 30) * Math.PI / 180)
    + 0.24 * Math.cos((2 * avgHp) * Math.PI / 180)
    + 0.32 * Math.cos((3 * avgHp + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * avgHp - 63) * Math.PI / 180);
  const Sl = 1 + (0.015 * ((avgLp - 50) ** 2)) / Math.sqrt(20 + ((avgLp - 50) ** 2));
  const Sc = 1 + 0.045 * avgCp;
  const Sh = 1 + 0.015 * avgCp * T;
  const Rt = -2 * Math.sqrt((avgCp ** 7) / ((avgCp ** 7) + (25 ** 7)))
    * Math.sin((60 * Math.exp(-(((avgHp - 275) / 25) ** 2))) * Math.PI / 180);
  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHpTerm / Sh) ** 2 + Rt * (dCp / Sc) * (dHpTerm / Sh)
  );
}
