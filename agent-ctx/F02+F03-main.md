# Task F02+F03 — Agent Work Record

## Agent: Main
## Task IDs: F02 + F03

### F02: Fix merchant detail screen — replace NativeWind/Tailwind with StyleSheet

**Problem:** `/home/z/my-project/expo-app/app/orders/merchant/[id].tsx` used NativeWind `className` attributes, but `global.css` was removed (NativeWind not active), so the screen rendered without any styling.

**Solution:** Complete rewrite using `StyleSheet.create()` and inline `style` props. Replaced all emojis with `Ionicons`. Used `COLORS`/`TYPOGRAPHY`/`SPACING`/`RADIUS`/`SHADOWS` from `@/src/constants`.

**Files modified:**
- `expo-app/app/orders/merchant/[id].tsx` — full rewrite

**Emoji → Ionicon mapping:**
| Emoji | Ionicon | Usage |
|-------|---------|-------|
| 🏪 | `storefront` / `storefront-outline` | Cover placeholder, merchant logo |
| ⭐ | `star` (color #F59E0B) | Rating badge |
| 🚗 | `car-outline` | Delivery fee pill |
| 🍽️ | `restaurant-outline` | Product image placeholder |
| ← | `arrow-back` | Back button |
| + | `add` | Add to cart button |

**Added:**
- `wallet-outline` Ionicon for min order info pill

### F03: Fix location picker to return selected data to caller

**Problem:** `/home/z/my-project/expo-app/app/location-picker.tsx` had `handleConfirm` that called `router.back()` without passing selected location data back to the calling screen.

**Solution:** Extended `useLocationStore` with `pickupLocation`/`dropoffLocation` fields and their setters. `handleConfirm` now stores the selected location in the store before calling `router.back()`.

**Files modified:**
- `expo-app/src/store/locationStore.ts` — added `SelectedLocation` interface, `pickupLocation`/`dropoffLocation` state, `setPickupLocation`/`setDropoffLocation`/`clearPickupLocation`/`clearDropoffLocation` actions
- `expo-app/src/store/index.ts` — exported `SelectedLocation` type
- `expo-app/app/location-picker.tsx` — updated `handleConfirm` to store location before `router.back()`, updated useLocationStore destructuring

**Data flow pattern:**
1. Calling screen navigates to `/location-picker?type=pickup`
2. User searches/selects/taps a location on the map
3. User taps "Confirm Location"
4. `handleConfirm` stores `{ latitude, longitude, address }` in `useLocationStore.pickupLocation` (or `.dropoffLocation`)
5. `router.back()` returns to calling screen
6. Calling screen reads from `useLocationStore().pickupLocation` / `.dropoffLocation`
