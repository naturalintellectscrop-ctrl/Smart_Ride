# Task 4 - Stitch Design Merge: Client Dashboard & Home

## Agent: Design Merge Agent
## Task ID: 4

### Work Summary
Merged Stitch "Smart Ride Home" design system into the existing client dashboard and home tab, replacing dark theme visuals with the light Stitch design language while preserving ALL existing functionality.

### Files Modified

#### 1. `/home/z/my-project/src/app/layout.tsx`
- Added `Plus_Jakarta_Sans` font import from `next/font/google`
- Created `plusJakartaSans` font variable `--font-plus-jakarta`
- Added both font variables to `<body>` className

#### 2. `/home/z/my-project/src/app/globals.css`
- Added `--font-display: var(--font-plus-jakarta)` theme token

#### 3. `/home/z/my-project/src/components/smart-ride/dashboards/client/client-dashboard.tsx`
**Visual changes:**
- Background: `#f8f9fa` (sr-surface) instead of `#0D0D12`
- Removed gradient status bar at top (green `Smart Ride` bar)
- Bottom nav: white bg with `sr-shadow-nav` shadow, `rounded-t-xl`, border-t `sr-outline-variant/30`
- Active tab: `bg-sr-secondary-container` (#6bff8f) rounded-2xl, text `sr-on-secondary-container` (#007432)
- Inactive tab: text `sr-on-surface-variant` (#3f4941)
- Error badge: `bg-sr-error` instead of `bg-[#FF3B5C]`
- Bottom padding: `pb-24` for proper spacing above nav

**Preserved:**
- All 5 tabs (Home, Orders, Messages, Wallet, Profile)
- Tab switching logic with `useState<ClientTab>`
- `handleBellClick` routing to messages
- `useNotifications` / `useMessaging` context usage
- `unreadCount` sync effect
- `CartProvider`, `MessagingProvider`, `NotificationProvider` wrapping
- All content rendering switch cases

#### 4. `/home/z/my-project/src/components/smart-ride/dashboards/client/tabs/client-home.tsx`
**Visual changes:**
- Full light theme: bg `sr-surface` (#f8f9fa)
- **Header**: sticky, bg-surface, 40px avatar with 2px primary border + "JD" initials, greeting with name, HeadsetMic + Bell icon buttons in 40px white circles with sr-shadow-1, location dropdown with ChevronDown
- **Wallet Balance Card**: sr-gradient-primary (135deg #0e7a4d → #005f3a), white text, decorative circles (sr-primary-container opacity-20), "Top Up" pill button (bg-sr-secondary-fixed), sr-shadow-wallet, ride count badge
- **Quick Services Grid**: 3×2 grid (all 6 services), white tile cards with rounded-xl sr-shadow-1, 48px colored icon circles with service-specific bg/icon colors, hover border-sr-primary-fixed
- **Support Prompt**: flex row with 48px primary circle phone icon + "Call Now" pill badge (sr-primary-fixed)
- **Promo Banner**: h-40 rounded-xl, primary gradient overlay, "Limited Offer" pill badge (sr-secondary-fixed), decorative circles, emoji
- **Recent Orders**: horizontal scroll cards, white bg, service-specific icon colors
- **Favorite Places**: 2-col grid, white cards, lighter icon backgrounds (blue-50/purple-50)
- All text uses `text-sr-on-surface` / `text-sr-on-surface-variant` instead of white/gray
- Headlines use `font-[family-name:var(--font-plus-jakarta)]`

**Preserved:**
- All 6 services (boda, car, food, smart-grocery, smart-courier, health) with ALL click handlers
- `handleServiceClick` / `handleCloseService` state logic
- `RideBooking` rendering for boda/car
- `FoodDelivery` rendering for food
- `SmartGrocery` rendering for smart-grocery
- `SmartHealthOrder` rendering for health
- `useNotifications` with unread count badge
- `getTimeGreeting` with interval refresh
- All imports from existing services

### Lint Status: ✅ Clean (no errors)
### Dev Server: ✅ Running on port 3000
