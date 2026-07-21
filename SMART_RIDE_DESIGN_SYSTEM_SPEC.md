# Smart Ride — Design System v1.0 (Engineering Specification)

**Status:** Implementation blueprint · **Derived from:** [`SMART_RIDE_DESIGN_SYSTEM.md`](SMART_RIDE_DESIGN_SYSTEM.md) (the Design Language — highest authority) · **Quick ref:** [`expo-app/DESIGN_LANGUAGE.md`](expo-app/DESIGN_LANGUAGE.md)

This document translates the Design Language into an **engineering-grade specification**: tokens, component contracts, states, naming, rules, migration order, and governance. It is **not code and not a redesign** — it is the contract every developer, designer, and AI assistant follows so that every current and future Smart Ride surface (Client, Boda, Car, Delivery, Food, Shopping, Health, Merchant, Pharmacy, Wallet, Chat, SOS, Admin companion, and products not yet built) stays visually and behaviorally cohesive.

**Authority:** where existing UI conflicts with this spec, **this spec wins** — inconsistencies are migrated out (see §16), not preserved.

**Source of truth in code:** `expo-app/src/constants/index.ts` (tokens), `expo-app/src/theme/themedColors.ts` (semantic color resolution), `expo-app/src/components/*` (primitives). Token names below are the real exported names unless marked *(target)* — a target is a canonical name the code should converge on during migration.

---

## Section 1 — Foundations (Tokens)

Everything is a token. **No magic numbers in screens.** All tokens are imported from `@/src/constants` (and colors from `makeThemedColors(isDark)`).

### 1.1 Color tokens — `COLORS` (semantic, resolved per theme)

Screens consume *semantic* tokens only; never raw hex. Full palette in `themedColors.ts`. Canonical groups:

| Group | Tokens | Notes |
|---|---|---|
| Brand | `primary`, `onPrimary`, `primaryContainer`, `onPrimaryContainer`, `secondary`, `onSecondary` | brand green `#005f3a` (light) / `#7cd9a4` (dark). No blue brand. |
| Surface | `surface`, `surfaceContainerLowest/Low/…/Highest`, `backgroundElevated`, `inverseSurface`, `inverseOnSurface` | near-white light / warm near-black dark. |
| Text/line | `onSurface`, `onSurfaceVariant`, `outline`, `outlineVariant`, `border`, `borderLight` | hierarchy via weight+token, not opacity. |
| Status | `success`, `onSuccess?`, `warning`, `error`, `onError`, `errorContainer`, `onErrorContainer`, `info` | used **only** on status. |
| Payment | `mtnYellow`, `airtelRed` (+ Visa `#1A1F71`, Cash→`primary` by convention) | payment chips/badges only. |

**Fixed map/vehicle palette** (NOT theme-swapped — brand recognition), defined in `SmartRideMap`/marker layer:
`rider #16A34A · errand #8B5CF6 · parcel #F59E0B · pickup #10B981 · destination #EF4444 · yourLocation #3B82F6 · offline #94A3B8`.

**Rule:** 90% neutral / 7% brand / 3% status (the "90/7/3 rule").

### 1.2 Typography tokens — `TYPOGRAPHY`

`displayLg 32/40·700` · `headlineLg 24/32·700` · `headlineLgMobile 22/28·700` · `headlineMd 20/28·600` · `bodyLg 18/28·400` · `bodyMd 16/24·400` (default) · `bodySm 14/20·400` · `labelLg 14/20·600` · `labelMd 12/16·500`. Money/hero numbers: 28–36 · 800 (defined inline via tokens, standardized as `numberHero` *(target)*).

### 1.3 Spacing scale — `SPACING` (8-pt)

`xs 4 · sm 8 · gutter 12 · md 16 · lg 24 · xl 32`. Screen margin = `md`. Group ≤ 12, separate ≥ 24. Add a `2xl 40`, `3xl 48` *(target)* for large editorial gaps.

### 1.4 Grid system

