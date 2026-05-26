# Task 7-b: Fix Order Screens Branding (Light→Dark Theme)

## Agent: code-agent
## Status: COMPLETED

## Summary
Converted all 4 order-related screens from light NativeWind/Tailwind className styling to dark React Native StyleSheet using brand COLORS from `@/src/constants`.

## Files Modified
1. `/home/z/my-project/expo-app/app/orders/restaurants.tsx`
2. `/home/z/my-project/expo-app/app/orders/cart.tsx`
3. `/home/z/my-project/expo-app/app/orders/merchant/[id].tsx`
4. `/home/z/my-project/expo-app/app/orders/order-tracking.tsx`

## Changes Applied
- Removed ALL `className=` props from all 4 files
- Added `StyleSheet` import from `react-native`
- Created `StyleSheet.create()` style objects using COLORS from `@/src/constants`
- Dark backgrounds: `COLORS.background` (#0D0D12), `COLORS.backgroundElevated` (#1A1A24), `COLORS.backgroundSurface` (#252530)
- Light text: `COLORS.text` (white), `COLORS.textSecondary`, `COLORS.textMuted`
- Neon green accents: `COLORS.primary` (#00FF88) for headers, buttons, prices
- Open/Closed badges: translucent rgba backgrounds with colored text
- Category chips: dark surface unselected, neon green selected
- Payment method chips: neon green border + translucent green bg when selected
- Map stays unchanged; all overlay cards converted to dark elevated theme
- All logic, API calls, state, and functionality preserved unchanged

## Verification
- Zero `className=` props remain in any order screen
- Zero light-theme references (bg-gray, bg-white, text-gray-900, etc.) remain
- StyleSheet and COLORS imports verified in all 4 files
