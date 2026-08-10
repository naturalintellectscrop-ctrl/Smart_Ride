# Smart Ride — Golden Screens (Phase 2.5 Prototype Reference)

**Status:** Permanent visual reference (specification form) · **Derived from:** [`SMART_RIDE_DESIGN_SYSTEM.md`](SMART_RIDE_DESIGN_SYSTEM.md) (Design Language) + [`SMART_RIDE_DESIGN_SYSTEM_SPEC.md`](SMART_RIDE_DESIGN_SYSTEM_SPEC.md) (Design System v1.0).

This document defines the **master screens** every future Smart Ride screen inherits from. When implementation starts, the question is never *"how should this look?"* but *"which Golden Screen does this inherit from, and which archetype?"*

**Form of this deliverable.** Per the phase constraints (no code, no React Native, no web components, no Tailwind, no mockups, don't optimize for screenshots), a golden "prototype" is expressed as an **engineering blueprint**: for each screen — the archetype it inherits, its component tree (using only the real Design-System primitives), and its interaction / motion / accessibility notes. No visual assets are produced; visuals are generated later *by implementing these specs*, which is exactly what guarantees they trace back here.

**Grounding.** Every component named is a real primitive (current export or `(target)` canonical name from the DS spec §4/§14). No new styles, colors, or animations are invented. No mock data shapes any layout — every screen defines its **empty / loading / error** states as first-class.

---

## Part A — Screen Archetypes (the true "masters")

Only **six archetypes** exist. Every one of the ~40 golden screens below is a composition of one archetype + domain content. This is what makes the system scale to 200+ screens: you maintain six layouts, not two hundred.

### AR‑1 · Brand Canvas
Full-bleed brand moment. Fixed hero (gradient or scrimmed photo) → logo → headline (`displayLg`/46) → supporting line → stacked CTAs (`Button` primary + secondary). Light status bar. **Used by:** Splash, Welcome.
- Motion: `FadeSlideIn` staggered (80/220/340/460ms), `slower` timing. No scroll.

### AR‑2 · Focused Form (card)
Centered scrollable card on `surface`. Logo/title block → error banner slot (always mounted, avoids layout shift) → fields (`TextField`/`PasswordField`/`OtpField`/`PhoneField`) → primary `Button` → divider → alternate actions → footer. **Used by:** Login, Registration, OTP, Forgot Password.
- Motion: field focus ring (`fast`); button press (`spring.press`). Keyboard-aware; validate on blur.

### AR‑3 · Operational Map
Compact `AppHeader` overlay → **map workspace ~55%** (`SmartRideMap` + markers + `MapFab` cluster) → **operations panel ~45%** (rounded-26 top, grabber, live status → real data → primary action). **Used by:** Client Home, Driver Dashboard, Active Ride, Booking flow (map stages).
- Motion: panel `SlideInUp`+`gentle`; markers glide/rotate; camera ease (`slow`).

### AR‑4 · List + Search
`AppHeader` (title) → `SearchInput` → `Chip` filter rail → `FlatList` of `Card` rows (domain card) → `EmptyState`/`ErrorState`/skeletons. Pull-to-refresh. **Used by:** Restaurants/Shopping/Health lists, Orders, Order Queue, Conversation List, Notification Center, Transaction History.
- Motion: rows `FadeInUp` staggered (`base`, cap 240ms); chip select (`instant`).

### AR‑5 · Detail + Sticky Action
Scroll: hero/summary → grouped `SectionHeader`+`Card` sections → **sticky bottom `Button`** (safe-area). **Used by:** Order Detail, Prescription Review, Merchant/Ride detail, Booking Confirmation, Receipts, Profile.
- Motion: sections `FadeInUp`; sticky CTA elevates on scroll.

### AR‑6 · Conversation
`AppHeader` (avatar + name + call/SOS actions) → message list (`ChatBubble`, inverted) → composer (input + attach + send). **Used by:** Chat conversation, Call entry.
- Motion: bubble enter (`fast`); optimistic send; typing indicator.

**Cross-cutting overlays** (not archetypes — they layer onto any screen): `SmartBottomSheet`, `SmartDialog`, `SmartToast`, `OfflineBanner`, SOS FAB.

---

## Part B — Golden Screen Specs

Format per screen: **Inherits** · **Composition** (component tree) · **States** · **Notes** (interaction / motion / a11y highlights). Only Design-System components appear.

### Authentication (establishes type, spacing, forms, branding, buttons, transitions)

**1. Splash** — *AR‑1.* Composition: `Brand hero (gradient)` → logo badge → wordmark → spinner. States: loading→auto-route (auth) or → Welcome. Notes: no interaction; brand-fixed (identical light/dark); `slower` fade; ≤1.5s perceived.

**2. Welcome** — *AR‑1.* Composition: scrimmed hero photo (`welcome-hero`, own-aspect, faded to `#062018`) → logo → "Your City, Your Way" → tagline → `Button primary` (Get Started→register) + `Button secondary` (Log In). Notes: photo has legibility scrim; CTAs in thumb zone; establishes headline scale + CTA hierarchy.

**3. Login** — *AR‑2.* Composition: logo/title → error slot → `TextField` (email/phone) → `PasswordField` (+ Forgot link) → `Button primary` (Login) → "OR" divider → `Button` (Continue with Google) + `Button` (Continue with Phone→OTP) → Sign Up link → secure footer. States: idle/validating/error/loading. Notes: **establishes the form archetype**; phone-like identifier routes to OTP; validate on blur; 48dp fields; keyboard-safe.

**4. Registration** — *AR‑2, 2-step progressive disclosure.* Step 1: name/email/phone/password/confirm + `Button` Continue + social. Step 2: grouped account-type selector (`Card` groups: Client / Rider→[Boda,Car,Delivery] / Business→[Merchant,Pharmacist]) with single-select `Radio`, `Checkbox` terms (links on key words), `Button` Create (disabled until agreed). Notes: **reference for progressive disclosure + grouped selection**; 2/2 progress bar; one decision per step.

**5. OTP Verification** — *AR‑2.* Composition: title + phone echo → `OtpField` (segmented, auto-advance, paste) → resend timer (`labelMd`) → `Button` Verify. States: entering/verifying/error/resend-cooldown. Notes: auto-submit on complete; error is color+message (no shake); reference for all code entry.

**6. Forgot Password** — *AR‑2 (minimal).* Composition: title/explain → `TextField` (email) → `Button` Send → back to Login. States: idle/sending/sent (success `SmartToast`)/error. Notes: single-purpose; clear success confirmation; no dead ends.

### Client Experience

**7. Client Home** — *AR‑3 (content-first variant).* Composition: `AppHeader` (greeting + location selector + notifications) → **wallet preview `WalletCard`** (balance + Top Up) → `SearchInput` ("Where to?") → **service selector** (`ServiceIcon` row: Ride/Food/Shop/Parcel/Health) → **map preview** with **nearby vehicle markers** (real `getNearbyDrivers`) → **promotions** rail (`Card` offers, real only) → `BottomNav` (Home/Rides/Orders/Wallet/Account). States: locating/loaded/no-drivers(empty markers). Notes: **establishes home hierarchy** — wallet + search + services above the fold, map supports; blue dot = self; promos never fabricated; `BottomNav` reference.

### Booking Flow (seamless, progressive)

**8. Location / Destination Search** — *AR‑4 over map (search overlay).* Composition: `SearchInput` (autocomplete, debounced) → recents/popular `ListRow`s → "Set on map" → results. States: empty/typing/results/no-results/error. Notes: reference for **address search + autocomplete**; pick-on-map for ambiguity; instant local + debounced remote.

**9. Pickup → Destination (map)** — *AR‑3.* Composition: map + center pin (or draggable) → bottom sheet route bar (pickup green / destination red) → Confirm. Progressive: pickup step → destination step. Notes: one decision per step; center-pin picker reports on idle.

**10. Ride Options + Fare + Payment** — *AR‑3 (confirm sheet).* Composition: `SmartBottomSheet`: vehicle options (`SegmentedControl`/option `Card`s: Boda/Car with fare + ETA) → `Chip`/`Select` payment (Cash/MoMo/Airtel/Wallet) → total → `Button` Confirm. States: calculating/ready. Notes: **reference for fare + payment selection**; real fares only; disabled until valid.

**11. Booking Confirmation** — *AR‑3 → dispatch.* Composition: "Finding your rider…" status card + cancel; on match → transition to Active Ride. States: searching/matched/no-riders/cancelled. Notes: honest live status; SOS reachable; cancel always available.

### Active Ride (reference for ALL real-time workflows)

**12. Active Ride** — *AR‑3 (live).* Composition: map (driver `VehicleMarker` gliding, route polyline, client dot) → **driver info `DriverCard`** in `SmartBottomSheet` (avatar, name, `Rating`, vehicle/plate) → **ETA + ride-status** line → action row: `Call` · `Chat` · **SOS (danger)** · `Cancel`. States: en-route-to-pickup / arrived / in-progress / completing. Notes: **the master real-time screen** — marker glide/rotate, live ETA via socket, status transitions mirror both actors, SOS always danger-red & reachable; cancel confirms via `SmartDialog`.

### Driver Experience (only these)

**13. Driver Dashboard** — *AR‑3.* Composition: `AppHeader` (greeting + **`OnlinePill`** + notifications) → map workspace + `MapFab` (SOS/Messages/Support/Recenter) → operations panel: live status ("Waiting for requests"/offline) + `Rating` chip + **real earnings `Card`** (today + trips + week + wallet chip + Wallet/Withdraw/History/Earnings shortcuts) + **stats** (`StatCard` row: rating/trips/completed) + `Button` Go Online/Offline. States: loading/onboarding-gate/approval-gate/offline/online. Notes: **reference for operational screens**; animated pill; real data only.

**14. Incoming Ride Request** — *AR‑3 + `SmartBottomSheet`.* Composition: sheet: title + **countdown ring** → route (`pickup`/`dropoff`) → fare ("You earn") → `Button` Decline + `Button` Accept. Notes: haptic + sound + auto-zoom on arrival; countdown expires → rotate offer; **reference for time-boxed decisions**.

**15. Accept / Reject** — behaviors on #14 (not a screen): Accept→navigation; Reject→next offer. Both optimistic with rollback.

**16. Active Navigation** — *AR‑3 (nav mode).* Composition: full map + large nav card (ETA, distance, next maneuver) → `DriverCard` (passenger, `Call`/`Chat`) → `Button` Arrived → Start Trip. States: to-pickup / to-dropoff. Notes: minimal clutter; one primary action per phase.

**17. Trip Complete** — *AR‑5.* Composition: summary hero (fare, distance, time) → breakdown `Card` → `Rating` prompt → `Button` Done. Notes: brief celebration; leads to earnings.

**18. Earnings Summary** — *AR‑4/5.* Composition: period `SegmentedControl` (Today/Week/Month) → totals `StatCard`s → trips `Card` list → Withdraw `Button`. States: loading/empty/loaded. Notes: real `/riders/earnings`; tabular money.

### Merchant Dashboard

**19. Dashboard** — *AR‑3/4.* Composition: `AppHeader` + online toggle → **daily revenue `StatCard`s** (real) → **incoming orders** `OrderCard` list → quick actions. States: loading/empty/loaded. Notes: professional density, still one focal task.

**20. Incoming Orders** — *AR‑4.* `OrderCard` list (new/preparing/ready) + `Chip` filters + accept action. **21. Order Detail** — *AR‑5.* items `Card` + customer + `StatusBadge` + `Button` advance status. **22. Order Status** — status stepper (`RideTimeline`-style) on detail. **23. Daily Revenue** — *AR‑4/5.* revenue `StatCard`s + orders list + period control. Notes: all share `OrderCard` + `StatusBadge`.

### Pharmacy Dashboard

**24. Dashboard** — *AR‑3/4.* revenue + queue `StatCard`s + incoming prescription orders. **25. Prescription Review** — *AR‑5.* prescription image/details `Card` → items → **verify/reject** `Button`s (confirm via `SmartDialog`). **26. Order Queue** — *AR‑4.* `OrderCard` list + `Chip` status filters. **27. Verification** — *AR‑5.* document/prescription `Card` + `UploadField` review + approve/reject. Notes: trust-critical → clear confirmations; audit-friendly language.

### Wallet (reference architecture — already migrated)

**28. Wallet Overview** — *AR‑5-ish scroll.* Composition: `AppHeader` → **balance hero (the one gradient)** → `Button` Top Up + Withdraw → payment methods (`Card` chips) → recent transactions (`Card` list) → security note. *(Implemented — the reference.)*

**29. Transaction History** — *AR‑4.* full `FlatList` of transaction rows + `Chip` filters + `EmptyState`. **30. Transfer** — *AR‑2/5.* recipient `TextField` + amount + `Button` (confirm via `SmartDialog`). **31. Top Up / 32. Withdraw** — `SmartBottomSheet` (amount + method + confirm; success `SmartToast`). Notes: money is loudest type; every action confirmed.

### Chat

**33. Conversation List** — *AR‑4.* `ListRow`s (avatar, name, last message, time, unread `CountBadge`) + `SearchInput`. **34. Conversation** — *AR‑6.* `ChatBubble` stream + composer + attach; header `Call`/SOS. **35. Voice Call Entry** — full-screen calm layout: `Avatar` + name + status + large reachable controls (mute/end/speaker). **36. Attachments** — composer sheet (photo/location) via `SmartBottomSheet`. Notes: optimistic send; one bubble style; reference for messaging + calling.

### Notifications

**37. Notification Center** — *AR‑4.* Composition: `AppHeader` → `Chip` filters (All/Rides/Orders/Wallet) → **grouped** sections (`SectionHeader`: Today/Earlier) → `NotificationCard` rows (icon + primary/secondary + time + unread dot) → **actionable** ones expose inline `Button`s → `EmptyState`. States: loading(skeleton)/empty/loaded. Notes: unread vs read differentiated by weight+dot (not color alone); mark-all-read; reference for grouped + actionable notifications.

### Profile

**38. Profile** — *AR‑5.* Composition: identity hero (`Avatar` + name + role + `Rating`) → grouped `ListRow` sections: **Preferences** (theme, language, notifications `Toggle`) · **Security** (password, sessions) · **Support** (help, contact) · **Identity** (documents) → **Logout** (`Button danger`, confirm via `SmartDialog`). Notes: destructive action separated + confirmed; reference for settings/grouped rows.

### Receipt (one reusable architecture)

**39. Receipt (Ride / Food / Delivery / Wallet)** — *AR‑5, single `ReceiptCard` architecture.* Composition: header (logo, receipt #, date, `StatusBadge`) → **service block** (varies by type: ride route / food items / delivery pickup-dropoff / wallet txn) → **fare/amount breakdown** (itemized, sums to total, tabular) → payment method → provider (first-name only, privacy-safe) → footer (support). Notes: **one architecture, four content blocks** — never four receipt designs; amounts must sum; reference for all receipts (deliverable #10 of prior phase, unified here).

### Delivery Personnel (added per §17 governance)

`DELIVERY_PERSONNEL` is a `Rider.riderRole`, not a `UserRole` — a delivery
provider signs up as `RIDER` and is distinguished by that attribute. The
backend already dispatches `FOOD_DELIVERY`, `SHOPPING`, `ITEM_DELIVERY` and
`SMART_HEALTH_DELIVERY` to this role (`dispatch/types.ts`,
`api/state-machine.ts`; health orders are DP-only), so these screens close a
gap where work was being assigned to providers who had no interface to see it.
They inherit existing archetypes and introduce no new primitives.

**40. Delivery Dashboard** — *AR‑3, inherits #13.* Same composition as the Driver
Dashboard, branched on `riderRole === 'DELIVERY_PERSONNEL'`: `AppHeader`
(greeting + `OnlinePill` + notifications) → map workspace + FAB cluster →
operations panel: live status ("Waiting for deliveries") + `Rating` + earnings
`Card` + stats + `Button` Go Online/Offline. Differences from #13: vehicle label
reads the delivery vehicle (bicycle/scooter/boda), the status copy says
*deliveries* not *rides*, and the panel adds a **queue entry point** when the
provider holds more than one assignment. Notes: one dashboard, two framings —
never a second dashboard file.

**41. Incoming Delivery Offer** — *AR‑3 + `SmartBottomSheet`, inherits #14.* Sheet:
title ("New delivery") + countdown ring → **merchant pickup** → **customer
dropoff** → item summary (order number + item count) → payout ("You earn") →
`Button` Decline + `Button` Accept. Differences from #14: the route block names
the merchant rather than a pickup address, and the offer carries what is being
collected. Notes: scrim must not dismiss — declining is a decision, not a
mis-tap.

**42. Delivery Queue** — *AR‑4.* `AppHeader` → `SegmentedControl` (Active /
Completed) → `ListRow` per assignment inside a `Card` (merchant → customer,
`StatusBadge`, payout) → `EmptyState` / `ErrorState` / `ListSkeleton`. Notes:
a delivery provider can hold several assignments at once, which a ride driver
cannot; this list is the only screen unique to the role.

---

## Part C — Component Usage Map

Which Design-System components each golden area exercises (proves coverage). `●` primary, `○` secondary.

| Component | Auth | Client Home | Booking | Active Ride | Driver | Merchant | Pharmacy | Wallet | Chat | Notif | Profile | Receipt |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Button` (all variants) | ● | ● | ● | ● | ● | ● | ● | ● | ○ | ○ | ● | ○ |
| `Card` + domain cards | ○ | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| `TextField`/`PasswordField`/`PhoneField` | ● | ● | ● | | | ○ | ○ | ● | ● | | ○ | |
| `OtpField` | ● | | | | | | | | | | | |
| `SearchInput` | | ● | ● | | | ○ | ○ | ● | ● | | | |
| `Chip`/`SegmentedControl` | | ○ | ● | | ● | ● | ● | ● | | ● | | |
| `Radio`/`Checkbox` | ● | | ○ | | | | | | | | ○ | |
| `Toggle`/`OnlinePill` | | | | | ● | ● | ● | | | | ● | |
| `SmartBottomSheet` | | ○ | ● | ● | ● | ○ | ○ | ● | ○ | | | |
| `SmartDialog` | ○ | ○ | ● | ● | ○ | ● | ● | ● | | ○ | ● | |
| `SmartToast` | ● | ○ | ○ | ○ | ○ | ● | ● | ● | ○ | ○ | ○ | ○ |
| `StatusBadge`/`CountBadge` | | ○ | ○ | ● | ● | ● | ● | ● | ● | ● | ○ | ● |
| `Rating` / `Avatar` | | ○ | | ● | ● | | | | ● | | ● | ○ |
| `SmartRideMap`+markers | | ● | ● | ● | ● | | | | | | | |
| `Skeleton`/`EmptyState`/`ErrorState` | ○ | ● | ● | ○ | ● | ● | ● | ● | ● | ● | ○ | ○ |
| `AppHeader`/`BottomNav` | | ● | ○ | | ● | ● | ● | ● | ● | ● | ● | ○ |
| `RideTimeline`/status stepper | | | | ● | | ● | ● | | | | | ○ |

Every golden screen resolves entirely to this set — **zero one-off components required** except the gaps flagged in Part E.

---

## Part D — Design Consistency Report

- **Layouts:** all ~40 screens reduce to **6 archetypes** → strong inheritance, low maintenance, scales to 200+.
- **Type/spacing/color:** every screen uses `TYPOGRAPHY`/`SPACING`/`RADIUS`/`COLORS` tokens; money uses the hero-number treatment; 90/7/3 color discipline holds; brand green only on action.
- **Interaction:** one primary action per screen; press feedback shared (`pressScale`); confirmations via `SmartDialog`; toasts for non-blocking; pull-to-refresh on every list.
- **Motion:** every animation maps to a `MOTION` token; entrances staggered and capped; map glide/rotate consistent; no decorative motion.
- **Feedback:** one dialog/toast family; every data screen defines empty/loading/error; SOS is uniformly danger-red and reachable on operational screens.
- **Accessibility:** 48dp targets, AA contrast, font-scaling, color-independent status, thumb-zone primaries — specified per screen, not bolted on.
- **Validation-checklist verdict:** Premium ✓ (restraint + real data), Calm ✓ (one focus/screen), Effortless ✓ (progressive disclosure, smart defaults), Trustworthy ✓ (confirmations, honest status), First-time-understandable ✓ (plain labels, clear hierarchy), Developer-legible components ✓ (usage map), Reusable patterns ✓ (6 archetypes), Scales to 200+ ✓.

**Result:** the Design System holds up under a full-product prototype. Every screen traces to an archetype + system primitives.

---

## Part E — Design Gaps Discovered (fix BEFORE implementation)

Prototyping these screens surfaced concrete weaknesses in the current system. **Recommend resolving these first** (they are cheap now, expensive later):

**Missing primitives (blocking several golden screens):**
1. **`SmartBottomSheet`** — required by Booking options, Incoming Request, Top-Up/Withdraw, attachments. Exists ad-hoc per screen; must be a shared primitive (rounded-26, grabber, `slow`+`gentle`, drag-dismiss, scrim).
2. **`BottomNav`** — Client Home + Driver + Merchant/Pharmacy shells need one Material-3 bottom nav; none exists. **Architectural** — resolve early (§16 order).
3. **`SegmentedControl`** — ride options, earnings/revenue periods. Currently hand-rolled chips.
4. **`Avatar`** and **`Rating`** — used across Active Ride, Chat, Profile, receipts; not yet extracted as primitives.
5. **`RideTimeline` / status stepper** — Active Ride status, Merchant/Pharmacy order status, receipts. No shared stepper exists.
6. **`Select`/`Picker`** (bottom-sheet based) and **`DatePickerField`/`AddressField`/`UploadField`** — booking, transfer, verification, KYC. Field family is incomplete.
7. **`CountBadge`** (numeric unread) — Chat list, Notifications. Only boolean `StatusBadge` exists.
8. **`AppHeader`** — every screen re-implements a header; `GlowHeader` is legacy. Needs one canonical header (compact + large variants).
9. **`ReceiptCard` architecture** — one card, four content blocks; must exist before any receipt screen is built (prevents four divergent receipts).

**Token/system gaps:**
10. **Motion for "success"** — the DS defines press/enter/exit but not a standard **success confirmation** motion (check-draw). Add `MOTION` guidance + a `SuccessCheck` micro-component.
11. **Opacity, border, icon, and avatar scales** are informal — promote to real tokens (`OPACITY`, `BORDER`, `ICON`, `AVATAR`) so screens stop hardcoding.
12. **Spacing scale** lacks `2xl/3xl` — editorial screens (Welcome, Trip Complete, Receipt) need larger rhythm steps.
13. **Empty/loading/error coverage** — `StateViews` exists, but there is **no standard loading skeleton per archetype** (list/detail/map). Add `ListSkeleton`, `DetailSkeleton`, `MapSkeleton` presets so every screen loads consistently.
14. **Grouped-list section pattern** — Notifications/Profile need a canonical grouped `SectionHeader` + rows pattern; specify it once.

**Behavioral gaps:**
15. **Live-status vocabulary** — Active Ride / Booking / Dispatch use ad-hoc status strings. Define a shared, localized **status-label + status-color map** (one source) so both actors and every screen agree.
16. **Permission pre-prompt** — the DS mandates in-context permission priming, but there's no shared **`PermissionPrimer`** sheet; add one (location, notifications, camera).

**Recommendation:** implement the migration in the DS spec §16 order, but **insert these gap items into the "Component library" step (2)** — specifically `AppHeader`, `SmartBottomSheet`, `BottomNav`, `Avatar`, `Rating`, `SegmentedControl`, `CountBadge`, `ReceiptCard`, and the skeleton presets — *before* migrating any golden screen. That way each Golden Screen is assembled from a complete primitive set and no screen is built twice.

---

## Final

These 39 screen specs + 6 archetypes are the **permanent reference**. Every future Smart Ride interface must name the Golden Screen and archetype it inherits from, and resolve entirely to Design-System primitives. If a new screen can't be expressed from this set, that is a signal to extend the **system** (via §17 governance) — never to invent a one-off. Build the Part E gaps first; then the golden screens become straightforward assemblies, and the whole product stays one product.