Single fluid column on mobile; content is the grid. Horizontal safe margin `md (16)`. Multi-item rows use `gap` (`sm`/`gutter`), never fixed widths. Tablet: max readable content width **560–640dp**, centered, with the same margins (see §12).

### 1.5 Corner radius — `RADIUS`

`sm 4 · DEFAULT 8 · md 12 · lg 16 · xl 24 · full 9999`. Inputs/list-cards `lg`; hero/feature cards + pills `xl`; chips/toggles `full`; icon chips `md`.

### 1.6 Border scale

`hairline 1` (`borderLight`/`outlineVariant`) for separation; `emphasis 1.5` for outline buttons / focus / selection (green); never heavy or colored borders otherwise. *(Tokenize as `BORDER.hairline`/`BORDER.emphasis` — target.)*

### 1.7 Elevation & shadow — `SHADOWS`

Three levels only:

| Level | Token | Spec | Use |
|---|---|---|---|
| 0 Flat | — | none | on-surface content |
| 1 Raised | `SHADOWS.card` | y+4, blur 12, 8% black, elev 4 | cards, chips |
| 2 Overlay | `SHADOWS.active` | y+8, blur 20, 12% black, elev 8 | sheets, dialogs, FABs |
| (button) | `SHADOWS.button` | green-tinted, y+4 | primary CTA lift |

**Never stack shadows; never use shadow decoratively.**

### 1.8 Opacity tokens *(target — standardize)*

`disabled 0.5–0.6 · pressedOverlay 0.85 (activeOpacity) · scrim 0.28–0.55`. Prefer semantic text tokens over raw text opacity.

### 1.9 Blur tokens

Effectively **none** in-app (no glassmorphism). Reserved only for OS-level system UI. `GLASS` exists for legacy and must not proliferate.

### 1.10 Animation / motion tokens — `MOTION`

`duration {instant 90, fast 150, base 220, slow 320, slower 480}` · `easing {standard/decelerate/accelerate/emphasized}` (bezier control points) · `spring {press{18,260,0.6}, gentle{20,160,0.9}, bouncy{12,180,0.8}}` · `pressScale 0.97`. **No arbitrary durations/springs anywhere.**

### 1.11 Icon sizes *(target scale)*

`xs 14 · sm 16 · md 20 (default) · lg 24 · xl 28 · hero 40`. One family: **Ionicons** (outline idle / filled active); MaterialCommunityIcons only for vehicle glyphs.

### 1.12 Avatar sizes *(target scale)*

`sm 32 · md 40 · lg 48 · xl 64`. Circle (`full`), 1px `borderLight`, initials or icon fallback.

### 1.13 Illustration rules

Custom Smart Ride vector style (the `VehicleArt` marker family sets the tone): flat, top-down/angled, brand-colored, minimal. No 3D, stock, or mixed styles. Illustrations are palette-driven so states re-tint without new art.

### 1.14 Map tokens

Muted basemap; marker palette (§1.1 fixed set); route line = `primary` (brightened in dark), width 4, rounded caps; marker sizes `24/32/40(default)/56`; heading rotation bucketed to 15°; client dot = pulsing `#3B82F6`.

---

## Section 2 — Layout System

- **Max content width:** phone = full-bleed with `md` margins; tablet/foldable-open = **560–640dp** centered.
- **Mobile spacing:** horizontal `md (16)`; vertical rhythm group `sm–gutter`, separate `lg`.
- **Safe areas:** every screen is `useSafeAreaInsets`-aware; headers pad `insets.top`, sticky footers pad `insets.bottom`.
- **Header heights:** compact bar ≈ 56 + inset; large/editorial header ≈ 96–120. Title `headlineLg`.
- **Bottom navigation:** *(target)* Material-3 bar, height 64 + inset, 5 items max, animated active indicator, `labelMd`.
- **Status bar:** content-aware (`light-content` on dark heroes/maps, `dark-content` on light surfaces).
- **Cards/margins/padding:** cards use `Card` padding prop (`md` default); never nest cards inside cards.
- **Container hierarchy:** Screen → Section (`SectionHeader` + `lg` gap) → Card/Row → Content. Max 2 nesting levels of surface.
- **Scrolling:** one primary scroll per screen; horizontal scroll only for chip/rail rows; **body never scrolls horizontally**; wide content scrolls inside its own container.
- **Vertical/horizontal rhythm & alignment:** left-aligned text; single baseline grid; icons vertically centered to their label's cap height; numbers right-aligned in rows.

