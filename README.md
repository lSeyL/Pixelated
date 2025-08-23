# 🎨 Pixelated – Image to Pixel Art Converter

Convert any photo into pixel art directly in your browser.  
Built with **React + Vite** and deployed on **Vercel**.  

👉 Live demo: [https://pixelated-mocha.vercel.app/](https://pixelated-mocha.vercel.app/)

---

## ✨ Features

- 🖼️ **Upload images** (via file picker)
- 🎛️ Adjust **output width / height** with aspect ratio lock
- 🔲 Control **pixel size** (detail vs. chunkiness)
- 🎨 Remap colors to custom palettes or presets (WPlace palettes included)
- 🧮 Multiple **dithering algorithms**: Floyd–Steinberg, Atkinson, Ordered, or None
- ⚖️ Choose **color distance metric**: ΔE76 (fast) or CIEDE2000 (more perceptual)
- 🛠️ **Advanced panel** for pro controls:
  - Brightness / Contrast / Gamma / Saturation
  - Sharpness (Unsharp Mask)
  - Posterize levels
  - Hue shift, Exposure, Clarity (local contrast)

---

## 🖥️ Getting Started

### Clone and install
```bash
git clone https://github.com/lSeyL/Pixelated.git
cd pixelated
npm install
