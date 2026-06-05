---
name: Smart Ride Design System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3f4941'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6f7a71'
  outline-variant: '#bec9bf'
  surface-tint: '#006d43'
  primary: '#005f3a'
  on-primary: '#ffffff'
  primary-container: '#0e7a4d'
  on-primary-container: '#a6ffc9'
  inverse-primary: '#7cd9a4'
  secondary: '#006e2f'
  on-secondary: '#ffffff'
  secondary-container: '#6bff8f'
  on-secondary-container: '#007432'
  tertiary: '#4b5264'
  on-tertiary: '#ffffff'
  tertiary-container: '#636a7c'
  on-tertiary-container: '#e6ebff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#98f6be'
  primary-fixed-dim: '#7cd9a4'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#005231'
  secondary-fixed: '#6bff8f'
  secondary-fixed-dim: '#4ae176'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005321'
  tertiary-fixed: '#dce2f7'
  tertiary-fixed-dim: '#c0c6db'
  on-tertiary-fixed: '#141b2b'
  on-tertiary-fixed-variant: '#404758'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 16px
  gutter: 12px
---

## Brand & Style
The brand personality for this design system is **Smart, Reliable, and Tech-forward**. It is designed to feel like a premium utility—essential for daily life in Uganda but elevated through a polished, modern aesthetic. The emotional response should be one of safety and efficiency, bridging the gap between local warmth and global technology standards.

The design style is **Modern Corporate with Tactile accents**. It leverages a "Card-First" architecture to handle the complexity of a super app. High-quality maps serve as the foundational layer, with floating, rounded containers providing the interactive surface. The UI is mobile-first, optimized for high-glare outdoor environments and one-handed gesture navigation common in ride-hailing and logistics contexts.

## Colors
The palette is rooted in a **Deep Green (#0E7A4D)**, representing reliability, growth, and the Ugandan landscape. This is paired with a **Bright Green Accent (#22C55E)** used sparingly for "Go" actions, success states, and live tracking indicators to ensure high visibility.

**Charcoal (#111827)** provides the structural weight for typography and primary navigation elements, ensuring high contrast against the **White** and **Neutral (#F9FAFB)** backgrounds. Success, Warning, and Error states should be clearly differentiated, with Mobile Money integrations (MTN Yellow and Airtel Red) treated as distinct brand-compliant modules within the checkout flow.

## Typography
The system uses **Plus Jakarta Sans** for headlines to provide a friendly, open, and modern character. For functional text, **Inter** is utilized due to its exceptional legibility at small sizes and high x-height, which is critical for map labels, price points, and ETAs.

Hierarchy is strictly enforced: large, bold headers for destination prompts and service selection, and utilitarian, medium-weight labels for secondary data. Line heights are generous to prevent visual crowding in data-dense delivery menus.

## Layout & Spacing
This system follows a **4px baseline grid** with a fluid layout model. On mobile, a standard **16px side margin** is maintained for all floating cards and content blocks. 

The layout relies on a "Layered Bottom Sheet" philosophy: the map remains the constant base layer, while interactive content slides up from the bottom. Components should be spaced using `md (16px)` for logical grouping and `lg (24px)` for separating distinct sections of the super app (e.g., separating "Recently Visited" from "Special Offers").

## Elevation & Depth
Elevation is used to communicate interactivity and hierarchy.
- **Level 0 (Floor):** Maps and secondary background surfaces.
- **Level 1 (Floating Cards):** Uses an ambient, soft shadow (Blur: 12px, Y: 4, Opacity: 0.08, Color: Charcoal) to lift service categories (Boda, Car, Food) off the map.
- **Level 2 (Active/Modal):** Focused sheets and primary call-to-action containers use a more pronounced shadow (Blur: 20px, Y: 8, Opacity: 0.12) to draw immediate attention.
- **Tonal Layers:** Subtle grey fills (#F3F4F6) are used for input fields and non-interactive containers to provide depth without adding shadow complexity.

## Shapes
The design system adopts a **Rounded (Level 2)** shape language to feel approachable and modern. 
- **Standard Components:** 8px (0.5rem) for buttons and inputs.
- **Large Cards/Bottom Sheets:** 16px (1rem) to 24px (1.5rem) top-radius for a soft, friendly "organic" feel that differentiates the app from traditional, rigid enterprise tools.
- **Status Pills:** Fully rounded (pill-shaped) for tags like "Fastest," "Promo," or "Verified Driver."

## Components
- **Buttons:** Primary buttons use the Deep Green background with White text, featuring a minimum height of 56px for "fat-finger" accessibility during transit. Secondary buttons use a light green tint with Deep Green text.
- **Service Selection Cards:** Large, vertical tiles with high-quality 3D or flat-illustration iconography for Boda, Car, and Food. Includes a prominent "Title" and "Sub-text" for price estimates.
- **Input Fields:** Generous touch targets with 16px internal padding. Location inputs use distinct iconography (Green dot for Pickup, Red dot for Destination).
- **Mobile Money Modules:** Branded containers for MTN and Airtel that appear in the payment tray, utilizing their brand colors only on the logo or a small accent bar to maintain system cohesion.
- **Status Indicators:** Pulsing "Live" markers for driver location on the map, using the Bright Green Accent.
- **Bottom Sheets:** Draggable handles at the top, supporting three states: Collapsed (Peek), Half-expanded (Selection), and Full-screen (Details/Checkout).