Every screen follows: **safe-area header → scroll(sections) → optional sticky primary CTA.**

---

## Section 3 — Surface System

| Surface | Token/impl | Elevation | Border | When used | When NOT |
|---|---|---|---|---|---|
| **Primary** | `surface` / `background` | 0 | none | screen background | as a card |
| **Secondary** | `surfaceContainerLow` | 0 | none/hairline | tonal fills, input backgrounds, chips | for primary content emphasis |
| **Elevated (Card)** | `Card variant="raised"` (`backgroundElevated`) | 1 (`card`) | hairline in low-contrast | grouped content, list cards | full-screen backgrounds |
| **Flat (Card)** | `Card variant="flat"` | 0 | optional hairline | inline groupings on tinted bg | when separation is needed |
| **Floating (FAB)** | round `active` shadow | 2 | none | map actions, SOS | as a content container |
| **Map** | `SmartRideMap` | base layer | none | the map workspace | behind functional text |
| **Overlay (Card)** | `Card variant="overlay"` | 2 | none | sheets/dialog bodies | inline |
| **Modal / Dialog** | `feedback` SmartRideModal | 2 + scrim | none | confirmations, alerts | for non-blocking info (use toast) |
| **Bottom Sheet** | sheet pattern (rounded 26 top, grabber) | 2 + scrim | none | incoming request, pickers, contextual | for full forms better as screens |
| **Interactive** | `Card onPress` / `GradientButton` | 1, press→0.97 | per variant | any tappable surface | static content |

Rules: elevation only *increases* with interactivity/overlay depth; borders appear only where shadow alone can't separate (low-contrast/dark); surface color comes from tokens, never inline hex.

---

## Section 4 — Component Architecture

Each component defines: **purpose · variants/sizes · states · spacing · behavior · a11y · animation · when NOT to use.** Current export names are given; *(target)* marks the canonical rename to adopt during migration. **One family — no one-off UI.**

### Buttons — `GradientButton` → **`Button`** *(target)*
- **Purpose:** the only button. **Variants:** `primary` (green hero gradient), `secondary` (tonal), `outline` (green ring), `danger` (red gradient). **Sizes:** `sm/md/lg`. **States:** default, pressed (`scale 0.97`, `MOTION.spring.press`), loading (spinner, label hidden), disabled (0.5–0.6). Success state *(target)* = brief check morph.
- **Spacing/typography:** `labelLg`; `lg` min-height 56, `md` ≈ 48, `sm` ≈ 40; icon gap `sm`.
- **A11y:** `role=button`, label, `state{disabled,busy}`; ≥48dp.
- **When NOT:** navigation rows (use list item), toggles (use Switch), text links (use inline link).

### Cards — `Card` (canonical; `GlassCard` delegates)
- **Purpose:** the one card system for all card content. **Variants:** `flat/raised/overlay`. **Props:** `padding`, `radius`, `onPress`, `noBorder`. **States:** static; if `onPress` → pressed (`0.97`). **When NOT:** as a full-screen background; nested inside another card.
- **Domain cards are compositions of `Card`,** not new base components: `RideCard`, `MerchantCard`/`RestaurantCard`, `OrderCard`, `ReceiptCard`, `WalletCard`, `HealthProviderCard`, `DriverCard`, `NotificationCard`, `StatCard` — each = `Card` + a defined content layout (icon/leading, primary line, secondary line, trailing status/amount). *(These content layouts are specced per domain during migration; they never re-implement surface/shadow/press.)*

