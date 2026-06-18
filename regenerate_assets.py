#!/usr/bin/env python3
"""
Regenerate broken Smart Ride Expo PNG branding assets.

Reads the canonical transparent logo (1024x1024 RGBA, 90.77% transparent) and
composites it onto a solid brand green (#005f3a = RGB(0,95,58)) background to
produce:
  - expo-app/assets/splash.png         (1242x2436 RGBA, logo ~60% of smaller dim)
  - expo-app/assets/icon.png           (1024x1024 RGB, logo ~70%)
  - expo-app/assets/adaptive-icon.png  (1024x1024 RGB, logo ~50% — adaptive safe-zone)
  - expo-app/assets/favicon.png        (48x48 RGB, logo ~36px)
  - public/favicon-16x16.png           (16x16 RGB)
  - public/favicon-32x32.png           (32x32 RGB)
  - public/favicon-48x48.png           (48x48 RGB — OVERWRITE)
  - public/favicon-64x64.png           (64x64 RGB)
  - public/favicon-192x192.png         (192x192 RGB — OVERWRITE)
  - public/favicon-512x512.png         (512x512 RGB — OVERWRITE)
"""

import os
from PIL import Image

LOGO_PATH = "/home/z/my-project/expo-app/assets/images/smartride-logo.png"
BRAND_GREEN = (0, 95, 58, 255)  # #005f3a as RGBA


def load_logo():
    """Load the canonical transparent logo as RGBA."""
    logo = Image.open(LOGO_PATH).convert("RGBA")
    assert logo.size == (1024, 1024), f"Unexpected logo size: {logo.size}"
    print(f"  [logo] loaded {logo.size} {logo.mode}")
    return logo


def composite_green(logo, canvas_size, logo_size, rgba_output):
    """
    Create a canvas_size x canvas_size canvas filled with brand green,
    paste the logo centered (scaled to logo_size preserving aspect),
    and return the resulting image.

    If rgba_output is True, returns RGBA (for splash); otherwise returns RGB
    (for icon, adaptive-icon, favicon — no alpha needed).
    """
    canvas_w, canvas_h = canvas_size if isinstance(canvas_size, tuple) else (canvas_size, canvas_size)

    # 1) Build an RGBA green background
    bg = Image.new("RGBA", (canvas_w, canvas_h), BRAND_GREEN)

    # 2) Resize logo preserving aspect ratio to fit within logo_size box.
    #    Logo is square (1024x1024), so direct resize is safe.
    logo_w, logo_h = logo_size if isinstance(logo_size, tuple) else (logo_size, logo_size)
    logo_resized = logo.resize((logo_w, logo_h), Image.LANCZOS)

    # 3) Center the logo on the green background
    offset = ((canvas_w - logo_w) // 2, (canvas_h - logo_h) // 2)

    # 4) Composite the logo (which has transparency) onto the green bg.
    #    alpha_composite properly blends RGBA source over RGBA destination.
    bg.alpha_composite(logo_resized, offset)

    if rgba_output:
        return bg
    return bg.convert("RGB")


def save_png(img, path, mode_label):
    """Save image as PNG, creating parent directory if needed."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG", optimize=True)
    size_bytes = os.path.getsize(path)
    print(f"  [{mode_label}] wrote {path}  ({img.size[0]}x{img.size[1]} {img.mode}, {size_bytes} bytes)")
    return size_bytes


def main():
    print("Loading canonical transparent logo...")
    logo = load_logo()

    # ----- splash.png ------------------------------------------------------
    # 1242x2436 (iPhone X splash). Logo scaled to ~60% of smaller dim (1242).
    # 60% of 1242 = 745.2 -> use 740 px logo.
    print("\n[1/4] Generating splash.png (1242x2436, RGBA, logo 740px)...")
    splash = composite_green(
        logo,
        canvas_size=(1242, 2436),
        logo_size=(740, 740),
        rgba_output=True,
    )
    save_png(splash, "/home/z/my-project/expo-app/assets/splash.png", "splash")

    # ----- icon.png --------------------------------------------------------
    # 1024x1024 (Expo required). Logo ~70% -> 720 px.
    print("\n[2/4] Generating icon.png (1024x1024, RGB, logo 720px)...")
    icon = composite_green(
        logo,
        canvas_size=(1024, 1024),
        logo_size=(720, 720),
        rgba_output=False,
    )
    save_png(icon, "/home/z/my-project/expo-app/assets/icon.png", "icon")

    # ----- adaptive-icon.png ----------------------------------------------
    # 1024x1024 (Expo adaptive icon). Logo ~50% -> 512 px (fits within the
    # ~66% safe-zone).
    print("\n[3/4] Generating adaptive-icon.png (1024x1024, RGB, logo 512px)...")
    adaptive = composite_green(
        logo,
        canvas_size=(1024, 1024),
        logo_size=(512, 512),
        rgba_output=False,
    )
    save_png(adaptive, "/home/z/my-project/expo-app/assets/adaptive-icon.png", "adaptive-icon")

    # ----- favicon.png (expo-app/assets) ----------------------------------
    # 48x48 RGB. Logo scaled to ~36px.
    print("\n[4/4] Generating favicon.png + PWA favicons in public/...")
    favicon = composite_green(
        logo,
        canvas_size=(48, 48),
        logo_size=(36, 36),
        rgba_output=False,
    )
    save_png(favicon, "/home/z/my-project/expo-app/assets/favicon.png", "favicon-app")

    # ----- PWA favicons in public/ ----------------------------------------
    # Sizes per spec: 16, 32, 48 (overwrite), 64, 192 (overwrite), 512 (overwrite).
    # Logo scaled to ~75% of canvas (consistent with icon.png proportions).
    pwa_specs = [
        (16, 16,  "/home/z/my-project/public/favicon-16x16.png",   "favicon-16"),
        (32, 32,  "/home/z/my-project/public/favicon-32x32.png",   "favicon-32"),
        (48, 36,  "/home/z/my-project/public/favicon-48x48.png",   "favicon-48"),
        (64, 48,  "/home/z/my-project/public/favicon-64x64.png",   "favicon-64"),
        (192, 144, "/home/z/my-project/public/favicon-192x192.png", "favicon-192"),
        (512, 384, "/home/z/my-project/public/favicon-512x512.png", "favicon-512"),
    ]
    for canvas, logo_px, path, label in pwa_specs:
        img = composite_green(
            logo,
            canvas_size=canvas,
            logo_size=logo_px,
            rgba_output=False,
        )
        save_png(img, path, label)

    print("\nAll assets generated.")


if __name__ == "__main__":
    main()
