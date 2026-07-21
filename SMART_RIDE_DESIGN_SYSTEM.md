# Smart Ride — Product Design System 2026

**Status:** Source of truth · **Scope:** Every Smart Ride surface (mobile app, rider/driver, merchant, pharmacist, admin companion) · **Audience:** designers, engineers, and AI assistants building Smart Ride.

This document is a **specification, not code**. It defines what Smart Ride should look like, how it should behave, and *why*. Where it states a concrete value (a hex code, a duration, a radius) that value is the one already implemented in the app's token layer (`expo-app/src/constants`, `expo-app/src/theme/themedColors.ts`) — the system described here is real, not aspirational. The short quick-reference lives in `expo-app/DESIGN_LANGUAGE.md`; this is the long form.

> **Golden rule:** Premium is achieved by *removing friction*, not by adding effects. Every decision below should be defensible by "this makes the product calmer, clearer, faster, or more trustworthy." If a choice only makes it *prettier*, question it.

---

## Section 1 — Product Philosophy

**What Smart Ride represents.** Smart Ride is the everyday operating system for getting things done in an African city — moving people, food, parcels, shopping and medicine — delivered with a level of polish people usually associate with the world's best software, not with local transport apps. It is a tool people rely on when something matters (getting to work, feeding a family, reaching a pharmacy), often outdoors, on mid-range phones, on patchy networks, sometimes in a hurry or under stress.

**What users should feel — and why.** In priority order:

1. **Safe.** People put their bodies, money and time in Smart Ride's hands. Safety (SOS, driver identity, live tracking, secure payments) must be *felt*, not buried. This is the emotional foundation everything else sits on.
2. **Calm & confident.** A ride-hailing screen is often used under mild stress (running late, unfamiliar area). The UI must *lower* the user's heart rate: one clear thing to do, generous space, no visual noise, no surprises. Confidence comes from predictability.
3. **Fast.** Perceived speed is a feature. Instant press feedback, optimistic updates, skeletons over spinners, and a map that never blocks the flow. Slowness reads as unreliability.
4. **Trustworthy.** Clear pricing, honest system status, no dark patterns, no hidden actions. Trust is the currency of a payments + safety product.
5. **Human & local.** Warm, plain language; Ugandan context (UGX, +256, MTN/Airtel, boda culture, local place names); never cold or corporate. Smart Ride should feel like it was *built here*, not localized from elsewhere.
6. **Premium & intelligent.** Quiet quality — excellent typography, restraint, thoughtful micro-interactions — plus smart defaults that reduce work (remembered addresses, sensible payment defaults, nearest-driver ETA).
7. **Accessible.** Large tap targets, high contrast, readable outdoors in sun, usable one-handed and at large font sizes. Premium that only works for the young and able-bodied isn't premium.

**The emotional arc.** Open → *"I know exactly what to do."* Act → *"That responded instantly."* Wait → *"I can see what's happening."* Finish → *"That was effortless, and I trust what just happened to my money and my time."*

---

## Section 2 — Product Design DNA

Smart Ride is a **multi-service ecosystem that must feel like one product.** The DNA is what keeps Boda, Car, Food, Shopping, Health, Merchant and Wallet from feeling like seven different apps.

**What makes Smart Ride instantly recognizable:**

- **The deep Ugandan green** (`#005f3a`) used with *restraint* — as the voice of action and safety, never as wallpaper. Green means "go / confirmed / you." Competitors lean on black, red, or bright blue; Smart Ride owns a confident, natural green.
- **The Smart Ride marker family** — the vehicle *is* the marker (illustrated boda, car, delivery), never a generic pin. The map reads as Smart Ride at a glance.
- **Content-first, map-as-workspace** layouts: the map supports the task, it never dominates the screen "because it's a map app."
- **Calm surfaces:** near-white light mode, soft single-layer shadows, one hero gradient per screen at most, real whitespace.

**How Smart Ride differs from traditional transport apps:**