### Inputs — `IconInput` + field pattern → **`TextField`/`SearchInput`/`PasswordField`/`PhoneField`** *(target family)*
- **Purpose:** all text entry. **Anatomy:** label (`labelLg`) → field (leading icon, 16px text, right-icon slot) → helper/error (`bodySm`). **States:** default, focused (green ring), filled, disabled, error, loading. **A11y:** label association, error announced, 48dp. **When NOT:** single-choice (use Chips/Radio), on/off (Switch).

### OTP — **`OtpField`** *(target)*: segmented boxes, auto-advance, paste, error shake-free (color only).

### Dropdown / Picker — **`Select`/`Picker`** *(target)*: opens a bottom sheet of options (not a native menu), single-select radio rows.

### Checkbox / Radio / Switch
- **Checkbox** (terms, multi-select): square, `md` radius, green when checked, label row tappable.
- **Radio** (single-select rows): green filled dot; whole row is target.
- **Switch** → **`Toggle`/`OnlinePill`**: animated pill (spring knob, `instant`), **never** bare RN `<Switch>`.

### Tabs / Segmented — **`SegmentedControl`** *(target)*: full-radius, active = filled green + `onPrimary`.

### Chips / Tags — **`Chip`** *(target)*: full-radius pill; selectable (filter/category) or static (tag); active filled green.

### Navigation — **`AppHeader`**, **`BottomNav`** *(target)*: see §7.

### Bottom Sheets — **`SmartBottomSheet`** *(target)*: rounded-26 top, grabber, `slow`+`gentle` motion, scrim, drag-to-dismiss. Presets: request sheet, picker sheet, action sheet.

### Dialogs / Snackbars / Toasts — `feedback` (`Alert` drop-in, `toast`, `SmartRideModal`, `SmartRideToast`, `FeedbackHost`) → **`SmartDialog`/`SmartToast`** *(target)*
- **Purpose:** the **only** alert/dialog/toast system. Types inferred: success/warning/error/info. Blocking = dialog; non-blocking = toast. **Raw `Alert.alert` is banned.** See §9.

### Search — **`SearchInput`** *(target)*: leading icon, inline clear, debounced remote + instant local; designed empty/no-results.

### List Items — **`ListRow`** *(target)*: leading icon/avatar → primary line → secondary line → trailing (chevron/badge/amount); whole row ≥48dp tappable.

### Avatars — **`Avatar`** *(target)*: sizes §1.12; image/initials/icon fallback.

### Ratings — **`Rating`** *(target)*: star + tabular number (`4.96`), `warning` star color.

### Badges / Status — `StatusBadge`: pill, semantic color in, never inline hex. Numeric notification badge *(target `CountBadge`)*.

### Notifications — `NotificationCard` = `Card` + icon + primary/secondary + timestamp + unread dot.

### Loading — `Skeleton` (+ presets `TaskSkeleton`, `OrderSkeleton`, `NotificationSkeleton`, `ConversationSkeleton`): shimmer, `base` loop.

### State views — `StateViews` (`EmptyState`, `ErrorState`, `SectionHeader`): the one empty/error/section-header layout.

### Map — `SmartRideMap`, `VehicleMarker`, `VehicleArt`: see §5.

### Misc existing → keep/rename: `OfflineBanner`, `ServiceIcon`, `GlowHeader` *(fold into `AppHeader`)*, `TopUpModal`/`WithdrawModal` *(recompose on `SmartBottomSheet`)*, `ConfirmDialog` *(fold into `SmartDialog`)*.

---

## Section 5 — Map Design System

Components: `SmartRideMap` (container), `VehicleMarker` + `VehicleArt` (providers), POI markers, route layer, sheets, FABs.

