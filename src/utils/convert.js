export async function convertImage({
  srcURL,
  outWidth,
  outHeight,
  pixelSize,
  paletteLab,
  nearestColor, // (paletteLab, r, g, b) => {r,g,b}
  dither = "floyd", // floyd | atkinson | ordered | none
  adjust = {},
}) {
  if (!srcURL) return null;

  const img = new Image();
  img.src = srcURL;
  await img.decode();

  const w = Math.max(1, outWidth);
  const h = Math.max(1, outHeight);
  const px = Math.max(1, pixelSize);

  const gridW = Math.max(1, Math.floor(w / px));
  const gridH = Math.max(1, Math.floor(h / px));

  // downscale
  const small = document.createElement("canvas");
  small.width = gridW;
  small.height = gridH;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  sctx.clearRect(0, 0, gridW, gridH);
  sctx.imageSmoothingEnabled = true;

  const scale = Math.min(gridW / img.width, gridH / img.height);
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const dx = Math.floor((gridW - dw) / 2);
  const dy = Math.floor((gridH - dh) / 2);
  sctx.drawImage(img, dx, dy, dw, dh);

  const smallData = sctx.getImageData(0, 0, gridW, gridH);
  const data = smallData.data;

  applySharpness(data, gridW, gridH, adjust.sharpness || 0);
  applyAdjustments(data, gridW, gridH, adjust);

  const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  // --- dithering algorithms ---
  function ditherNone() {
    for (let i = 0; i < data.length; i += 4) {
      const q = nearestColor(paletteLab, data[i], data[i + 1], data[i + 2]);
      data[i] = q.r;
      data[i + 1] = q.g;
      data[i + 2] = q.b;
      data[i + 3] = 255;
    }
  }

  function ditherFloydSerpentine() {
    for (let y = 0; y < gridH; y++) {
      const ltr = y % 2 === 0;
      const xStart = ltr ? 0 : gridW - 1;
      const xEnd = ltr ? gridW : -1;
      const step = ltr ? 1 : -1;
      for (let x = xStart; x !== xEnd; x += step) {
        const i = (y * gridW + x) * 4;
        const oldR = data[i],
          oldG = data[i + 1],
          oldB = data[i + 2];
        const q = nearestColor(paletteLab, oldR, oldG, oldB);
        data[i] = q.r;
        data[i + 1] = q.g;
        data[i + 2] = q.b;
        data[i + 3] = 255;
        const errR = oldR - q.r,
          errG = oldG - q.g,
          errB = oldB - q.b;
        const spread = (xx, yy, f) => {
          if (xx < 0 || xx >= gridW || yy < 0 || yy >= gridH) return;
          const j = (yy * gridW + xx) * 4;
          data[j] = clamp8(data[j] + errR * f);
          data[j + 1] = clamp8(data[j + 1] + errG * f);
          data[j + 2] = clamp8(data[j + 2] + errB * f);
        };
        if (ltr) {
          spread(x + 1, y, 7 / 16);
          spread(x - 1, y + 1, 3 / 16);
          spread(x, y + 1, 5 / 16);
          spread(x + 1, y + 1, 1 / 16);
        } else {
          spread(x - 1, y, 7 / 16);
          spread(x + 1, y + 1, 3 / 16);
          spread(x, y + 1, 5 / 16);
          spread(x - 1, y + 1, 1 / 16);
        }
      }
    }
  }

  function ditherAtkinson() {
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const i = (y * gridW + x) * 4;
        const oldR = data[i],
          oldG = data[i + 1],
          oldB = data[i + 2];
        const q = nearestColor(paletteLab, oldR, oldG, oldB);
        data[i] = q.r;
        data[i + 1] = q.g;
        data[i + 2] = q.b;
        data[i + 3] = 255;
        const errR = (oldR - q.r) / 8,
          errG = (oldG - q.g) / 8,
          errB = (oldB - q.b) / 8;
        const spread = (xx, yy) => {
          if (xx < 0 || xx >= gridW || yy < 0 || yy >= gridH) return;
          const j = (yy * gridW + xx) * 4;
          data[j] = clamp8(data[j] + errR);
          data[j + 1] = clamp8(data[j + 1] + errG);
          data[j + 2] = clamp8(data[j + 2] + errB);
        };
        spread(x + 1, y);
        spread(x + 2, y);
        spread(x - 1, y + 1);
        spread(x, y + 1);
        spread(x + 1, y + 1);
        spread(x, y + 2);
      }
    }
  }

  const BAYER8 = [
    [0, 48, 12, 60, 3, 51, 15, 63],
    [32, 16, 44, 28, 35, 19, 47, 31],
    [8, 56, 4, 52, 11, 59, 7, 55],
    [40, 24, 36, 20, 43, 27, 39, 23],
    [2, 50, 14, 62, 1, 49, 13, 61],
    [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58, 6, 54, 9, 57, 5, 53],
    [42, 26, 38, 22, 41, 25, 37, 21],
  ];
  function ditherOrdered() {
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const i = (y * gridW + x) * 4;
        const threshold = (BAYER8[y % 8][x % 8] / 64 - 0.5) * 32;
        const r = data[i] + threshold,
          g = data[i + 1] + threshold,
          b = data[i + 2] + threshold;
        const q = nearestColor(paletteLab, r, g, b);
        data[i] = q.r;
        data[i + 1] = q.g;
        data[i + 2] = q.b;
        data[i + 3] = 255;
      }
    }
  }

  // --- NEW: Bayer (ordered) variants ---

  const BAYER4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ]; // values 0..15 (divide by 16)

  function ditherBayer(matrix) {
    const denom = matrix.length === 4 ? 16 : 64;
    // tweakable “strength”: same feel as your previous ordered (≈32)
    const amplitude = 32;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const i = (y * gridW + x) * 4;
        const t =
          (matrix[y % matrix.length][x % matrix.length] / denom - 0.5) *
          (amplitude * 2);
        const r = data[i] + t,
          g = data[i + 1] + t,
          b = data[i + 2] + t;
        const q = nearestColor(paletteLab, r, g, b);
        data[i] = q.r;
        data[i + 1] = q.g;
        data[i + 2] = q.b;
        data[i + 3] = 255;
      }
    }
  }

  // --- NEW: Jarvis–Judice–Ninke (JJN), serpentine ---

  function ditherJarvisSerpentine() {
    // kernel weights /48, applied ahead in scan direction and two rows below
    const kernel = [
      { dx: 1, dy: 0, w: 7 / 48 },
      { dx: 2, dy: 0, w: 5 / 48 },
      { dx: -2, dy: 1, w: 3 / 48 },
      { dx: -1, dy: 1, w: 5 / 48 },
      { dx: 0, dy: 1, w: 7 / 48 },
      { dx: 1, dy: 1, w: 5 / 48 },
      { dx: 2, dy: 1, w: 3 / 48 },
      { dx: -2, dy: 2, w: 1 / 48 },
      { dx: -1, dy: 2, w: 3 / 48 },
      { dx: 0, dy: 2, w: 5 / 48 },
      { dx: 1, dy: 2, w: 3 / 48 },
      { dx: 2, dy: 2, w: 1 / 48 },
    ];

    for (let y = 0; y < gridH; y++) {
      const ltr = y % 2 === 0;
      const xStart = ltr ? 0 : gridW - 1;
      const xEnd = ltr ? gridW : -1;
      const step = ltr ? 1 : -1;

      for (let x = xStart; x !== xEnd; x += step) {
        const i = (y * gridW + x) * 4;
        const oldR = data[i],
          oldG = data[i + 1],
          oldB = data[i + 2];

        const q = nearestColor(paletteLab, oldR, oldG, oldB);
        data[i] = q.r;
        data[i + 1] = q.g;
        data[i + 2] = q.b;
        data[i + 3] = 255;

        const errR = oldR - q.r,
          errG = oldG - q.g,
          errB = oldB - q.b;

        for (const { dx, dy, w } of kernel) {
          const kdx = ltr ? dx : -dx; // mirror kernel on RTL rows
          const xx = x + kdx;
          const yy = y + dy;
          if (xx < 0 || xx >= gridW || yy < 0 || yy >= gridH) continue;
          const j = (yy * gridW + xx) * 4;
          data[j] = clamp8(data[j] + errR * w);
          data[j + 1] = clamp8(data[j + 1] + errG * w);
          data[j + 2] = clamp8(data[j + 2] + errB * w);
        }
      }
    }
  }

  // pick mode
  if (dither === "none") ditherNone();
  else if (dither === "atkinson") ditherAtkinson();
  else if (dither === "ordered") ditherBayer(BAYER8); // keep old behavior
  else if (dither === "bayer4") ditherBayer(BAYER4);
  else if (dither === "bayer8" || dither === "bayer") ditherBayer(BAYER8);
  else if (dither === "jarvis") ditherJarvisSerpentine();
  else ditherFloydSerpentine();

  sctx.putImageData(smallData, 0, 0);

  // upscale
  const large = document.createElement("canvas");
  large.width = w;
  large.height = h;
  const lctx = large.getContext("2d");
  lctx.imageSmoothingEnabled = false;
  lctx.drawImage(small, 0, 0, w, h);

  const blob = await new Promise((res) => large.toBlob(res, "image/png"));
  return URL.createObjectURL(blob);
}
// utils/convert.js
// Add lightweight adjustment helpers
const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

