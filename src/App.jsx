import { useMemo, useRef, useState } from "react";
import {
  deltaE76,
  ciede2000,
  hexToRgb,
  rgbToHex,
  rgbToLab,
} from "./utils/color";
import ImageContainer from "./components/ImageContainer";
function parsePalette(input) {
  return input
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));
}

function nearest(paletteLabArr, r, g, b) {
  const lab = rgbToLab({ r, g, b });
  let best = paletteLabArr[0],
    bestD = Infinity;
  for (const p of paletteLabArr) {
    const d = deltaE76(lab, p.lab);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.rgb;
}

const PRESETS = {
  "WPlace Greyscale": [
    "000000",
    "3c3c3c",
    "787878",
    "aaaaaa",
    "d2d2d2",
    "ffffff",
  ],
  "WPlace (Full 63)": [
    "#000000",
    "#3c3c3c",
    "#787878",
    "#aaaaaa",
    "#d2d2d2",
    "#ffffff",
    "#600018",
    "#a50e1e",
    "#ed1c24",
    "#fa8072",
    "#e45c1a",
    "#ff7f27",
    "#f6aa09",
    "#f9dd3b",
    "#fffabc",
    "#9c8431",
    "#c5ad31",
    "#e8d45f",
    "#4a6b3a",
    "#5a944a",
    "#84c573",
    "#0eb968",
    "#13e67b",
    "#87ff5e",
    "#0c816e",
    "#10aea6",
    "#13e1be",
    "#0f799f",
    "#60f7f2",
    "#bbfaf2",
    "#28509e",
    "#4093e4",
    "#7dc7ff",
    "#4d31b8",
    "#6b50f6",
    "#99b1fb",
    "#4a4284",
    "#7a71c4",
    "#b5aef1",
    "#780c99",
    "#aa38b9",
    "#e09ff9",
    "#cb007a",
    "#ec1f80",
    "#f38da9",
    "#9b5249",
    "#d18078",
    "#fab6a4",
    "#684634",
    "#95682a",
    "#dba463",
    "#7b6352",
    "#9c846b",
    "#d6b594",
    "#d18051",
    "#f8b277",
    "#ffc5a5",
    "#6d643f",
    "#948c6b",
    "#cdc59e",
    "#333941",
    "#6d758d",
    "#b3b9d1",
  ],
  "WPlace (Free)": [
    "#000000",
    "#3c3c3c",
    "#787878",
    "#d2d2d2",
    "#ffffff",
    "#600018",
    "#ed1c24",
    "#ff7f27",
    "#f6aa09",
    "#f9dd3b",
    "#fffabc",
    "#0eb968",
    "#13e67b",
    "#87ff5e",
    "#0c816e",
    "#10aea6",
    "#13e1be",
    "#60f7f2",
    "#28509e",
    "#4093e4",
    "#6b50f6",
    "#99b1fb",
    "#780c99",
    "#aa38b9",
    "#e09ff9",
    "#cb007a",
    "#ec1f80",
    "#f38da9",
    "#684634",
    "#95682a",
    "#f8b277",
  ],
};

export default function App() {
  const fileRef = useRef(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [resultURL, setResultURL] = useState(null);

  const [pixelSize, setPixelSize] = useState(2); // block size in px
  const [outWidth, setOutWidth] = useState(256);
  const [outHeight, setOutHeight] = useState(256);
  const [imgSize, setImgSize] = useState(null); // {w,h}
  const [lockAR, setLockAR] = useState(true);
  const [paletteText, setPaletteText] = useState(
    PRESETS["WPlace Greyscale"].join(",")
  );
  const w = Number(outWidth) || 0;
  const h = Number(outHeight) || 0;
  const pxSize = Number(pixelSize) || 1;

  const totalRawPx = w * h; // canvas pixels
  const blockW = Math.max(1, Math.round(w / pxSize));
  const blockH = Math.max(1, Math.round(h / pxSize));
  const totalBlocks = blockW * blockH;

  const palette = useMemo(() => parsePalette(paletteText), [paletteText]);
  const isPortrait = outHeight && outWidth ? outHeight >= outWidth : false;
  const paletteLab = useMemo(() => {
    return palette.map((hex) => {
      const rgb = hexToRgb(hex);
      return { hex, rgb, lab: rgbToLab(rgb) };
    });
  }, [palette]);
  const fileInputRef = fileRef;

  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files) {
    const f = files?.[0];
    if (!f) return;

    const url = URL.createObjectURL(f);
    setPreviewURL(url);
    setResultURL(null);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImgSize({ w: img.width, h: img.height });
      const aspect = img.width / img.height;
      setOutWidth(Math.round(256 * aspect));
      setOutHeight(256);
    };
  }

  function onFileChange() {
    const f = fileInputRef.current?.files?.[0];
    if (f) handleFiles([f]);
  }

  function onDropZoneClick() {
    fileInputRef.current?.click();
  }

  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }
  function onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }
  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length) handleFiles(files);
  }
  /*
  function onFileChange() {
    const f = fileRef.current?.files?.[0];
    if (!f) return;

    const url = URL.createObjectURL(f);
    setPreviewURL(url);
    setResultURL(null);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImgSize({ w: img.width, h: img.height });
      // default: height 256, width scaled
      const aspect = img.width / img.height;
      const newH = 256;
      const newW = Math.round(newH * aspect);
      setOutWidth(newW);
      setOutHeight(newH);
    };
  }
    */

  function nearest(paletteLabArr, r, g, b) {
    const lab = rgbToLab({ r, g, b });
    let best = paletteLabArr[0];
    let bestD = Infinity;
    for (const p of paletteLabArr) {
      const d = deltaE76(lab, p.lab);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best.rgb;
  }

  async function convert() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const gridW = Math.max(1, Math.floor(outWidth / pixelSize));
    const gridH = Math.max(1, Math.floor(outHeight / pixelSize));

    const small = document.createElement("canvas");
    small.width = gridW;
    small.height = gridH;
    const sctx = small.getContext("2d");
    sctx.imageSmoothingEnabled = true;

    const aspectSrc = img.width / img.height;
    const aspectDst = gridW / gridH;
    let sx = 0,
      sy = 0,
      sw = img.width,
      sh = img.height;
    if (aspectSrc > aspectDst) {
      const targetW = img.height * aspectDst;
      sx = (img.width - targetW) / 2;
      sw = targetW;
    } else {
      const targetH = img.width / aspectDst;
      sy = (img.height - targetH) / 2;
      sh = targetH;
    }

    sctx.drawImage(img, 0, 0, gridW, gridH);

    const smallData = sctx.getImageData(0, 0, gridW, gridH);
    const data = smallData.data; // RGBA

    const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const i = (y * gridW + x) * 4;

        const oldR = data[i],
          oldG = data[i + 1],
          oldB = data[i + 2];
        const { r: nr, g: ng, b: nb } = nearest(paletteLab, oldR, oldG, oldB);

        data[i] = nr;
        data[i + 1] = ng;
        data[i + 2] = nb;
        data[i + 3] = 255;

        const errR = oldR - nr,
          errG = oldG - ng,
          errB = oldB - nb;

        const diffuse = (xx, yy, factor) => {
          if (xx < 0 || xx >= gridW || yy < 0 || yy >= gridH) return;
          const j = (yy * gridW + xx) * 4;
          data[j] = clamp(data[j] + errR * factor);
          data[j + 1] = clamp(data[j + 1] + errG * factor);
          data[j + 2] = clamp(data[j + 2] + errB * factor);
        };

        diffuse(x + 1, y, 7 / 16);
        diffuse(x - 1, y + 1, 3 / 16);
        diffuse(x, y + 1, 5 / 16);
        diffuse(x + 1, y + 1, 1 / 16);
      }
    }

    sctx.putImageData(smallData, 0, 0);

    const large = document.createElement("canvas");
    large.width = outWidth;
    large.height = outHeight;
    const lctx = large.getContext("2d");
    lctx.imageSmoothingEnabled = false;
    lctx.drawImage(small, 0, 0, outWidth, outHeight);

    const blob = await new Promise((res) =>
      large.toBlob((b) => res(b), "image/png")
    );
    const url = URL.createObjectURL(blob);
    setResultURL(url);
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#161618",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          fontSize: 36,
          fontWeight: 600,
          color: "white",
          textAlign: "center",
        }}
      >
        Pixelated
      </h1>

      <div
        style={{
          display: "flex",
          gap: 24,
          maxWidth: "1000px",
          width: "100%",
          margin: "0 auto",
          justifyContent: "center",
        }}
      >
        <ImageContainer>
          <label style={{ fontSize: 12, opacity: 0.8, color: "white" }}>
            Upload Image
          </label>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={onFileChange}
            style={{ display: "none" }}
          />

          <div
            onClick={onDropZoneClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && onDropZoneClick()
            }
            style={{
              marginTop: 12,
              borderRadius: 16,
              padding: 24,
              border: `2px dashed ${isDragging ? "#8b8b8b" : "#3a3a3a"}`,
              background: isDragging
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 120ms, border-color 120ms",
              minHeight: 180,
              outline: "none",
            }}
            title="Click or drag & drop an image"
          >
            {!previewURL ? (
              <div style={{ textAlign: "center", color: "white" }}>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.85, marginBottom: 8 }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div style={{ fontWeight: 600 }}>Upload an image to start</div>
                <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                  Click to choose a file
                </div>
              </div>
            ) : (
              <img
                alt="preview"
                src={previewURL}
                style={{
                  maxWidth: "100%",
                  maxHeight: 300,
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  borderRadius: 12,
                  border: "1px solid #232326",
                }}
              />
            )}
          </div>

          {imgSize && (
            <p
              style={{
                fontSize: 12,
                opacity: 0.7,
                color: "white",
                marginTop: 8,
              }}
            >
              Original: {imgSize.w} × {imgSize.h}px
            </p>
          )}
        </ImageContainer>

        <ImageContainer>
          <div style={{ display: "grid", gap: 8 }}>
            {/* Pixel size */}
            <label style={{ fontSize: 12, opacity: 0.8, color: "white" }}>
              Pixel size
            </label>
            <input
              type="number"
              value={pixelSize}
              onChange={(e) =>
                setPixelSize(Math.max(1, parseInt(e.target.value || "12", 10)))
              }
              style={{
                background: "#1d1d20",
                border: "1px solid #2b2b2f",
                color: "white",
                borderRadius: 8,
                padding: 8,
              }}
            />

            <label style={{ fontSize: 12, opacity: 0.8, color: "white" }}>
              Output Width
            </label>
            <input
              type="number"
              value={outWidth}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setOutWidth(val);
                if (lockAR && imgSize) {
                  const aspect = imgSize.w / imgSize.h;
                  setOutHeight(Math.round(val / aspect));
                }
              }}
            />

            <label style={{ fontSize: 12, opacity: 0.8, color: "white" }}>
              Output Height
            </label>
            <input
              type="number"
              value={outHeight}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setOutHeight(val);
                if (lockAR && imgSize) {
                  const aspect = imgSize.w / imgSize.h;
                  setOutWidth(Math.round(val * aspect));
                }
              }}
            />

            <label style={{ fontSize: 12, color: "white" }}>
              <input
                type="checkbox"
                checked={lockAR}
                onChange={(e) => setLockAR(e.target.checked)}
              />
              Lock aspect ratio
            </label>

            <label style={{ fontSize: 12, opacity: 0.8, color: "white" }}>
              Palette (hex)
            </label>
            <textarea
              value={paletteText}
              onChange={(e) => setPaletteText(e.target.value)}
              rows={4}
              spellCheck={false}
              style={{
                background: "#1d1d20",
                border: "1px solid #2b2b2f",
                color: "white",
                borderRadius: 8,
                padding: 8,
                fontSize: 12,
              }}
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(PRESETS).map(([name, list]) => (
                <button
                  key={name}
                  onClick={() => setPaletteText(list.join(","))}
                  style={{
                    background: "#1d1d20",
                    border: "1px solid #2b2b2f",
                    color: "white",
                    borderRadius: 8,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {name}
                </button>
              ))}
            </div>

            <button
              onClick={convert}
              style={{
                marginTop: 8,
                background: "white",
                color: "black",
                fontWeight: 700,
                borderRadius: 12,
                padding: "10px 14px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Convert
            </button>
          </div>
        </ImageContainer>
      </div>

      {resultURL && (
        <div
          style={{
            marginTop: 24,
            maxWidth: "600px",
            width: "100%",
          }}
        >
          <ImageContainer>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "white",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              Result
            </h2>
            {w > 0 && h > 0 && (
              <p
                style={{
                  textAlign: "center",
                  color: "white",
                  opacity: 0.85,
                  marginTop: 4,
                  marginBottom: 12,
                }}
              >
                Output: {w} × {h}px ({totalRawPx.toLocaleString()} pixels)
                <br />
                Pixel size: {pxSize} → {blockW} × {blockH} blocks (
                {totalBlocks.toLocaleString()} total)
              </p>
            )}

            {/* Big centered preview */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // give the preview area plenty of room
                minHeight: "65vh",
                marginBottom: 16,
              }}
            >
              <img
                alt="result"
                src={resultURL}
                style={
                  isPortrait
                    ? {
                        /* PORTRAIT: fill height, keep AR */
                        height: "80vh",
                        maxHeight: "calc(65vh)", // never exceed the preview area
                        width: "auto",
                        maxWidth: "100%",
                        objectFit: "contain",
                        borderRadius: 12,
                        border: "1px solid #232326",
                        imageRendering: "pixelated",
                      }
                    : {
                        /* LANDSCAPE: fill width, keep AR */
                        width: "100%",
                        maxWidth: "1100px", // clamp so it doesn't get absurdly wide
                        height: "auto",
                        maxHeight: "80vh",
                        objectFit: "contain",
                        borderRadius: 12,
                        border: "1px solid #232326",
                        imageRendering: "pixelated",
                      }
                }
              />
            </div>

            {/* Nice download button */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <a
                href={resultURL}
                download="pixelated.png"
                style={{
                  background: "white",
                  color: "black",
                  fontWeight: 700,
                  borderRadius: 12,
                  padding: "10px 20px",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "none",
                  transition: "background 0.2s, transform 0.1s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#e8e8e8")
                }
                onMouseOut={(e) => (e.currentTarget.style.background = "white")}
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = "scale(0.98)")
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                Download
              </a>
            </div>
          </ImageContainer>
        </div>
      )}

      <footer
        style={{
          textAlign: "center",
          padding: "12px 0",
          fontSize: 12,
          opacity: 0.6,
          color: "white",
          borderTop: "1px solid #232326",
          marginTop: 24,
        }}
      >
        by SeiL
      </footer>
    </div>
  );
}