- **Vehicle markers:** the vehicle *is* the marker (boda/car/delivery/errand/parcel), one style per entity; sizes `24/32/40/56`; glide between fixes (rAF), ease-rotate to heading (15° buckets, shortest arc), soft shadow, states available/assigned(glow)/on-trip(dark)/offline(grey)/poor-gps(faded); remove instantly on offline.
- **Pickup marker:** green flag `#10B981`. **Destination marker:** red flag `#EF4444`. **User location:** **blue pulse `#3B82F6` only** (reserved).
- **Clusters** *(target)*: for dense provider pools, a branded count chip that expands on zoom; never generic cluster bubbles.
- **Routes:** single green polyline, width 4, rounded caps/joins; brightened in dark.
- **Traffic / driver path / heat zones:** low-opacity tints that never obscure the route (data-gated; never fabricated).
- **ETA / pickup / destination / driver-info cards:** live in `SmartBottomSheet`/`Card` overlays, one focal action.
- **Floating controls / Map FABs:** consistent bottom-right cluster (recenter, messages, **SOS always danger-red & reachable**).
- **Search overlay:** `SearchInput` + recents/popular/pick-on-map.
- **Live tracking:** camera eases to follow; updates via existing socket/location infra (no fake movement).
- **Loading / offline:** skeleton/placeholder for the map card; `OfflineBanner` + graceful fallback (never a blank map).

---

## Section 6 — Form System

- **Fields:** `TextField`, `PasswordField` (eye toggle), `PhoneField` (+256 prefix, numeric), `OtpField`, `SearchInput`, `Select`/date & address pickers (bottom-sheet based), document/image upload tiles.
- **Anatomy & spacing:** label `labelLg` (8 below) → field (height 48–54, radius `lg`, leading icon, `md` horizontal) → helper/error `bodySm` (4 above). Fields separated by `md`.
- **States:** default · focused (green `emphasis` ring) · filled · disabled (0.5) · **error** (error ring + message, **color/text only, no shake**) · loading (inline spinner) · completed (subtle check). Green appears **only** when active/valid.
- **Validation:** on blur and on submit — **never per keystroke** (prevents Android cursor jump and anxiety). Show one error at a time, nearest the field.
- **Keyboard behavior:** `KeyboardAvoidingView`; primary CTA stays reachable above the keyboard; `returnKeyType` chains fields; dismiss on scroll where appropriate; never trap the cursor.
- **Upload:** tile with icon → progress → thumbnail/filename → replace/remove; states empty/uploading/done/error.
- **A11y:** labels associated; errors announced; 48dp targets; respects font scaling.

---

## Section 7 — Navigation System

- **Bottom tabs** *(target `BottomNav`)*: Material-3 bar for Client and Rider shells — Home / Trips / Orders / Wallet / Account (client) and equivalents; 5 max; animated indicator; `labelMd`; safe-area padded.
- **Stacks & nested navigation:** Expo Router file-based; each service is a stack; details push, sheets present modally.
- **Headers** *(target `AppHeader`)*: compact (back + title + one action) or large/editorial; safe-area aware; consistent back affordance (`arrow-back`).
- **Back behavior:** predictable — hardware/gesture back mirrors the header back; multi-step flows step back one stage (not out of the flow) until the first step.
- **Search behavior:** inline `SearchInput` in list headers; full-screen search for complex address flows.
- **FAB behavior:** contextual, bottom-right, above sticky content; SOS FAB persists on operational screens.
- **Context menus:** as action bottom sheets, not native long-press menus (discoverable alternative always exists).
- **Deep links:** every primary screen addressable; auth-gated links resolve post-login to the intended target.
- **Modal navigation & transitions:** sheets rise (`slow`); screens push contextually; dialogs fade+scale (`fast`); never a random slide.
- **Hierarchy:** Tab → Stack → Screen → Sheet/Dialog. One primary action per level.

---

## Section 8 — Motion System

All values come from `MOTION` (§1.10). Never arbitrary.

| Interaction | Duration | Curve/Spring |
|---|---|---|
| Button/card press | `instant` | `spring.press` (→0.97) |
| Fades / small state | `fast` | `standard` |
| List item / card enter | `base` | `decelerate` (stagger ≤ 40ms, cap ~240ms) |
| Bottom sheet in/out | `slow` | `gentle` |
| Dialog in | `fast` | `standard` + slight scale |
| Screen transition | `base–slow` | contextual (push/present/crossfade) |
| Map camera | `slow–slower` | `standard` |
| Marker move/rotate | continuous | rAF glide + shortest-arc ease |
| Loading skeleton | `base` (loop) | `standard` |
| Pull-to-refresh | native | native |
| Success | `fast` | single confirmation |
| Error | `fast` | color/slide, **no shake** |

