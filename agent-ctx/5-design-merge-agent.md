# Task 5 — Stitch Design Merge: Onboarding Screens

## Agent: Design Merge Agent

## Task
Transform 4 onboarding screen components from dark theme (#0D0D12) to Stitch light design system while preserving ALL business logic, API calls, validations, and state management.

---

### 1. welcome-screen.tsx
**Changes:**
- Background: `#0D0D12` → `#f8f9fa` (Surface)
- Added slide-based layout with 3 slides (Welcome, Ride & Deliver, Shop & Eat)
- Added pagination dots (8px default, 24px active, `#005f3a` primary)
- CTA: Full-width `h-14` rounded-full `bg-[#005f3a]` with shadow
- Added "Skip" button (top-right, primary green text)
- Service cards: Dark `#13131A` → white `bg-white` with Level 1 shadow
- Service icon backgrounds: Dark overlays → light pastel (e.g., `#98f6be/40`, `sky-100`, `orange-100`)
- Typography: Plus Jakarta Sans for headings, Inter for body
- Feature highlight card: Removed dark card, replaced with slide illustrations
- Last slide shows compact 3-column service grid
- **Preserved:** SERVICE_CATEGORIES data, localStorage cleanup, onGetStarted callback, icon mapping

### 2. mobile-auth-screen.tsx
**Changes:**
- Background: `#0D0D12` → mesh gradient (radial at corners, `#f8f9fa` base)
- Added Image logo at top (96px, rounded-xl with Level 2 shadow)
- Phone input: Uganda flag gradient strip + "+256" prefix in composite input with `#f3f4f5` bg
- Auto-formatting phone number: XXX XXX XXX via `formatPhone()` helper
- CTA: Full-width `h-14` rounded-xl `bg-[#005f3a]` with shadow
- "OR CONTINUE WITH" divider with `#bec9bf` lines and tracking-wide text
- Social login: 2-column grid (Google, Apple), `h-14` rounded-xl buttons
- Glass panel effect: `rgba(255,255,255,0.8)` with `backdrop-filter: blur(8px)` around phone input
- OTP slots: `#f3f4f5` bg, `#bec9bf` border, `#005f3a` focus
- Error styling: `rgba(186,26,26,0.08)` bg with `#ba1a1a` text
- Success icon: `#98f6be` bg square instead of circle
- **Preserved:** All auth logic, phone verification, OTP flow, Firebase reCAPTCHA, resend timer, Google Sign-In, onBack/onAuthSuccess callbacks, all API calls

### 3. auth-screen.tsx
**Changes:**
- Background: `#0D0D12` → mesh gradient (same as mobile-auth)
- Added `create-account` step (AuthStep type extended)
- "Join the ride" headline-lg display in Plus Jakarta Sans
- White form container with `p-6` rounded-2xl Level 1 shadow
- Input fields: `bg-[#f3f4f5]` rounded-lg with icon prefix (User, Mail, Ticket), focus ring 2px `#005f3a`
- Fields: Full Name (required), Email (optional), Referral Code (optional)
- Terms checkbox: 24px rounded using shadcn Checkbox with `#005f3a` checked state
- CTA: Full-width `h-14` rounded-full `bg-[#005f3a]` with Level 2 shadow + `active:scale-[0.98]`
- Phone input step also updated with Uganda flag strip + composite input
- Social login: 2-column grid (Google, Apple) matching mobile-auth style
- OTP step: Same light design as mobile-auth
- **Preserved:** All form validation, auth logic, handleGoogleAuthSuccess, handleGoogleLogin, phone/OTP submit with API calls, Google redirect result handling, onBack/onAuthSuccess callbacks

### 4. role-selection-screen.tsx
**Changes:**
- Background: `#0D0D12` → mesh gradient with `#f8f9fa` base
- Role cards: `#13131A` → white `bg-white` with Level 1 shadow, rounded-2xl (16px)
- Selected state: Dark colored borders → `#005f3a` border with `#98f6be/30` bg
- Icon backgrounds: Gradient circles → solid colored squares (emerald=`#005f3a`, orange=`orange-600`, blue=`sky-700`, rose=`rose-600`)
- Selected check: Light pastel bg with colored check icon
- Subtitle: `#005f3a` green color for emphasis
- Description: `#3f4941` on-surface variant
- Info card: White bg with Level 1 shadow
- Typography: Plus Jakarta Sans for headings
- **Preserved:** All role selection logic, onBack/onRoleSelect callbacks, isMobileRole check, MOBILE_APP_CONFIG usage, mobile-only roles enforcement

---

## Design System Applied
- Surface: #f8f9fa (backgrounds)
- Surface container lowest: #ffffff (cards)
- Surface container low: #f3f4f5 (input backgrounds)
- On-surface: #191c1d (primary text)
- On-surface variant: #3f4941 (secondary text)
- Outline: #6f7a71 (borders, secondary text)
- Outline variant: #bec9bf (card borders, dividers)
- Primary: #005f3a (buttons, active states)
- Primary fixed: #98f6be (light green bg for icons/pills)
- Error: #ba1a1a (error text)
- Shadows: Level 1 = 0 4px 12px rgba(0,0,0,0.08), Level 2 = 0 8px 24px rgba(0,0,0,0.12)
- Border radius: 8px default, 12px xl, 16px 2xl, full for pills
- Typography: Plus Jakarta Sans (headlines), Inter (body)
