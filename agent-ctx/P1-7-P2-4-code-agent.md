# Task P1-7 & P2-4 - Code Agent Work Record

## Task P1-7: Payment Method Enum Mismatch (B19/B44)

### Problem
The mobile app uses `MTN_MOMO` and `AIRTEL_MONEY` as payment method IDs, but the backend Zod schema expects `MOBILE_MONEY_MTN` and `MOBILE_MONEY_AIRTEL`. This causes all non-CASH payment attempts to fail with 400 errors.

### Changes Made

1. **`expo-app/src/constants/index.ts`** — Added two new export constants:
   - `PAYMENT_METHOD_MAP`: Maps client-side payment enums to server-side enums
   - `PAYMENT_METHOD_DISPLAY`: Reverse map for displaying server values in the UI

2. **`expo-app/app/rider/ride-request.tsx`** — 
   - Imported `PAYMENT_METHOD_MAP`
   - Changed `paymentMethod` to `PAYMENT_METHOD_MAP[paymentMethod] || paymentMethod` in the `api.requestRide()` call

3. **`expo-app/app/orders/cart.tsx`** — 
   - Imported `PAYMENT_METHOD_MAP`
   - Changed `paymentMethod` to `PAYMENT_METHOD_MAP[paymentMethod] || paymentMethod` in the `api.placeOrder()` call

4. **`expo-app/app/delivery/index.tsx`** — 
   - Imported `PAYMENT_METHOD_MAP`
   - Changed `paymentMethod` to `PAYMENT_METHOD_MAP[paymentMethod] || paymentMethod` in the `api.requestRide()` call

---

## Task P2-4: Order Tracking Socket Events (B51/B52)

### Problem
The order tracking screen listens for `order:status:update` but the server emits `task:status:update`. Also, the screen never joins a socket room, so it never receives real-time updates even when the event name was correct.

### Changes Made

1. **`expo-app/app/orders/order-tracking.tsx`** — 
   - Changed socket listener from `order:status:update` to `task:status:update`
   - Added `getTaskId()` helper: checks for `order.taskId` field first, falls back to `params.orderId`
   - Added socket connection initialization with `socketService.connect()` + `socketService.joinTaskRoom(taskId)` (following ride-tracking.tsx pattern)
   - Added `socketService.leaveTaskRoom(taskId)` in cleanup function
   - Updated event data type from `{ orderId, status }` to `{ taskId, status }` to match server payload