Budget: 60fps; transform/opacity only; few concurrent; respects Reduce Motion (→ fades/instant); drop animation before responsiveness.

---

## Section 9 — Feedback System

One family via `feedback` (`SmartDialog`/`SmartToast` *(target)*). Blocking vs non-blocking is the key decision; **no generic system dialogs**.

| Pattern | Surface | Tone | Notes |
|---|---|---|---|
| Success | toast (or inline check) | brief, celebratory | non-blocking; ~2s |
| Warning | dialog or toast | steady | attention without alarm |
| Error | dialog (blocking) / banner | calm, actionable | states what + one next step (Retry) |
| Loading | skeleton / inline spinner | neutral | optimistic where safe |
| Confirmation | `SmartDialog` | clear primary/secondary | all destructive/costly actions |
| Permission | pre-prompt dialog → OS prompt | explain value first | in context, at point of need |
| Progress | inline / sheet | neutral | uploads, multi-step |
| Network / Offline | `OfflineBanner` + retry | reassuring | never a dead end |
| Payment | `SmartDialog` confirm + result | precise, trustworthy | amounts + method explicit |
| Ride accepted / cancelled | sheet/toast + haptic | clear status | mirror on both actors |
| Order ready | notification + toast | brief | |
| SOS | full, high-contrast, danger-red | urgent, minimal steps | reachable everywhere |

Every feedback element is theme-aware, uses semantic status color + an icon (color-independent), and follows the same layout.

---

## Section 10 — Content System

- **Titles/headings:** `headlineLg`/`headlineMd`; sentence case; short.
- **Body/description:** `bodyMd` default; `bodySm` secondary.
- **Captions/metadata/timestamps:** `labelMd`, `onSurfaceVariant`.
- **Numbers:** tabular; never smaller than their label.
- **Currency:** `UGX 1,234` — always the `UGX` prefix, thousands separators, no decimals for whole shillings; positive/credit may use `+` + green, debit `-` + neutral.
- **Time:** relative for recency ("2 min ago"), absolute for records ("Jul 21, 3:04 PM").
- **Distance/ETA:** `1.2 km`, `~3 min`; never bare numbers.
- **Receipts/cards/notifications:** primary line (name/amount) + one secondary line (address/date/status); max two type sizes per card.
- **Buttons:** verb-first, ≤ 3 words ("Go Online", "Top Up", "Confirm ride").
- **Maps:** place names as-provided; labels concise.
- **Voice:** plain, human, local; never blame the user; never hype.

---

## Section 11 — Accessibility

- **Contrast:** body AA 4.5:1, large/UI 3:1, both themes, over scrims.
- **Touch targets:** ≥48×48dp; whole rows tappable.
- **Type scaling:** honor Dynamic Type; reflow; cap multiplier ≤1.3 only on dense controls; never on content.
- **Motion reduction:** honor Reduce Motion (fades/instant).
- **Screen readers:** labels + roles on all actionable elements; announce status changes; label/ hide images.
- **Focus order:** logical top-to-bottom, left-to-right; visible focus (green) on inputs.
- **Outdoor readability:** high-contrast defaults, generous type, avoid low-opacity greys for essential text.
- **Color independence:** meaning always paired with icon/shape/text.
- **One-handed:** primary actions in the bottom thumb zone.

Every component ships with its a11y contract met (see §4/§15).

---

## Section 12 — Responsiveness

- **Small phones (≤360dp):** `md` margins hold; reduce hero type one step; ensure CTAs fit.
- **Large phones:** default target.
- **Foldables (open) / Tablets:** center content at **560–640dp**; two-pane *(target)* for list+detail where it aids the task; never stretch single-column full-bleed.
- **Landscape:** operational/map screens adapt (map beside panel); forms remain single-column centered; sticky CTAs stay reachable.
- **Split screen:** layouts reflow to the smaller width gracefully; no clipped controls.
- **Adaptive rule:** breakpoints are content-driven (readability), not device lists; use `useWindowDimensions`/insets, not hardcoded sizes.

