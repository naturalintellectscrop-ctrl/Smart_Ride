/**
 * Unify all Smart Ride logos.
 *
 * Strategy:
 *  1. Read the user's canonical logo (WhatsApp upload = the brand logo with
 *     "SmartRide" + "Les Transporteurs" tagline).
 *  2. Convert it to PNG with a TRANSPARENT background (chroma-key out the
 *     near-black background pixels outside the circular logo badge).
 *  3. Produce one canonical transparent PNG at 1024x1024.
 *  4. Replicate that PNG to every logo path used by the codebase so that
 *     web, mobile (React Native) and Expo all render the SAME asset.
 *  5. Derive smaller favicon variants (16/32/48/64/192/512) from the same
 *     canonical source so the browser tab, PWA manifest and iOS touch icon
 *     all match.
 *
 * Run with:  bun run scripts/unify-logos.ts
 */
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..");

// The user's canonical logo (transparent background not yet present).
const SOURCE_LOGO = path.join(
  PROJECT_ROOT,
  "upload",
  "WhatsApp Image 2026-03-07 at 3.32.01 PM (1).jpeg"
);

// Where the canonical transparent PNGs land.
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const MOBILE_ASSETS = path.join(PROJECT_ROOT, "mobile", "assets");
const EXPO_ASSETS = path.join(PROJECT_ROOT, "expo-app", "assets", "images");

// Files that the codebase actually imports / references.
// (discovered via grep for "/logo", "/smartride-logo", "/smart-ride-logo",
//  "/favicon", "/icon")
const TARGETS = {
  // Web (Next.js public/)
  "public/smartride-logo-transparent.png": path.join(PUBLIC_DIR, "smartride-logo-transparent.png"),
  "public/logo.png": path.join(PUBLIC_DIR, "logo.png"),
  "public/icon.png": path.join(PUBLIC_DIR, "icon.png"),
  "public/smart-ride-logo.png": path.join(PUBLIC_DIR, "smart-ride-logo.png"),
  "public/smartride-logo-new.png": path.join(PUBLIC_DIR, "smartride-logo-new.png"),
  "public/smartride-logo.jpeg": path.join(PUBLIC_DIR, "smartride-logo.jpeg"),
  "public/logo.jpeg": path.join(PUBLIC_DIR, "logo.jpeg"),
  "public/favicon.png": path.join(PUBLIC_DIR, "favicon.png"),
  "public/favicon.jpeg": path.join(PUBLIC_DIR, "favicon.jpeg"),
  "public/favicon.svg": path.join(PUBLIC_DIR, "favicon.svg"),
  "public/favicon-16x16.png": path.join(PUBLIC_DIR, "favicon-16x16.png"),
  "public/favicon-32x32.png": path.join(PUBLIC_DIR, "favicon-32x32.png"),
  "public/favicon-48x48.png": path.join(PUBLIC_DIR, "favicon-48x48.png"),
  "public/favicon-64x64.png": path.join(PUBLIC_DIR, "favicon-64x64.png"),
  "public/favicon-192x192.png": path.join(PUBLIC_DIR, "favicon-192x192.png"),
  "public/favicon-512x512.png": path.join(PUBLIC_DIR, "favicon-512x512.png"),
  "public/icon.png": path.join(PUBLIC_DIR, "icon.png"),
  "public/icons/icon-192x192.png": path.join(PUBLIC_DIR, "icons", "icon-192x192.png"),
  "public/icons/icon-512x512.png": path.join(PUBLIC_DIR, "icons", "icon-512x512.png"),
  "public/images/logo.png": path.join(PUBLIC_DIR, "images", "logo.png"),
  "public/images/smart-ride-logo.png": path.join(PUBLIC_DIR, "images", "smart-ride-logo.png"),
  // Mobile (React Native)
  "mobile/assets/smartride-logo.png": path.join(MOBILE_ASSETS, "smartride-logo.png"),
  // Expo
  "expo-app/assets/images/smartride-logo.png": path.join(EXPO_ASSETS, "smartride-logo.png"),
};

const FAVICON_SIZES = [16, 32, 48, 64, 192, 512] as const;

/**
 * Build a transparent PNG from the source JPEG.
 *
 * The source logo has a near-black background (#0a0f0c-ish) outside the
 * circular badge. We flood that to alpha=0 by:
 *   - extracting the alpha channel via a luminance threshold
 *   - multiplying the existing RGBA alpha by the mask
 *
 * We also expand the resulting transparent area by a few pixels (erode the
 * visible mask) to remove the dark halo that often survives chroma keying.
 */