- It is **operational, not decorative.** Every screen answers "what do I do / what's happening" before it tries to look good.
- It is **one language across services.** A card in Food looks and behaves like a card in Health and Wallet.
- It **respects the network and the device.** Designed for 3G and 4-year-old Androids first, then made to shine on flagships — not the reverse.

**How African mobility shapes the experience:** boda-first (bikes are the default city ride, cars are premium); cash *and* mobile money are first-class, not afterthoughts; place-name ambiguity is expected (fuzzy address search, pick-on-map); intermittent connectivity is normal (offline banner, ret/refresh everywhere, optimistic UI). The product assumes a rider weaving through Kampala traffic and a client standing on a busy roadside — not a calm office.

**How users remember Smart Ride:** *"It just works, it feels safe, and it feels like ours."*

---

## Section 3 — Brand Personality

Smart Ride behaves like a **calm, competent professional who happens to be local and warm** — the driver you trust, not the flashy salesperson.

- **Voice:** plain, direct, human. "Go online to start earning." "You're offline." "We couldn't reach the network — try again." Never jargon, never hype, never blame the user.
- **Tone:** reassuring in safety/error moments, celebratory but brief in success moments, quiet the rest of the time. Match the user's emotional state — steady when they're stressed.
- **Visual personality:** confident minimalism. Big clear type, generous space, one focal point per screen, green reserved for action. Photography is warm, real, and local (golden-hour Kampala, real boda riders), never stock-generic.
- **Interaction personality:** *responsive and unsurprising.* Everything acknowledges a touch immediately; nothing moves without reason; destructive actions always confirm; the system always says what it's doing.
- **Behavior:** anticipates (smart defaults, remembered choices), protects (confirmations, SOS always reachable), and stays out of the way (progressive disclosure — ask for the next thing only when it's needed).

If Smart Ride were a person: a seasoned, unflappable Ugandan professional — precise, warm, never showy, always has your back.

---

## Section 4 — Visual Language

The visual system is **Material 3 foundations, tuned to a calmer, more editorial, distinctly Smart Ride expression.** Rules:

- **Layout rhythm & grid.** Everything sits on an **8-point spacing system** (see §6/tokens): `xs 4 · sm 8 · gutter 12 · md 16 · lg 24 · xl 32`. Screen horizontal margin is **16** (`md`). Vertical rhythm groups related content tightly (8–12) and separates sections generously (24). Content is the grid; avoid rigid columns on mobile.
- **Hierarchy & whitespace.** One primary focal point per screen. Establish hierarchy with **size and weight first, color second, never with boxes-inside-boxes.** Whitespace is a feature — when in doubt, add space, don't add lines.
- **Elevation & depth.** Depth is **subtle and single-layered.** Three elevation steps only: flat (0, on-surface content), raised (cards — soft shadow `y+4, blur 12, 8% black`), and overlay (sheets/dialogs — `y+8/−6, blur 16–20`). Never stack shadows; never use shadow as decoration.
- **Surface treatment.** Light mode is **near-white** (`#f8f9fa` background, white cards). Dark mode is a **warm near-black green-grey** (`#191c1d`), not pure black. Cards are solid surfaces with a hairline border in low-contrast contexts — *not* frosted glass (see Anti-Patterns).
- **Corner radius.** Consistent and generous: inputs/list-cards **16** (`lg`), hero/feature cards and pills **24** (`xl`), chips/toggles **full**. Icon chips **12–15**. Never mix many radii on one surface.
- **Opacity / transparency / blur.** Used sparingly and purposefully: scrims over photography, disabled state (0.5–0.6), secondary text (via dedicated tokens, not raw opacity where a token exists). **No pervasive glassmorphism.**
- **Color usage.** Green = action/active/you. Neutrals carry 90% of the UI. Status colors appear only on status. See §5.
- **Gradient usage.** **At most one gradient per screen,** reserved for a hero moment (wallet balance, primary CTA, splash). Two brand gradients exist: `primary [#005f3a → #0e7a4d]` and `danger [#ba1a1a → #93000a]`. Never gradient a whole background or every card.
- **Borders.** Hairline (1px) `borderLight` for separation on low-contrast surfaces; avoid heavy or colored borders except for focus/selection (green).
- **Iconography.** **One family only — Ionicons (outline for idle, filled for active/emphasis)**, with MaterialCommunityIcons permitted *only* for vehicle glyphs the primary set lacks. Never mix icon families within a screen. 20–24px standard, 40+ for hero/empty states.
- **Illustrations.** Custom Smart Ride vector style (the vehicle-marker family sets the tone): flat, top-down/slightly-angled, brand-colored, minimal. No 3D, no clip-art, no mixed styles.
- **Photography.** Warm, real, local, golden-hour; always with a green scrim so text stays legible and the shot dissolves into brand color (see the welcome hero). Photography is for emotional/marketing moments only — never behind functional content.
- **Map styling.** A muted, low-saturation basemap so Smart Ride markers and routes are the loudest thing on it (see §10).
- **Charts / data-viz.** Green as the primary series; neutrals for context; status colors only for status; no rainbow palettes, no 3D, no chart-junk.

---

## Section 5 — Color System

Smart Ride uses a **Material 3 tonal system** resolved per theme by `makeThemedColors(isDark)`. Screens consume *semantic tokens* (`COLORS.primary`, `COLORS.onSurface`, `COLORS.surfaceContainerLow`, …), never raw hex — that is what guarantees light/dark and future re-tuning without touching screens.

### Brand & core (implemented values)

| Role | Light | Dark | Meaning / when to use |
|---|---|---|---|
| **Primary (brand green)** | `#005f3a` | `#7cd9a4` | Actions, active states, "you", confirmation. The single most important color. |
| Primary container | `#0e7a4d` | `#005231` | Hero gradient end, tonal fills. |
| **Secondary** | `#006e2f` | `#4ae176` | Secondary emphasis (still green — Smart Ride is a green brand, **no blue as brand**). |
| Background | `#f8f9fa` | `#191c1d` | App background (near-white / warm near-black). |
| Surface / cards | white | `#1e2120` | Card and sheet surfaces. |
| On-surface (text) | `#191c1d` | `#e2e3e1` | Primary text. |
| On-surface-variant | `~#6f7a71` | `#bfc9bf` | Secondary text, icons, captions. |
| Outline / border-light | `#bec9bf` / hairline | `#3f4941` | Dividers, input borders. |

### Status / semantic

| Role | Light | Dark | Use ONLY for |
|---|---|---|---|
| **Success** | `#006e2f` | `#4ae176` | Completed, online, paid, positive deltas. |
| **Warning** | `#F59E0B` | `#f9cd8e` | Pending, attention, low-battery, caution. |
| **Error / danger** | `#ba1a1a` | `#f2b8b5` | Failures, destructive actions, offline/critical. |
| Info | `#0e7a4d` | `#7cd9a4` | Neutral informational accents. |

### Map / vehicle palette (fixed across themes — brand recognition)

`Riders (boda/car/delivery) #16A34A` · `Errand runner #8B5CF6` · `Parcel/logistics #F59E0B` · `Pickup #10B981` · `Destination #EF4444` · `Your location (blue pulse) #3B82F6` · `Offline/inactive #94A3B8`. These are intentionally *not* theme-swapped: a green boda must read as a green boda in light or dark.

### Payment brand colors (used only on payment chips/badges)

`MTN #FFCB05 (mtnYellow)` · `Airtel #ED1C24 (airtelRed)` · `Visa #1A1F71` · `Cash → brand green`.

### Rules

- **The 90/7/3 rule:** ~90% neutrals, ~7% brand green, ~3% status. If a screen is mostly green, it's wrong.
- **Never** use status colors decoratively; a red thing means something is wrong.
- **Never** introduce blue as a brand color — blue belongs to the *client's own location* on the map and nowhere else.
- **Accessibility:** body text targets **WCAG AA (4.5:1)**; large text and UI elements **3:1**. The blue user-dot and status colors are always paired with an icon/shape so meaning survives color-blindness.
- **Dark mode is first-class**, not an inversion — it uses its own MD3 tonal ramp (brightened green, warm near-black), tuned for night riding and OLED battery.

---

## Section 6 — Typography

**Font family.** System sans (SF Pro on iOS, Roboto on Android) via the RN default, with **Inter** as the intended brand face where custom fonts are loaded — chosen for its neutrality, screen legibility at small sizes, and excellent numerals. One family across the whole product.

**Scale (`TYPOGRAPHY` tokens, implemented):**

| Token | Size / line | Weight | Use |
|---|---|---|---|
| displayLg | 32 / 40 | 700 | Screen-defining headlines (rare). |
| headlineLg | 24 / 32 | 700 | Screen titles ("Restaurants", "Wallet"). |
| headlineMd | 20 / 28 | 600 | Section headers, dialog titles. |
| bodyLg | 18 / 28 | 400 | Emphasis body, lead paragraphs. |
| bodyMd | 16 / 24 | 400 | **Default body.** Inputs, list content. |
| bodySm | 14 / 20 | 400 | Secondary text, metadata. |
| labelLg | 14 / 20 | 600 | Buttons, tabs, strong labels. |
| labelMd | 12 / 16 | 500 | Captions, chips, timestamps. |

Screen hero numbers (balance, earnings, fare) go larger (28–36, weight 800) — money and status are the loudest type in the product.

**Hierarchy rules:**

- Establish hierarchy with **weight and size**, not color. Green text is reserved for links/actions and money-positive amounts.
- Body copy is **16px minimum** for readability outdoors and at arm's length on a boda.
- **Numbers** (currency, ETA, distance, counts): tabular where possible, never smaller than the label they describe. Currency is always `UGX 1,234` (thousands separators, no decimals for whole shillings).
- **Maps/cards/receipts:** one weight step of contrast between primary line (name/amount) and secondary line (address/date). Never more than two type sizes in a single card.
- **Buttons/dialogs/forms:** `labelLg` for button text; field labels `labelLg` (700) above the field; helper/error text `bodySm`.
- **Consistency:** respect the user's OS font-scale (Dynamic Type); cap multipliers only where layout would break (≤1.3 on dense controls), never disable scaling on content.

---

## Section 7 — Motion Language

**Philosophy:** motion communicates *confidence and causality*, never decoration. Every animation answers "what changed and where did it come from." If an animation doesn't aid understanding, remove it.

**Tokens (`MOTION`, implemented):**

- **Durations (ms):** `instant 90` (toggles, chips, press) · `fast 150` (small fades/state) · `base 220` (buttons, cards, list items — the default) · `slow 320` (bottom sheets, expansions) · `slower 480` (full-screen / hero entrances).
- **Easing (bezier control points):** `standard [0.2,0,0,1]` (enter+move) · `decelerate [0,0,0,1]` (entering elements) · `accelerate [0.3,0,1,1]` (leaving elements) · `emphasized [0.2,0,0,1]` (expressive, still calm).
- **Springs:** `press {damping 18, stiffness 260, mass 0.6}` (button/card press) · `gentle {20,160,0.9}` (sheets settling) · `bouncy {12,180,0.8}` (playful accents — use sparingly).
- **Press scale:** `0.97` — the single shared press-feedback value; buttons and cards use it so a tap feels identical everywhere.

**Where motion applies:**

- **Buttons/cards:** press → spring to `0.97` and back (`MOTION.spring.press`). Instant, physical.
- **Navigation/transitions:** contextual — a detail slides from where you tapped; a sheet rises from the bottom; a tab crossfades. Never a random slide.
- **Bottom sheets:** rise with `slow` + `gentle` spring; drag-to-dismiss with velocity.
- **Dialogs:** fade + subtle scale-up (`fast`), never fly across the screen.
- **Loading:** skeletons shimmer (`base`, looped) — motion says "content is coming," not "please wait."
- **Success:** a brief, single confirmation (checkmark draw / toast slide) — celebrate once, then get out of the way.
- **Errors:** no jarring shakes; a calm banner slide + color, matching the user's stress with steadiness.
- **Maps:** camera eases (`slow`/`slower`); markers glide between GPS fixes and ease-rotate along the shortest arc (never teleport); the client dot pulses softly.
- **Scrolling:** native momentum only — never hijack the scroll.

**Budget:** target 60fps. Prefer transform/opacity (GPU) over layout animation; keep concurrently animating elements few; respect **Reduce Motion** (fall back to fades/instant). If a device can't hold 60fps, drop the animation, never the responsiveness.

---

## Section 8 — Interaction Language

Principles: **immediate acknowledgement, reversibility, and honest status.**

- **Press feedback:** every tappable surface responds within one frame (scale `0.97` + `activeOpacity`). No "dead" taps.
- **Long press:** reserved for secondary/power actions (e.g. message options); always discoverable elsewhere too — never the *only* way to do something.
- **Swipe:** used for natural gestures (dismiss sheet, back). Swipe-to-delete always pairs with an **Undo** snackbar — never destroy on a single swipe.
- **Drag:** bottom sheets and map pan; with momentum and snap points.
- **Pull-to-refresh:** available on every data list (green tint), the primary manual-refresh affordance.
- **Search:** modern single field with a leading search icon, inline clear (✕), instant local filtering, and debounced remote queries; empty and no-results states are designed, not blank.
- **Typing/forms:** green focus ring only when active; validate on blur, not on every keystroke; keep the submit button visible above the keyboard; never trap the cursor.
- **Selection:** single-select uses a filled green radio/segment; the whole row is the tap target (48dp min).
- **Confirmation:** destructive or costly actions (logout, delete, pay, cancel ride) always confirm via a branded dialog with a clear primary/secondary hierarchy — never a bare system alert.
- **Cancellation:** always available and obvious; cancelling is never punished with a hidden button.
- **Loading:** optimistic where safe (send message, toggle online) with rollback on failure; skeletons for content; spinners only for short, unavoidable waits.
- **Undo:** the default recovery pattern for reversible actions (snackbar, ~5s).
- **Error recovery:** every error states *what happened* and *the one thing to do next* (Retry / Try again), never a dead end.
- **Success feedback:** brief and singular (toast or inline check). Don't block the user to celebrate.
- **Permissions:** ask **in context, with a reason, right before the value** (e.g. request location when the user taps "Go online" / "Set pickup"), preceded by a branded pre-prompt explaining why — never a cold system dialog on launch.

---

## Section 9 — Component Library

Everything belongs to **one family** — same radii, spacing, shadow, motion, and semantic colors. Components are the contract; screens compose them and add no one-off styling.

**Foundations (implemented primitives):**

- **Button** (`GradientButton`): variants `primary` (green, hero gradient), `secondary` (tonal surface), `outline` (green ring), `danger` (red gradient); sizes `sm/md/lg`; built-in loading (spinner), disabled (0.5–0.6), and **shared press-scale** (`0.97`, `MOTION.spring.press`). No system-default buttons anywhere.
- **Card** (`Card`, canonical; `GlassCard` delegates to it): variants `flat / raised / overlay`; props `padding`, `radius`, `onPress` (adds the shared press-scale), `noBorder`. **One card system** for ride, merchant, restaurant, health, wallet, receipt, order, notification, stat cards. If a screen needs a "card," it uses this.
- **Input** (`IconInput` + inline field pattern): leading icon, label above (`labelLg`), 16px text, green focus ring, right-icon slot (eye/clear), helper/error line. Covers text, password, search, phone (+256 prefix), address.
- **OTP field:** segmented boxes, auto-advance, paste support (used by phone login).
- **StatusBadge:** pill for statuses (open/closed, online/offline, transaction status) — takes a semantic color, never inline hex.
- **Chips / segmented controls:** full-radius pills; active = filled green + `onPrimary` text; used for categories, filters, role sub-options.
- **Switch / toggle:** the **animated Online/Offline pill** (rider) and standard toggles — spring knob, `instant` timing, never a bare RN `<Switch>`.
- **Dialogs & toasts** (`feedback`: `Alert` drop-in + `toast`): **the only** dialog/alert system — branded confirmation/success/error/warning/permission dialogs and non-blocking toasts. Raw `Alert.alert` is banned.
- **Bottom sheets:** rounded top (26), grabber handle, `slow`+`gentle` motion; used for incoming ride request, pickers, contextual actions.
- **Skeletons** (`Skeleton` + presets): shimmer placeholders for every list/detail load.
- **State views** (`StateViews`: `EmptyState`, `ErrorState`, `SectionHeader`): one shared icon-circle + title + subtitle + CTA layout for empty/error everywhere.
- **Map + markers** (`SmartRideMap`, `VehicleMarker`/`VehicleArt`): see §10.
- **Service icon / avatar / list-row / header** patterns round out the family.

**Rule:** a new component is only created when no existing primitive can express the need; when created, it joins this list and is themed + motion-wired from day one.

---

## Section 10 — Map Experience

The map is the **workspace, not the wallpaper.** It supports the task and occupies the space the task needs (≈50–60% on operational screens like rider home; full-bleed only during active navigation).

- **Philosophy:** a muted, low-saturation basemap so Smart Ride's markers, routes and sheets are the loudest, most legible things on screen. The map never competes with the content.
- **Marker language — the vehicle *is* the marker.** No generic pins, no colored circles. One marker style per entity:
  - Smart Boda → illustrated green motorcycle · Smart Car → green sedan · Delivery → scooter/box · Errand → purple · Parcel → orange van.
  - **Client → blue pulsing dot only** (`#3B82F6`) — reserved exclusively for the user's own location.
  - POI → pickup (green flag `#10B981`), destination (red flag `#EF4444`), restaurant/pharmacy/shop with their glyphs.
- **Behavior:** markers **glide** between GPS fixes (rAF interpolation, no teleporting), **ease-rotate** to heading along the shortest arc, scale subtly while moving, cast a soft contact shadow, stay crisp at every zoom (vector), and disappear immediately when a provider goes offline. States: available / assigned (glow) / on-trip (darker) / offline (grey) / poor-GPS (faded).
- **Route visualization:** a single confident green polyline (brightened in dark mode), rounded caps/joins; traffic and heat-zones (when data exists) as low-opacity tints that never obscure the route.
- **Overlays & sheets:** driver info, ETA, pickup and destination live in **bottom sheets/cards** over the map — rounded, elevated, one focal action — never as floating clutter.
- **Floating controls:** a small, consistent FAB cluster (SOS, recenter, messages) bottom-right; SOS is always reachable and always danger-red.
- **Search:** the modern search field (§8) with recents, popular places, and pick-on-map for ambiguous addresses.
- **Live tracking:** camera eases to follow; ETA/status update in real time via the existing socket/location infra; the experience must feel Uber/Bolt-smooth without fabricating movement.

The map should be unmistakably Smart Ride within one second of looking at it.

---

## Section 11 — Screen Architecture

Reusable layout patterns so every screen type is predictable:

- **Home / operational (rider, client home):** compact top bar (greeting/identity + one status control + notifications) → map workspace with floating actions → **bottom operations panel** (live status, real earnings/stats, primary action). Information-first; the map serves the panel.
- **Lists (restaurants, orders, notifications, history):** title header → modern search → filter chips → `Card` rows in a `FlatList` → shared empty/error/skeleton states. Pull-to-refresh always.
- **Details (merchant, ride, order, receipt):** hero (image/summary) → grouped content sections (`SectionHeader` + cards) → sticky primary action at the bottom.
- **Maps / booking:** map + progressively-disclosed bottom sheet (pickup → destination → confirm), one decision per step.
- **Checkout (cart, top-up, payment):** ordered line items in one card → payment selection (chips) → clear total → single sticky primary CTA, disabled until valid.
- **Wallet:** balance hero (the one gradient) → primary actions → payment methods → transactions list → security note.
- **Settings / profile:** grouped list rows with icons, section headers, destructive actions clearly separated and confirmed.
- **Notifications / orders / receipts:** consistent `Card` rows with icon + primary/secondary line + status badge + timestamp.
- **Chat / calling:** message bubbles in one style; calling uses a full-screen calm layout with large, reachable controls.
- **SOS:** unmistakable, high-contrast, danger-red, minimal steps, reachable from every operational screen.
- **Merchant / pharmacy / admin companion:** same primitives, same tokens, denser information where the user is a professional — but never a "dashboard" of competing widgets; still one focal task per screen.

Architectural rules: one primary action per screen; sticky primary CTAs on task screens; safe-area aware headers/footers; horizontal body never scrolls; sections breathe (24) while their contents group (8–12).

---

## Section 12 — Accessibility

Non-negotiable, because Smart Ride is used outdoors, by everyone, on every device:

- **Touch targets:** ≥ **48×48dp**; whole rows are tappable, not just their icons.
- **Contrast:** body text AA (4.5:1), large text/UI 3:1; verify in both themes and against photography scrims.
- **Text scaling:** support OS Dynamic Type; layouts reflow; cap multipliers only on dense controls (≤1.3), never on content.
- **Screen readers:** every actionable element has an `accessibilityLabel` and role; status changes announce; images are labeled or decorative-hidden.
- **Motion reduction:** honor Reduce Motion — replace movement with fades/instant; never block a flow on an animation.
- **Color independence:** never encode meaning in color alone — pair with icon/shape/text (status badges, the blue dot, map states all follow this).
- **One-handed usage:** primary actions in the thumb zone (bottom third); reachable back and key controls; avoid top-corner-only critical actions.
- **Outdoor visibility:** high-contrast defaults, generous type, avoid low-opacity greys for essential text under sunlight.

---

## Section 13 — Premium Experience

Premium for Smart Ride is **quiet quality**, not visual effects. It shows up as:

- **Instant responsiveness** — every touch acknowledged in a frame; optimistic updates; no perceptible lag.
- **Predictability** — the same gesture does the same thing everywhere; no surprises; state is always clear.
- **Elegant restraint** — one focal point, one gradient, disciplined color; the confidence to leave space empty.
- **High-quality micro-interactions** — the online pill, the button press, the marker glide — small, consistent, physical.
- **Visual calm** — near-white surfaces, soft depth, real whitespace; the screen lowers the user's stress.
- **Professional typography** — a clear scale, tabular money, honest hierarchy.
- **Minimal cognitive load** — progressive disclosure, smart defaults, one decision at a time.

The test: remove everything you can until removing one more thing breaks the task. What remains, done impeccably, is premium.

---

## Section 14 — Performance Philosophy

Premium *is* fast — perceived and actual.

- **Perceived performance:** optimistic UI (send/toggle now, reconcile later); skeletons over spinners; render the shell instantly, hydrate data as it arrives.
- **Loading strategy:** show structure immediately; never a full-screen blocking spinner on a screen that has a known shape.
- **Caching:** cache last-known data (wallet balance, nearby drivers, profile) and show it instantly while refreshing in the background; pull-to-refresh for manual control.
- **Optimistic updates:** with clear rollback + a calm error if the server disagrees.
- **Realtime:** driver location, dispatch, and status update automatically over the existing socket/location infra — the user never refreshes to see reality.
- **Animation budget:** 60fps target; transform/opacity only; few concurrent animations; drop animation before responsiveness; respect Reduce Motion and low-end devices.
- **Map performance:** vector markers, capped nearby pools, glide via rAF (not per-frame remounts); never jank the map to add an effect.
- **Battery & data:** dark mode for night/OLED; sensible location cadence; avoid needless re-fetching; assume metered data.

---

## Section 15 — UX Principles

1. **Design for trust.** Money, safety, and time are on the line — clarity, honest status, and confirmation of consequential actions come before delight. *Trust is the product.*
2. **Reduce friction.** Every removed tap, field, and decision is a win. Smart defaults over choices.
3. **Never surprise the user.** Same input → same result, everywhere. No hidden state changes, no silent failures.
4. **One action at a time.** Progressive disclosure; a single primary action per screen; don't ask for step 3 during step 1.
5. **Always communicate system status.** Online/offline, loading, pending, success, error — the user should never wonder "did that work?"
6. **Prioritize clarity over cleverness.** If a plain label beats a clever icon, use the label.
7. **Respect user attention.** Notify only when it matters; celebrate briefly; don't interrupt a task.
8. **Design for Uganda first.** UGX, +256, MTN/Airtel/cash, local place names, boda-first, patchy networks, sunlight, mid-range phones — these are the defaults, not edge cases.
9. **Mobile-first, thumb-first.** Primary actions in reach; one-handed operation; content over chrome.
10. **Make it effortless.** The best interaction is the one the user didn't have to think about.

---

## Section 16 — Anti-Patterns (Smart Ride must never become)

- **Generic Material/Expo/RN default look** — default buttons, default alerts, default switches. Everything is Smart Ride's own family.
- **Pervasive glassmorphism / frosted everything** — one calm surface system, not blur-on-blur.
- **Gradients on every surface** — one hero gradient per screen, maximum.
- **Neumorphism, random/stacked shadows** — one subtle elevation system.
- **Oversaturated or rainbow color** — 90/7/3 discipline; status colors only on status.
- **Busy dashboards / competing focal points** — one primary action per screen; professionals get density, not chaos.
- **Inconsistent spacing / mixed radii / mixed icon families** — the tokens are the law.
- **Tiny tap targets, hidden actions, long-press-only actions** — ≥48dp, always discoverable.
- **Generic map pins / colored circles** — the vehicle is the marker.
- **Blue as a brand color** — blue is the client's own dot, nothing else.
- **Decorative or excessive animation** — motion earns its place by aiding understanding.
- **Fake data / mock riders / invented stats** — only real backend data; empty and loading states instead of fabrication.
- **Anything that reduces trust or usability** — the ultimate anti-pattern.

---

## Section 17 — Implementation Roadmap

Order chosen to **minimize rework** — fix the foundation once, and every screen inherits it. (Items 1–3 are already largely in place from recent work; the rest is the remaining sweep.)

1. **Core design tokens** — colors (`makeThemedColors`), typography, spacing, radius, shadows, **motion** (`MOTION`). *Done.* This is the root; screens must consume tokens, never hardcode.
2. **Component library** — Button (press-scale), **unified `Card`**, inputs, dialogs/toasts (branded `Alert` replacement — *done, raw Alert eliminated*), chips, badges, sheets, skeletons, state views. Finish unifying any remaining bespoke cards into `Card`.
3. **Navigation** — consistent headers, safe-area, back behavior, and (recommended) a Material-3 bottom navigation for the client and rider shells so every service sits in one frame.
4. **Dialogs** — confirm every consequential action flows through the branded dialog family (done for infra; audit call sites).
5. **Forms** — sweep all inputs to the `IconInput`/field pattern (auth, register, checkout, profile, document upload).
6. **Map experience** — vehicle markers + muted basemap + sheets (*done for markers*); extend to ETA/pickup/destination/nav cards.
7. **Shared layouts** — apply the §11 architectures as reusable screen scaffolds.
8. **Individual services** — migrate one flow at a time (order: **Wallet → Food → Shopping → Health → Merchant → Pharmacist → Chat → Notifications → SOS/Calling**), each verified on device/emulator before the next. *Wallet and Food (restaurants) are migrated; the rest follow.*

**Governance:** every new screen must (a) consume tokens, (b) compose existing primitives, (c) use branded dialogs, (d) show real data with designed empty/loading/error states, and (e) respect motion + accessibility budgets. A change to a token or primitive should improve every screen at once — that is the whole point of this system.

---

*This document is the source of truth. When a design or code decision is unclear, the answer is here or should be added here. Keep it current: the system is only as trustworthy as this file.*
