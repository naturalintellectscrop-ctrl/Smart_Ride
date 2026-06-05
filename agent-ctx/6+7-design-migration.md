# Task 6+7 - Stitch Design System Migration

## Agent: Design Migration Agent
## Task: Transform 6 Smart Ride service components from dark theme to Stitch light design system

### Summary
Transformed all 6 service component files from a dark theme (`bg-[#0D0D12]`, `bg-[#13131A]`, `text-white`, `#00FF88` accent) to the Stitch light design system (`bg-[#f8f9fa]`, `bg-white`, `text-[#191c1d]`, `#005f3a` primary green`) while preserving ALL existing business logic, API calls, state management, and functionality.

### Files Modified

#### 1. ride-booking.tsx (PRIORITY - HIGHEST)
**Layout Changes:**
- Dark background → Light `#f8f9fa` surface
- Map placeholder with satellite image effect (gradient with grid lines), 60% opacity, 20% grayscale
- Map markers: Boda (32px primary `#005f3a` circle), Car (40px secondary `#006e2f` circle), both with white 2px border
- Top bar: Fixed, transparent/glass effect (`bg-white/90 backdrop-blur-md`), menu button (48px circle), "Live in Kampala" pill with green dot, notification button with red dot
- Floating search / bottom sheet: `bg-white rounded-t-[32px]` with drag handle (48px × 6px rounded-full), shadow
- Header: Glass effect (`bg-white/80 backdrop-blur-[8px]`)
- Cards: White bg with `border-[#e1e3e4]`, subtle shadow-sm
- CTA buttons: `bg-[#005f3a] text-white` (primary green)
- Pickup dot: `#005f3a` green, Destination dot: `#ba1a1a` red
- Error cards: `bg-[#ba1a1a]/10`
- Searching animation: `#98f6be` background with `#005f3a` dots
- Matched rider: `#98f6be` badge, verified badge
- All text colors: `text-[#191c1d]` (on-surface), `text-[#6f7a71]` (muted), `text-[#3f4941]` (variant)

**Preserved Logic:**
- All 8 booking steps (location, passengers, vehicle, payment, confirm, searching, matched, no_riders)
- Socket event handling (rider:task:matched, task:status:update)
- HTTP polling fallback for status checks
- Ride creation via `/api/tasks` with fetchWithRetry
- Cancellation via `/api/tasks/${taskId}/transition`
- Route estimation via estimateRouteAsync
- Fare calculation with calculateAllFares
- Passenger count management
- Vehicle selection with VehicleSelection component
- Payment method selection with PaymentMethodSelector
- Match timer, task number display
- All auth headers and API mappings

#### 2. food-delivery.tsx (PRIORITY - HIGH)
**Layout Changes:**
- Header: Glass effect (`bg-white/80 backdrop-blur-[8px]`), brand name in `#005f3a` bold, chat icon with red notification dot, notification icon
- Search bar: `h-14 rounded-xl bg-[#edeeef]` with tune icon
- Categories: Horizontal scroll with 64px `rounded-2xl` icon containers, active: `bg-[#0e7a4d]`
- Featured Stores: 280px-wide horizontal scroll cards, h-40 image area, star rating pill overlay (white/90 backdrop-blur)
- All Restaurants: 2-column grid with aspect-square images
- Cart bar: White bg, `#98f6be` cart icon, `#005f3a` badge
- FAB: Fixed `#005f3a` green circle with red `#ba1a1a` badge
- Cards: White with `border-[#e1e3e4]`
- Add to cart: `#98f6be` circle with `#005f3a` plus icon
- Prices: `text-[#005f3a]`

**Preserved Logic:**
- Restaurant fetching from `/api/merchants?type=RESTAURANT`
- Menu fetching from `/api/merchants/${merchantId}/menu`
- Cart management via useCart hook (addItem, removeItem, updateQuantity)
- Cart type: 'food'
- CheckoutScreen integration
- Delivery fee and service info setting
- Search filtering

#### 3. smart-grocery.tsx
**Layout Changes:**
- Same light pattern: `bg-[#f8f9fa]`, white cards, glass header
- Search bar: `bg-[#edeeef] h-12 rounded-xl` with tune icon
- Categories: `bg-[#005f3a]` active, `bg-white border-[#e1e3e4]` inactive
- Store icons: `#98f6be` background with `#005f3a` store icon
- Open/Closed badges: `#98f6be` / `#ba1a1a/10`
- Grid/List toggle
- Product cards: White with `#edeeef` image placeholder
- Cart bar: White bg, `#98f6be` cart icon

**Preserved Logic:**
- Merchant fetching from 3 API endpoints (SUPERMARKET, GROCERY, RETAIL_STORE)
- Menu items fetching from `/api/merchants/${merchantId}/menu`
- Cart operations with CartItem type
- Category filtering
- Search filtering
- Grid/list view toggle
- setMerchantInfo, setOrderType, setDeliveryFee
- CheckoutScreen integration

#### 4. smart-health-order.tsx
**Layout Changes:**
- Light design with medical icon accents (Stethoscope in header)
- Brand name in `#005f3a` bold
- Search bar with tune icon
- Info banner: `#98f6be/30` background with `#0e7a4d/20` border
- Facility cards: White with `#98f6be` rating badge
- Rx badges: `bg-amber-100 text-amber-700`
- Cart bar: `#98f6be` pill icon with `#005f3a` badge
- Category pills: `bg-[#005f3a]` active

**Preserved Logic:**
- All facility and medicine data structures
- Cart management (add/remove/update/delete)
- Category filtering
- CheckoutScreen integration
- Prescription badge display

#### 5. checkout-screen.tsx
**Layout Changes:**
- Light background `#f8f9fa`
- Glass effect headers (`bg-white/80 backdrop-blur-[8px]`)
- Clean white cards with `border-[#e1e3e4]` and shadow-sm
- All icons in `#98f6be` circles or `#f3f4f5` backgrounds
- Primary green CTA: `bg-[#005f3a] text-white`
- Item count badge: `bg-[#98f6be] text-[#005f3a]`
- Delete buttons: `bg-[#ba1a1a]/10`
- Quantity controls: `bg-[#f3f4f5]` minus, `bg-[#005f3a]` plus
- Price text: `text-[#005f3a]`
- Success screen: `#98f6be` checkmark circle
- Error screen: `#ba1a1a` alert circle

**Preserved Logic:**
- All 6 checkout steps (cart, address, payment, confirm, success, error)
- Order creation via `/api/orders` POST
- Payment method mapping
- Address collection and validation
- Cart item management (delete, quantity change)
- Grand total calculation
- Service fee
- PaymentMethodSelector integration
- Order success data display

#### 6. wallet-transfer.tsx
**Layout Changes:**
- Light background `#f8f9fa`
- Glass effect headers
- White cards with `border-[#e1e3e4]`
- Recipient avatars: `#98f6be` circles with `#005f3a` icons
- Quick amount buttons: `bg-[#005f3a]` active, white inactive
- Input fields: White bg, `border-[#e1e3e4]`
- Continue/confirm buttons: `bg-[#005f3a]`
- Success checkmark: `#98f6be` circle with `#005f3a` check
- Free fee indicator: `text-[#005f3a]`
- Balance display: `#f3f4f5` background

**Preserved Logic:**
- All 5 steps (select, amount, confirm, processing, success)
- Recipient selection from recent list
- Phone number input with validation
- Quick amount selection
- Note/optional message
- Amount formatting
- Balance checking
- Transfer simulation (setTimeout)
- Transaction ID generation

### Design System Color Mapping Applied

| Old (Dark) | New (Stitch Light) | Token |
|---|---|---|
| `bg-[#0D0D12]` | `bg-[#f8f9fa]` | Surface |
| `bg-[#13131A]` | `bg-white` | Surface container lowest |
| `bg-[#1A1A24]` | `bg-[#edeeef]` | Surface container |
| `text-white` | `text-[#191c1d]` | On-surface |
| `text-gray-400/500` | `text-[#6f7a71]` | Outline |
| `bg-[#00FF88]` | `bg-[#005f3a]` | Primary |
| `text-[#00FF88]` | `text-[#005f3a]` | Primary |
| `bg-[#00FF88]/20` | `bg-[#98f6be]` | Primary fixed |
| `border-white/5` | `border-[#e1e3e4]` | Surface container highest |
| `bg-orange-500` | `bg-[#ba1a1a]` | Error (for destination markers) |
| `bg-purple-600` | `bg-[#005f3a]` | Primary (replacing service-specific colors) |
| `bg-rose-600` | `bg-[#005f3a]` | Primary (replacing service-specific colors) |

### Lint Result
✅ `bun run lint` passed with zero errors

### No Functionality Removed
- All API calls preserved
- All state management preserved
- All business rules and validations preserved
- All socket event handling preserved
- All cart operations preserved
- All form inputs and user interactions preserved
