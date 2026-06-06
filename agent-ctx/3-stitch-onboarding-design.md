Task ID: 3
Agent: stitch-onboarding-design
Task: Update onboarding screens to match Stitch Visual Design System

Work Log:
- Updated 8 onboarding component files from dark theme to Stitch light theme
- Applied consistent color mapping across all files:
  - Background: #0D0D12 → #f8f9fa
  - Cards/surfaces: #13131A/#1A1A24 → white/#f3f4f5
  - Primary text: white → #191c1d
  - Secondary text: gray-400/500 → #3f4941/#6f7a71
  - Accent color: #00FF88 → #005f3a (Deep Green)
  - Accent backgrounds: #00FF88/15 → #98f6be/20
  - Borders: white/5/10 → #bec9bf/30
  - Shadows: shadow-[#00FF88]/30 → shadow-[#005f3a]/15
  - Gradients: from-[#00FF88] to-[#00CC6E] → from-[#005f3a] to-[#0e7a4d]
- Applied Stitch typography: font-[family-name:var(--font-plus-jakarta)] for headlines
- Applied Stitch button styles: Deep Green bg with white text, rounded-xl, h-14
- Applied Stitch input styles: bg-[#f3f4f5] border-[#bec9bf] rounded-xl focus:border-[#005f3a]
- Applied Stitch card styles: bg-white rounded-2xl p-6 border-[#bec9bf]/30 shadow-sm
- Updated warning/info cards from dark overlays to light pastel variants (amber-50, red-50, blue-50)
- Updated sticky headers to white bg instead of dark
- Updated checkbox accent from rose-500 to #005f3a
- Lint passes cleanly with zero errors

Files Updated:
1. welcome-screen.tsx - Full dark→light conversion, service grid cards, CTA button
2. mobile-auth-screen.tsx - Light auth screen, phone input, OTP slots, Google button
3. role-selection-screen.tsx - White role cards with Deep Green selection indicators
4. rider-role-selection.tsx - White cards, gradient icon backgrounds, light warning
5. rider-registration.tsx - All 5 steps (personal, documents, vehicle, review, submitted)
6. merchant-registration.tsx - All 5 steps (business, documents, bank, review, submitted)
7. health-provider-registration.tsx - All 8 steps with rose accents preserved for health context
8. pending-approval.tsx - Status cards, progress steps, contact support, timeline

Stage Summary:
- All 8 onboarding screens fully migrated from dark theme to Stitch light design system
- Zero functionality changes - only visual properties (colors, fonts, spacing, borders, shadows, border-radius)
- All props, state, handlers, callbacks, and business logic preserved exactly as-is
- Lint passes with no errors