---

## Section 13 — Performance Guidelines

- **Component complexity:** shallow trees; memoize `createStyles(COLORS)` and expensive children; avoid deep nesting.
- **Rendering cost:** virtualize long lists (`FlatList` with `keyExtractor`, stable keys, `getItemLayout` where possible); avoid re-render storms (stable callbacks, split state).
- **Animation budget:** transform/opacity only; ≤ a few concurrent; no `LayoutAnimation` on large lists; Reanimated on the UI thread.
- **Images:** sized explicitly (see welcome-hero density note); cache; prefer vector; compress hero photos.
- **SVG usage:** vector markers/illustrations via `react-native-svg`; cache; don't re-mount per frame (marker glide re-keys by slot, not remount).
- **Caching:** show last-known data instantly, refresh in background; pull-to-refresh for manual.
- **Map rendering:** capped nearby pools (≤8), bucketed heading, MarkerView for the small animated set, ShapeSource+SymbolLayer *(target)* for large-scale.
- **Battery/data:** dark mode for night/OLED; sane location cadence (5s/10m); avoid needless fetches; assume metered data.
- **Low-end Android:** the 60fps floor is responsiveness — drop effects, never interactivity; test on a 3-4-year-old device.

---

## Section 14 — Component Naming Convention

**PascalCase, purpose-first, family-grouped.** Canonical names (adopt during migration; current export in parentheses):

- Buttons: `Button` (`GradientButton`) — variants via prop, not `PrimaryButton`/`SecondaryButton` classes.
- Cards: `Card`; domain compositions `RideCard`, `MerchantCard`, `RestaurantCard`, `OrderCard`, `ReceiptCard`, `WalletCard`, `HealthProviderCard`, `DriverCard`, `NotificationCard`, `StatCard`.
- Inputs: `TextField`, `PasswordField`, `PhoneField`, `OtpField`, `SearchInput`, `Select`, `DatePickerField`, `AddressField`, `UploadField`.
- Selection: `Checkbox`, `Radio`, `Toggle`/`OnlinePill`, `SegmentedControl`, `Chip`.
- Structure: `AppHeader`, `SectionHeader`, `ListRow`, `Avatar`, `Rating`, `StatusBadge`, `CountBadge`.
- Overlays: `SmartDialog`, `SmartToast`, `SmartBottomSheet`, `SmartSnackbar`.
- Feedback/state: `EmptyState`, `ErrorState`, `LoadingSkeleton` (`Skeleton`), `OfflineBanner`.
- Map: `SmartRideMap`, `VehicleMarker`, `VehicleArt`, `PoiMarker`, `RouteLayer`, `MapFab`, `RideTimeline`.

**Rules:** no abbreviations; no version numbers in names; variants/sizes are props (`variant`, `size`), never separate components; one component = one file; barrel-exported from `@/src/components`.

---

## Section 15 — Engineering Rules

1. **Never hardcode** colors, spacing, radii, shadows, durations, springs, font sizes — **consume tokens** (`COLORS`, `SPACING`, `RADIUS`, `SHADOWS`, `TYPOGRAPHY`, `MOTION`).
2. **Never duplicate a component** — if it exists, use it; if it nearly exists, extend it via props.
3. **Never create one-off UI** — screens are assembled from primitives; a screen's `StyleSheet` should hold layout only (flex/gap/positioning), not new visual language.
4. **Always compose** existing primitives (`Card`, `Button`, inputs, `SmartDialog`, `StateViews`).
5. **Always theme-aware:** resolve `COLORS = makeThemedColors(isDark)`; `styles = useMemo(() => createStyles(COLORS), [COLORS])`.
6. **No raw `Alert.alert`** — use `feedback`.
7. **Real data only** — no mock riders/stats; designed empty/loading/error instead.
8. **A11y is part of "done":** label, role, 48dp, contrast, font-scale.
9. **Motion via tokens; press feedback via the shared `pressScale`.**
10. **Typecheck clean; no dead code; no broken imports** before commit.
11. **A token/primitive change must improve every screen at once** — that is the point.

