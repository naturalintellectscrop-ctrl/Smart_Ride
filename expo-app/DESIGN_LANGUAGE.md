# Smart Ride — Design Language (quick reference)

> **Full source of truth:** [`../SMART_RIDE_DESIGN_SYSTEM.md`](../SMART_RIDE_DESIGN_SYSTEM.md) — the complete Product Design System (philosophy, DNA, brand, motion, interaction, components, map, architecture, accessibility, roadmap). This file is the fast token/primitive lookup.

The single source of truth for how Smart Ride looks and feels. Every screen and
every service must pull from the foundations below — no per-screen colours,
shadows, radii, durations, or bespoke cards/buttons. This document describes
what actually ships in the app (see `src/constants/index.ts`,
`src/theme/themedColors.ts`, `src/components/`), not an aspiration.

## Principles

Premium here means **calm, confident, intentional, fast** — friction removed,
not effects added. In practice:

- **Content first.** Generous spacing, clear hierarchy, one primary action per view.
- **Green is for action and active state only** — never as decoration or large washes.
- **Depth is subtle.** Soft, tokenised shadows; no neumorphism, no heavy glass.
- **Motion explains, never decorates.** Short, consistent, ≤ ~250ms for interactions.
- **One of everything.** One card, one button, one dialog system, one icon family
  (Ionicons / MaterialCommunityIcons), one motion vocabulary.
- **Real data only.** Loading → skeleton, no data → empty state; never fake content.

## Colour

Theme-aware via `useTheme().colors` / `makeThemedColors(isDark)` — light and dark
resolve from one token set. Do not hardcode hex in screens; use tokens.

- **Primary (brand green):** light `#005f3a`, dark `#7cd9a4`. Actions + active states.
- **Surfaces:** `surface` (page), `backgroundElevated` (cards), `surfaceContainerLow`
  (insets/fields), `backgroundSecondary` (accent card).
- **Text:** `onSurface` (primary), `onSurfaceVariant` (secondary), `outline` (hint).
- **Semantic:** `success` green · `warning` amber · `error` red · `info`.
- **Map markers** (fixed, brand-independent of theme): riders `#16A34A`, errand `#8B5CF6`,
  parcel `#F59E0B`, your-location `#3B82F6`, pickup `#10B981`, destination `#EF4444`,
  offline `#94A3B8`. One marker style per entity — never generic coloured circles.

## Typography (`TYPOGRAPHY`)

`displayLg` 32/700 · `headlineLg` 24/700 · `headlineMd` 20/600 · `bodyLg` 18 ·
`bodyMd` 16 · `bodySm` 14 · `labelLg` 14/600 · `labelMd` 12/500. Screen titles use
display/headline; body copy uses body; chips/labels use label.

## Spacing (`SPACING`) — 4pt system

`xs 4 · sm 8 · gutter 12 · md 16 · lg 24 · xl 32`. Screen horizontal padding = `md`.
Section rhythm = `md`–`lg`. Never eyeball spacing.

## Radius (`RADIUS`)

`sm 4 · DEFAULT 8 · md 12 · lg 16 · xl 24 · full`. Cards/sheets `xl`; inputs `lg`;
pills/CTAs `full`.

## Elevation (`SHADOWS`)

`card` (resting surfaces) · `active` (floating/modal) · `button`. No ad-hoc shadows.

## Motion (`MOTION`)

One vocabulary so everything feels like one product.

- **Duration (ms):** `instant 90` (toggles) · `fast 150` · `base 220` (buttons/cards)
  · `slow 320` (sheets) · `slower 480` (hero/screen).
- **Easing:** `standard` enter+move · `decelerate` in · `accelerate` out (bezier tuples).
- **Spring:** `press` (taps) · `gentle` (sheets) · `bouncy` (rare accents).
- **Press feedback:** every tappable surface scales to `pressScale` (0.97) on
  `spring.press`. Animate to explain, not to decorate.

## Components (use these — do not re-roll)

- **`Card`** — the one surface. `variant` flat/raised/elevated/accent, `padding`,
  `radius`, optional `onPress` (animated press). `GlassCard` is a compat alias.
- **`GradientButton`** — primary/danger/secondary/outline, sizes sm/md/lg, loading +
  disabled states, shared press animation. No default system buttons.
- **`IconInput`** — text fields (label + icon + right action). Green border only when active.
- **Dialogs/toasts** — `import { Alert, toast } from '@/src/components/feedback'`.
  Branded; state (success/warning/error/info) inferred from title/buttons.
  **Never** `Alert` from `react-native`.
- **States** — `EmptyState` / `ErrorState` / `SectionHeader` (`StateViews`), `Skeleton`
  loaders, `StatusBadge` pills.
- **Map** — `SmartRideMap` with the vehicle-marker system; client is the blue pulse only.

## Do / Don't

- ✅ One primary action per screen · tap targets ≥ 44dp · tokens for every value.
- ❌ Heavy glassmorphism · gradients on every surface · neumorphism · mixed icon sets ·
  raw `Alert.alert` · hardcoded colours/spacing · animation for decoration.

## Rollout

Foundations are in place (tokens · motion · card · button · dialogs · markers).
Services are migrated **one flow at a time**, each verified on device: auth,
register, rider-home and the map are done; Wallet → Food → Shopping → Health →
Merchant → Pharmacist → Chat → Notifications remain. Every migrated screen must
consume the components above and add zero new one-off styles.
