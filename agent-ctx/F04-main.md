# Task F04 — Replace MOCK_ORDERS with Real API + Wire Accept/Reject

## Agent: Main

## Summary
Replaced all mock data in the merchant dashboard with real API integration and wired the accept/reject buttons to call the backend.

## Changes Made

### 1. `expo-app/src/services/api.ts` — Added 6 missing merchant API methods
- `getMerchantProfile(merchantId?)` — GET /merchants/{id}/profile
- `getMerchantOrders(merchantId, status?, page?)` — GET /merchants/{id}/orders
- `getMerchantAnalytics(merchantId)` — GET /merchants/{id}/analytics
- `getMerchantEarnings(merchantId, period?)` — GET /merchants/{id}/earnings
- `updateMerchantAvailability(merchantId, isOpen)` — PATCH /merchants/{id}/availability
- `updateOrderStatus(orderId, status)` — PATCH /orders/{id}/status

### 2. `expo-app/src/types/index.ts` — Added `todayRevenue` to MerchantAnalytics

### 3. `expo-app/app/merchant/index.tsx` — Full rewrite
- Removed MockOrder interface and MOCK_ORDERS hardcoded data
- Uses MerchantOrder from types and orders from useMerchantStore
- Accept → `updateOrderStatus(orderId, 'CONFIRMED')`
- Reject → `updateOrderStatus(orderId, 'REJECTED')` with Alert confirmation
- Loading/error/empty states for order list
- Pull-to-refresh refreshes orders + profile + analytics
- Tab filtering with multi-status mapping (NEW→[NEW,PENDING], etc.)
- isUpdatingOrder disables buttons and shows ActivityIndicator
- All Ionicons, all COLORS from constants, no emojis
