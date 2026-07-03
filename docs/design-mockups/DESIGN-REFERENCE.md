# Smart Ride — Stitch Design Reference (target designs, for a later RN redesign pass)

Source: 3 Stitch/Tailwind web mockups provided 2026-07-02. These are the **visual
target** for redesigning the mobile screens. The app is React Native — translate
the design (layout, tokens, hierarchy), don't port the HTML. The palette below
already matches `expo-app/src/theme/themedColors.ts` (dark green Material 3).

## Shared design system
- **Font**: Plus Jakarta Sans (400/600/700). Material Symbols Outlined for icons.
- **Type scale**: headline-lg 28/700, headline-md 22/700, headline-sm 18/600,
  body-lg 16, body-md 14, label-xl 14/700, label-md 12/600, numeric-data 20/700.
- **Radius**: sm .125rem, lg .25rem, xl .5rem, full .75rem.
- **Spacing tokens**: gutter 12, unit 4, margin-mobile 16, margin-desktop 32,
  touch-target-min 48.
- **Dark palette (key)**: background/surface `#131313`, surface-container `#201f1f`,
  surface-container-high `#2a2a2a`, primary `#7cd9a4`, on-primary `#003921`,
  primary-container `#0e7a4d`, secondary `#ffb95f`/secondary-container `#ee9800`,
  error `#ffb4ab`, outline-variant `#3f4941`, on-surface `#e5e2e1`,
  on-surface-variant `#bec9bf`.
- **Nav**: mobile bottom nav (Home/Activity/Earnings/Profile) + web side nav.
  Online status pill with pulsing dot.

## Screen 1 — Merchant Dashboard (`app/merchant/index.tsx`)
- Greeting header ("Good morning, {business}") + Online status pill.
- **Bento summary grid** (2-col mobile / 4-col web): large Total Revenue card
  (headline value + % badge + "vs yesterday", faint bg icon), Orders count,
  Avg Prep Time.
- **Active Orders queue**: cards with a colored left status rail
  (secondary=Preparing, primary=Ready), order #, status chip, item summary,
  Details + primary action button (Ready / Waiting-disabled).
- **Menu Quick Actions**: item rows with thumbnail, Available/Sold-Out label,
  availability toggle (sold-out rows greyed + grayscale).

## Screen 2 — Driver Active Delivery / Food Pickup (`app/rider/*` active task)
- Full-bleed **map canvas** with route line + destination/origin pins,
  "N min away" pill, floating recenter button, top "Navigating" status pill.
- **Persistent bottom sheet** (drag handle, rounded-t-24): Pickup label +
  place name + address + order # chip; **Call / Message** quick actions
  (message has unread dot); **Order Details** list (qty chips + item + notes);
  sticky primary CTA "Arrived at Restaurant".

## Screen 3 — Pharmacist Prescription Verification (`app/pharmacist/*`)
(partial mockup — truncated) Order #RX header + Pending chip; **Document Scan**
image viewer (zoom-in / zoom-out controls, cursor-zoom); **Verification
Checklist** (Patient Name Match, Doctor Signature, Valid Date, Medication Match)
as checkbox rows; **Extracted Data** bento panel (2-col). Likely approve/reject
CTA at bottom.

## Notes for implementation
- Reuse existing `GlassCard`, `GradientButton`, `ConfirmDialog`, themed styles.
- Keep privacy rules (first names only, no phone) and approval gating intact.
- Raw HTML mockups are in the chat history if pixel detail is needed.
