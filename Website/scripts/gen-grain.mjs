/**
 * gen-grain.mjs
 *
 * Generates a film grain texture PNG for use as a CSS overlay.
 * Produces organic, analog-looking grain — not digital static.
 *
 * Usage:
 *   bun scripts/gen-grain.mjs
 *
 * Output:
 *   public/images/grain.png  (400×400, greyscale)
 */

import sharp from "sharp";
import { mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT    = resolve(__dirname, "..");
const OUT     = resolve(ROOT, "public/images/grain.png");

mkdirSync(resolve(ROOT, "public/images"), { recursive: true });

const W = 400, H = 400;

// ── Generate raw noise ────────────────────────────────────────────────────────
// Film grain: Gaussian-distributed noise around mid-grey.
// Box-Muller transform gives proper Gaussian distribution.
function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const raw = Buffer.alloc(W * H);
for (let i = 0; i < raw.length; i++) {
  // Std dev ~42 gives visible but not overwhelming grain
  raw[i] = Math.max(0, Math.min(255, Math.round(128 + gaussian() * 42)));
}

// ── Slight blur for organic film-crystal feel (not sharp digital pixels) ─────
await sharp(raw, { raw: { width: W, height: H, channels: 1 } })
  .blur(0.6)
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`✓ grain.png → public/images/grain.png`);