---

## Section 16 — Migration Strategy (safest order, minimizes rework)

Fix the root first so every screen inherits the fix; migrate leaves last.

1. **Design tokens** — colors, type, spacing, radius, shadows, **motion**. *(Done; add target tokens: opacity, border, icon/avatar scales, `2xl/3xl` spacing.)*
2. **Theme provider** — `makeThemedColors` consumption everywhere; retire the static `COLORS` import in remaining screens.
3. **Typography** — route all text through `TYPOGRAPHY` tokens.
4. **Buttons** — `GradientButton`→`Button` (press-scale done); audit call sites.
5. **Cards** — finish unifying bespoke cards into `Card`; build domain card compositions. *(Wallet, restaurants done.)*
6. **Inputs** — consolidate the field family; sweep auth/checkout/profile/upload.
7. **Dialogs** — `SmartDialog` family; audit every confirm/alert.
8. **Bottom sheets** — `SmartBottomSheet`; recompose Top-Up/Withdraw/request sheets.
9. **Navigation** — `AppHeader` + `BottomNav`.
10. **Maps** — extend marker system to ETA/pickup/destination/nav cards + sheets.
11. **Shared components** — `ListRow`, `Avatar`, `Rating`, `Chip`, `SegmentedControl`, `StatusBadge`/`CountBadge`.
12. **Individual screens** — one flow at a time: **Wallet → Food → Shopping → Health → Merchant → Pharmacist → Chat → Notifications → SOS/Calling** *(Wallet + Food done)*.
13. **Feature modules** — dispatch/tracking/receipts consume the unified components.
14. **Entire app** — remove legacy (`GlassCard` glass path, `GlowHeader`, `ConfirmDialog`) once callers migrate.

Each step is typecheck-clean and (ideally) device/emulator-verified before the next. **Never migrate a screen twice** — migrate its primitives first.

---

## Section 17 — Future Governance

- **Introducing a component:** allowed only when no existing primitive can express the need via props. New components must ship token-driven, theme-aware, motion-wired, a11y-complete, barrel-exported, and added to §4/§14.
- **Evolving a component:** change via props/variants, backward-compatible; breaking changes require a migration note and a call-site sweep in the same PR.
- **Deprecation:** mark deprecated in the barrel + doc, keep a delegating shim for one release, remove after all callers migrate (as `GlassCard`→`Card` demonstrates).
- **Versioning:** this spec is **v1.0**; semantic bumps — patch (clarify), minor (add tokens/components), major (change a foundation). Record changes at the top.
- **Documentation:** every token/component has a one-line purpose here; the Design Language (`SMART_RIDE_DESIGN_SYSTEM.md`) explains the *why*, this spec the *what/how*.
- **Contribution rules:** PRs touching UI must (a) consume tokens, (b) compose primitives, (c) pass typecheck, (d) include a11y, (e) not introduce one-off styles; reviewers reject hardcoded values and duplicate components.
- **AI implementation rules:** an AI building a Smart Ride screen must read this spec + the Design Language, use only listed tokens/components, invent **no** new styles/colors/animations, produce real-data states (empty/loading/error), and match naming — if a needed primitive is missing, it proposes it here first rather than creating a one-off.
- **Review process:** design-system changes get a second reviewer; a quarterly audit checks for drift (hardcoded values, duplicate components, un-migrated screens) and updates the migration status.

**Anti-fragmentation principle:** the system stays coherent only if the *root* (tokens + primitives) is the single place visual decisions live. Every contributor's job is to push change down to the root, not out to the leaves.

---

*This specification is the implementation blueprint for Smart Ride's next phase. It is derived entirely from the approved Design Language and must remain consistent with it. When in doubt: consume tokens, compose primitives, and if it isn't specified here, specify it here before building it.*