async function buildTransparentLogo(): Promise<Buffer> {
  // 1. Load + normalise to 1024x1024 RGBA, return raw pixel buffer + metadata.
  const { data, info } = await sharp(SOURCE_LOGO)
    .resize(1024, 1024, { fit: "cover", position: "centre" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. Build a luminance mask: pixels darker than threshold → transparent.
  //    The logo badge itself is bright (green/white), background is near-black,
  //    so a threshold of ~60 cleanly separates them.
  const out = Buffer.from(data);

  const THRESHOLD = 40; // 0-255 luminance; anything below becomes transparent
  const FEATHER = 0; // additional pixels to erode the visible mask by

  // First pass: hard threshold on luminance.
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Rec. 601 luminance.
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Pixels below the threshold are background → alpha 0.
      // Pixels above keep their original alpha (or 255 if opaque).
      if (lum < THRESHOLD) {
        out[i + 3] = 0;
      } else {
        // Boost alpha to fully opaque for visible pixels.
        out[i + 3] = 255;
      }
    }
  }

  // Second pass: erode the visible mask by `FEATHER` pixels so we drop the
  // dark halo around the badge edge.
  if (FEATHER > 0) {
    const eroded = Buffer.from(out);
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * info.channels;
        if (out[i + 3] === 0) continue;
        // Check 4-neighbours within FEATHER radius.
        let keepAlpha = 255;
        for (let dy = -FEATHER; dy <= FEATHER && keepAlpha > 0; dy++) {
          for (let dx = -FEATHER; dx <= FEATHER && keepAlpha > 0; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
            const ni = (ny * info.width + nx) * info.channels;
            if (out[ni + 3] === 0) {
              keepAlpha = 0;
            }
          }
        }
        eroded[i + 3] = keepAlpha;
      }
    }
    return sharp(eroded, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    })
      .png()
      .toBuffer();
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();
}

async function main() {
  console.log("→ Building canonical transparent logo from", SOURCE_LOGO);
  const canonicalPng = await buildTransparentLogo();
  const canonicalMeta = await sharp(canonicalPng).metadata();
  console.log(
    `  ✓ canonical PNG: ${canonicalMeta.width}x${canonicalMeta.height} ` +
      `(channels=${canonicalMeta.channels}, hasAlpha=${canonicalMeta.hasAlpha})`
  );

  // Save the canonical 1024x1024 first.
  await fs.writeFile(path.join(PUBLIC_DIR, "smartride-logo-transparent.png"), canonicalPng);
  console.log("  ✓ wrote public/smartride-logo-transparent.png");

  // Replicate the canonical PNG to every full-size target path.
  const fullSizeTargets = Object.values(TARGETS).filter((p) => {
    const name = path.basename(p).toLowerCase();
    // Favicon-NxN variants are derived below, not just copied.
    return !/\bfavicon-\d+x\d+\.png$/.test(name) &&
           !/icons\/icon-\d+x\d+/.test(p.toLowerCase().replace(/\\/g, "/"));
  });

  for (const target of fullSizeTargets) {
    // Decide output format from filename.
    const ext = path.extname(target).toLowerCase();
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (ext === ".jpeg" || ext === ".jpg") {
      // For JPEG paths (no alpha support), flatten onto a white background
      // so we don't ship a black rectangle where the transparent corners were.
      const flattened = await sharp(canonicalPng)
        .flatten({ background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
      await fs.writeFile(target, flattened);
    } else if (ext === ".svg") {
      // Replace any stray SVGs with a tiny stub that references the PNG so
      // there is no longer a mismatched vector logo.
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <image href="smartride-logo-transparent.png" width="1024" height="1024" />
</svg>
`;
      await fs.writeFile(target, svg, "utf8");
    } else {
      // .png — straight copy of the canonical transparent buffer.
      await fs.writeFile(target, canonicalPng);
    }
    console.log(`  ✓ wrote ${path.relative(PROJECT_ROOT, target)}`);
  }

  // Derive favicon variants at each required size.
  for (const size of FAVICON_SIZES) {
    const target = path.join(PUBLIC_DIR, `favicon-${size}x${size}.png`);
    const buf = await sharp(canonicalPng)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await fs.writeFile(target, buf);
    console.log(`  ✓ wrote public/favicon-${size}x${size}.png`);
  }

  // Also derive icons/icon-{192,512}.png (PWA manifest icons).
  for (const size of [192, 512] as const) {
    const target = path.join(PUBLIC_DIR, "icons", `icon-${size}x${size}.png`);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const buf = await sharp(canonicalPng)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await fs.writeFile(target, buf);
    console.log(`  ✓ wrote public/icons/icon-${size}x${size}.png`);
  }

  // Also update the Expo / mobile adaptive-icon + splash if present.
  const adaptivePaths = [
    path.join(PROJECT_ROOT, "assets", "adaptive-icon.png"),
    path.join(PROJECT_ROOT, "assets", "icon.png"),
    path.join(PROJECT_ROOT, "assets", "splash.png"),
  ];
  for (const p of adaptivePaths) {
    try {
      // splash is portrait; icons are square. Resize accordingly.
      const isSplash = path.basename(p).startsWith("splash");
      if (isSplash) {
        // Center the logo on a white splash background.
        const splashBg = await sharp({
          create: {
            width: 1242,
            height: 2436,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          },
        }).png().toBuffer();
        const logoForSplash = await sharp(canonicalPng).resize(600, 600, { fit: "contain" }).png().toBuffer();
        const composited = await sharp(splashBg)
          .composite([{ input: logoForSplash, gravity: "center" }])
          .png()
          .toBuffer();
        await fs.writeFile(p, composited);
      } else {
        // 1024x1024 transparent icon.
        const buf = await sharp(canonicalPng)
          .resize(1024, 1024, { fit: "contain" })
          .png()
          .toBuffer();
        await fs.writeFile(p, buf);
      }
      console.log(`  ✓ wrote ${path.relative(PROJECT_ROOT, p)}`);
    } catch (err) {
      console.warn(`  ! skipped ${p}: ${(err as Error).message}`);
    }
  }

  console.log("\n✅ All logos unified. Single source of truth = public/smartride-logo-transparent.png");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
