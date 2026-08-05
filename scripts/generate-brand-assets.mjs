/**
 * Smart Ride brand asset generator.
 *
 * Single source of truth: the square Smart Ride mark (map pin + road) with a
 * transparent squircle surround, checked in at `assets/brand/mark.png`.
 * Everything the web app, PWA and Expo app ship is derived from that one file so
 * the marks can never drift apart again.
 *
 * Run with: node scripts/generate-brand-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, "..");
const MARK = path.join(ROOT, "assets", "brand", "mark.png");
const FULL = path.join(ROOT, "assets", "brand", "mark-full.png");

/** The mark's own interior background. Icons flattened onto this look seamless. */
const NAVY = { r: 6, g: 13, b: 23, alpha: 1 };

const out = (...p) => {
  const file = path.join(ROOT, ...p);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
};

/** Square icon, mark edge-to-edge, flattened onto navy (iOS rejects alpha). */
const opaque = (size, dest) =>
  sharp(MARK)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten({ background: NAVY })
    .png()
    .toFile(dest);

/** Square icon keeping the transparent squircle corners (web/PWA "any" purpose). */
const transparent = (size, dest) =>
  sharp(MARK)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(dest);

/**
 * Maskable / adaptive icon: the mark inset to ~66% so Android's circle, squircle
 * and rounded-square masks all crop inside the safe zone.
 */
const masked = (size, dest, flatten) => {
  const inner = Math.round(size * 0.66);
  const pad = Math.round((size - inner) / 2);
  let pipeline = sharp(MARK)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: flatten ? NAVY : { r: 0, g: 0, b: 0, alpha: 0 } });
  if (flatten) pipeline = pipeline.flatten({ background: NAVY });
  return pipeline.png().toFile(dest);
};

/**
 * Open Graph / Twitter card: the full brand render composited onto a 1200x630
 * navy plate. sharp only honours one resize per pipeline, so the mark is scaled
 * in its own pass and then composited.
 */
const ogImage = async (dest) => {
  const mark = await sharp(FULL).resize(null, 520, { fit: "inside" }).png().toBuffer();
  return sharp({
    create: { width: 1200, height: 630, channels: 4, background: NAVY },
  })
    .composite([{ input: mark, gravity: "center" }])
    .flatten({ background: NAVY })
    .png()
    .toFile(dest);
};

async function main() {
  if (!fs.existsSync(MARK)) throw new Error(`Missing canonical mark: ${MARK}`);

  await Promise.all([
    // --- Web favicons -----------------------------------------------------
    opaque(16, out("public", "favicon-16x16.png")),
    opaque(32, out("public", "favicon-32x32.png")),
    opaque(48, out("public", "favicon-48x48.png")),
    opaque(180, out("public", "apple-touch-icon.png")),

    // --- Canonical inline logo used across the web UI ---------------------
    transparent(512, out("public", "icon.png")),

    // --- PWA icons (manifest + service worker precache) -------------------
    transparent(192, out("public", "icons", "icon-192x192.png")),
    transparent(512, out("public", "icons", "icon-512x512.png")),
    masked(512, out("public", "icons", "icon-maskable-512x512.png"), true),
    transparent(72, out("public", "icons", "badge-72x72.png")),

    // --- Social ------------------------------------------------------------
    ogImage(out("public", "og-image.png")),

    // --- Expo native app ---------------------------------------------------
    opaque(1024, out("expo-app", "assets", "icon.png")),
    masked(1024, out("expo-app", "assets", "adaptive-icon.png"), false),
    opaque(48, out("expo-app", "assets", "favicon.png")),
    transparent(1024, out("expo-app", "assets", "splash.png")),
    transparent(512, out("expo-app", "assets", "images", "brand-mark.png")),
  ]);

  console.log("Brand assets regenerated from", path.relative(ROOT, MARK));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
