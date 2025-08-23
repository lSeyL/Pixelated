import { useMemo, useRef, useState } from "react";
import { PRESETS, parsePalette } from "./utils/palettes";
import { buildPaletteLab, nearestColor } from "./utils/nearest";
import { convertImage } from "./utils/convert";
import ImageContainer from "./components/ImageContainer";

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
  const [brightness, setBrightness] = useState(0); // -100..100
  const [contrast, setContrast] = useState(0); // -100..100
  const [gamma, setGamma] = useState(1); // 0.1..3
  const [saturation, setSaturation] = useState(1); // 0..2
  const [sharpness, setSharpness] = useState(0); // 0..200 (%)
  const [dither, setDither] = useState("floyd");

  // palette array (hex)
  const palette = useMemo(() => parsePalette(paletteText), [paletteText]);

  // paletteLab array (precomputed RGB + Lab)
  const paletteLab = useMemo(() => buildPaletteLab(palette), [palette]);
  const w = Number(outWidth) || 0;
  const h = Number(outHeight) || 0;
  const pxSize = Number(pixelSize) || 1;

  const totalRawPx = w * h; // canvas pixels
  const blockW = Math.max(1, Math.round(w / pxSize));
  const blockH = Math.max(1, Math.round(h / pxSize));
  const totalBlocks = blockW * blockH;

  const isPortrait = outHeight && outWidth ? outHeight >= outWidth : false;

  const fileInputRef = fileRef;

  const [isDragging, setIsDragging] = useState(false);

  function getTimeStamp() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${hh}${mm}${ss}`;
  }

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

  async function handleConvert() {
    if (!previewURL) return;
    if (resultURL) URL.revokeObjectURL(resultURL);

    const url = await convertImage({
      srcURL: previewURL,
      outWidth,
      outHeight,
      pixelSize,
      paletteLab,
      nearestColor, // from your utils
      dither, // new state
      adjust: { brightness, contrast, gamma, saturation, sharpness },
    });

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
            <label>Brightness ({brightness})</label>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={brightness}
              onChange={(e) => setBrightness(+e.target.value)}
            />

            <label>Contrast ({contrast})</label>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={contrast}
              onChange={(e) => setContrast(+e.target.value)}
            />

            <label>Gamma ({gamma.toFixed(2)})</label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.01"
              value={gamma}
              onChange={(e) => setGamma(+e.target.value)}
            />

            <label>Saturation ({saturation.toFixed(2)})</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={saturation}
              onChange={(e) => setSaturation(+e.target.value)}
            />

            <label>Sharpness ({sharpness}%)</label>
            <input
              type="range"
              min="0"
              max="200"
              step="1"
              value={sharpness}
              onChange={(e) => setSharpness(+e.target.value)}
            />
            <label style={{ fontSize: 12 }}>Dithering</label>
            <select value={dither} onChange={(e) => setDither(e.target.value)}>
              <option value="floyd">Floyd–Steinberg (default)</option>
              <option value="atkinson">Atkinson</option>

              <option value="bayer2">Bayer 2x2</option>
              <option value="bayer4">Bayer 4x4</option>
              <option value="ordered">Ordered (Bayer 8×8)</option>

              <option value="bayer16">Bayer 16x16</option>
              <option value="bayer32">Bayer 32x32</option>
              <option value="jarvis">Jarvis</option>
              <option value="none">None</option>
            </select>

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
              onClick={handleConvert}
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
                download={`pixelated_${getTimeStamp()}.png`}
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
