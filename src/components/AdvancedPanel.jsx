export default function AdvancedPanel({
  show,
  onToggle,

  // values
  brightness,
  contrast,
  gamma,
  saturation,
  sharpness,
  posterize,
  hueShift,
  exposure,
  clarity,

  // setters
  setBrightness,
  setContrast,
  setGamma,
  setSaturation,
  setSharpness,
  setPosterize,
  setHueShift,
  setExposure,
  setClarity,
}) {
  const resetAll = () => {
    setBrightness(0);
    setContrast(0);
    setGamma(1);
    setSaturation(1);
    setSharpness(0);
    setPosterize(0);
    setHueShift(0);
    setExposure(0);
    setClarity(0);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={onToggle}
        style={{
          background: "#1d1d20",
          color: "white",
          border: "1px solid #2b2b2f",
          borderRadius: 8,
          padding: "8px 12px",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
      >
        {show ? "▲ Hide Advanced" : "▼ Show Advanced"}
      </button>

      {show && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 12,
            background: "#0f0f11",
            border: "1px solid #2b2b2f",
            display: "grid",
            gap: 10,
          }}
        >
          {/* Basic tone */}
          <Label>Brightness ({brightness})</Label>
          <Range
            min={-100}
            max={100}
            step={1}
            value={brightness}
            onChange={setBrightness}
          />

          <Label>Contrast ({contrast})</Label>
          <Range
            min={-100}
            max={100}
            step={1}
            value={contrast}
            onChange={setContrast}
          />

          <Label>Gamma ({gamma.toFixed(2)})</Label>
          <Range
            min={0.1}
            max={3}
            step={0.01}
            value={gamma}
            onChange={setGamma}
          />

          <Label>Saturation ({saturation.toFixed(2)})</Label>
          <Range
            min={0}
            max={2}
            step={0.01}
            value={saturation}
            onChange={setSaturation}
          />

          <Divider />

          {/* Pro detail */}
          <Label>Sharpness ({sharpness}%)</Label>
          <Range
            min={0}
            max={200}
            step={1}
            value={sharpness}
            onChange={setSharpness}
          />

          <Label>
            Posterize {posterize ? `(${posterize} levels)` : "(off)"}
          </Label>
          <Range
            min={0}
            max={64}
            step={1}
            value={posterize}
            onChange={setPosterize}
          />

          <Label>Hue shift ({hueShift}°)</Label>
          <Range
            min={-180}
            max={180}
            step={1}
            value={hueShift}
            onChange={setHueShift}
          />

          <Label>Exposure ({exposure.toFixed(2)} stops)</Label>
          <Range
            min={-2}
            max={2}
            step={0.01}
            value={exposure}
            onChange={setExposure}
          />

          <Label>Clarity ({clarity})</Label>
          <Range
            min={-100}
            max={100}
            step={1}
            value={clarity}
            onChange={setClarity}
          />

          <button
            onClick={resetAll}
            style={{
              marginTop: 6,
              background: "#1d1d20",
              color: "white",
              border: "1px solid #2b2b2f",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Reset Advanced
          </button>
        </div>
      )}
    </div>
  );
}

/* --- Tiny helpers for cleaner JSX --- */
function Label({ children }) {
  return <label style={{ color: "white", fontSize: 12 }}>{children}</label>;
}
function Divider() {
  return <div style={{ height: 1, background: "#2b2b2f", margin: "6px 0" }} />;
}
function Range({ value, onChange, ...rest }) {
  return (
    <input
      type="range"
      {...rest}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%" }}
    />
  );
}