function blur3x3(src, w, h) {
  const out = new Uint8ClampedArray(src.length);
  const idx = (x, y) => (y * w + x) << 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        c = 0;
      for (let yy = y - 1; yy <= y + 1; yy++)
        for (let xx = x - 1; xx <= x + 1; xx++) {
          if (xx >= 0 && xx < w && yy >= 0 && yy < h) {
            const i = idx(xx, yy);
            r += src[i];
            g += src[i + 1];
            b += src[i + 2];
            a += src[i + 3];
            c++;
          }
        }
      const o = idx(x, y);
      out[o] = r / c;
      out[o + 1] = g / c;
      out[o + 2] = b / c;
      out[o + 3] = a / c;
    }
  return out;
}
function applySharpness(data, w, h, amountPct = 0) {
  if (!amountPct) return;
  const blurred = blur3x3(data, w, h);
  const amt = amountPct / 100;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(data[i] + (data[i] - blurred[i]) * amt);
    data[i + 1] = clamp8(data[i + 1] + (data[i + 1] - blurred[i + 1]) * amt);
    data[i + 2] = clamp8(data[i + 2] + (data[i + 2] - blurred[i + 2]) * amt);
  }
}
function applyAdjustments(
  data,
  w,
  h,
  { brightness = 0, contrast = 0, gamma = 1, saturation = 1 } = {}
) {
  const bOff = Math.round(((brightness || 0) * 255) / 100); // -100..100 → px offset
  const c = contrast || 0;
  const cFactor = (259 * (c + 255)) / (255 * (259 - c || 1)); // classic contrast
  const invGamma = 1 / Math.max(0.1, gamma || 1);
  const sat = Math.max(0, saturation || 1);
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i],
      g = data[i + 1],
      b = data[i + 2];

    // brightness + contrast
    r = clamp8(cFactor * (r - 128) + 128 + bOff);
    g = clamp8(cFactor * (g - 128) + 128 + bOff);
    b = clamp8(cFactor * (b - 128) + 128 + bOff);

    // gamma
    r = clamp8(255 * Math.pow(r / 255, invGamma));
    g = clamp8(255 * Math.pow(g / 255, invGamma));
    b = clamp8(255 * Math.pow(b / 255, invGamma));

    // saturation (luma mix, sRGB weights)
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = clamp8(l + (r - l) * sat);
    g = clamp8(l + (g - l) * sat);
    b = clamp8(l + (b - l) * sat);

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}
