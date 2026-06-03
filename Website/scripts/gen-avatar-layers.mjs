/**
 * gen-avatar-layers.mjs
 *
 * Generates a depth map + layered WebPs from the avatar image.
 * Runs the depth model locally via ONNX — no API token needed.
 * First run downloads ~50 MB model; subsequent runs use cache.
 *
 * Usage:
 *   bun scripts/gen-avatar-layers.mjs
 *
 * Or with a pre-made depth map (Photoshop, Runway, etc.):
 *   bun scripts/gen-avatar-layers.mjs --depth path/to/depth.png
 *
 * Outputs:
 *   public/images/avatar/depth.png       — raw depth map (for inspection)
 *   public/images/avatar/layer-far.webp
 *   public/images/avatar/layer-mid.webp
 *   public/images/avatar/layer-near.webp
 */

import sharp from "sharp";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, "..");
const SRC_IMAGE = resolve(ROOT, "src/assets/avatar.webp");
const OUT_DIR   = resolve(ROOT, "public/images/avatar");

mkdirSync(OUT_DIR, { recursive: true });

// ── 1. Source image ─────────────────────────────────────────────────────────
const srcMeta = await sharp(SRC_IMAGE).metadata();
const { width, height } = srcMeta;
console.log(`Source: ${width}×${height}`);

// ── 2. Depth map ─────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const depthArgIdx = args.indexOf("--depth");
const providedDepth = depthArgIdx !== -1 ? args[depthArgIdx + 1] : null;

let depthBuf; // Uint8Array, one byte per pixel, 0=far 255=near

if (providedDepth) {
  console.log(`Using provided depth map: ${providedDepth}`);
  depthBuf = await sharp(resolve(providedDepth))
    .resize(width, height)
    .grayscale()
    .raw()
    .toBuffer();
} else {
  console.log("Running Depth Anything V2 locally (downloads ~50 MB on first run)...");

  // Dynamic import so the module isn't loaded when --depth is provided
  const { pipeline, RawImage } = await import("@huggingface/transformers");

  const estimator = await pipeline(
    "depth-estimation",
    "Xenova/depth-anything-small-hf",
    { device: "cpu" },
  );

  const imgBuf = readFileSync(SRC_IMAGE);
  const blob   = new Blob([imgBuf], { type: "image/webp" });
  const image  = await RawImage.fromBlob(blob);
  const result = await estimator(image);

  const tensor = result.predicted_depth;
  const data   = tensor.data; // Float32Array
  const dims   = tensor.dims;
  // Model may output [H, W] or [1, H, W]
  const tH = dims.length === 3 ? dims[1] : dims[0];
  const tW = dims.length === 3 ? dims[2] : dims[1];

  // Normalise to 0–255, invert so near=255 far=0
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min || 1;

  const raw = Buffer.alloc(tW * tH);
  for (let i = 0; i < data.length; i++) {
    // Depth Anything: larger value = closer, so no invert needed
    raw[i] = Math.round(((data[i] - min) / range) * 255);
  }

  // Save depth map PNG for inspection / manual tweaking
  const depthPng = await sharp(raw, { raw: { width: tW, height: tH, channels: 1 } })
    .resize(width, height)
    .png()
    .toBuffer();
  writeFileSync(resolve(OUT_DIR, "depth.png"), depthPng);
  console.log("✓ depth.png saved");

  depthBuf = await sharp(depthPng)
    .resize(width, height)
    .grayscale()
    .raw()
    .toBuffer();
}

// ── 3. Extract layers ────────────────────────────────────────────────────────
const { data: imgRaw } = await sharp(SRC_IMAGE)
  .resize(width, height)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const LAYERS = [
  { name: "layer-far",  min: 0,    max: 0.40 },
  { name: "layer-mid",  min: 0.30, max: 0.74 },
  { name: "layer-near", min: 0.64, max: 1.0  },
];

function softAlpha(d, min, max) {
  const fade = 0.08;
  if (d < min - fade || d > max + fade) return 0;
  if (d >= min && d <= max) return 255;
  if (d < min) return Math.round(((d - (min - fade)) / fade) * 255);
  return Math.round(((max + fade - d) / fade) * 255);
}

for (const layer of LAYERS) {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const d = depthBuf[i] / 255;
    out[i * 4]     = imgRaw[i * 4];
    out[i * 4 + 1] = imgRaw[i * 4 + 1];
    out[i * 4 + 2] = imgRaw[i * 4 + 2];
    out[i * 4 + 3] = softAlpha(d, layer.min, layer.max);
  }
  await sharp(out, { raw: { width, height, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(resolve(OUT_DIR, `${layer.name}.webp`));
  console.log(`✓ ${layer.name}.webp`);
}

console.log("\nDone → public/images/avatar/");
