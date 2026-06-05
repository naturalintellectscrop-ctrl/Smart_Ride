# T2-1: Rider Earnings Backend API + Enhanced Expo Earnings Dashboard

## Agent: full-stack-developer
## Status: Completed

## Summary
Built a complete rider earnings experience with dedicated API endpoints, commission split display, wallet integration, and withdrawal support via MTN/Airtel mobile money.

## Files Created
1. **`/home/z/my-project/src/app/api/riders/earnings/route.ts`** — GET endpoint that returns earnings breakdown by period (today/week/month/lifetime), wallet data, rider stats, and commission rates
2. **`/home/z/my-project/src/app/api/riders/withdraw/route.ts`** — POST endpoint for rider withdrawals to mobile money (MTN/Airtel), with Zod validation, atomic wallet debit, audit logging, and notifications

## Files Modified
3. **`/home/z/my-project/expo-app/src/services/api.ts`** — Added `getRiderEarnings(period?)` and `requestRiderWithdrawal(amount, phone, provider)` methods
4. **`/home/z/my-project/expo-app/app/rider/earnings.tsx`** — Complete rewrite with:
   - Real data from `/api/riders/earnings` endpoint
   - Today/Week/Month/Lifetime period tabs
   - Commission split visualization (rider % vs platform %) with visual bar
   - Per-service commission rate chips (Boda 85/15, Car 80/20, Food 85/15, Shopping 88/12, Delivery 90/10, Health 85/15)
   - Pending vs available earnings display
   - Withdrawal modal with MTN/Airtel provider selection
   - Quick amount buttons (5K, 10K, 20K, 50K)
   - Custom amount input with validation
   - Wallet summary section

## Key Design Decisions
- Used `requireAuth` from `@/lib/auth-utils` (matching existing rider API patterns) instead of `@/lib/auth/guards`
- Used `successResponse`/`errorResponse`/`serverErrorResponse` helpers from `@/lib/api/response`
- Commission rates defined as constants in the earnings route for transparency
- Withdrawal validation includes min (UGX 1,000) and max (UGX 5,000,000) limits
- Wallet debit uses existing `withdrawFromWallet` for atomic transactions
- Audit log created via `createAuditLog` with `WALLET_WITHDRAWAL` action
- Notification sent via `createNotification` for withdrawal confirmation
- TaskType enum values match Prisma schema exactly: `SMART_BODA_RIDE`, `SMART_CAR_RIDE`, `FOOD_DELIVERY`, `SHOPPING`, `ITEM_DELIVERY`, `SMART_HEALTH_DELIVERY`

## API Endpoints

### GET /api/riders/earnings?period=today|week|month|lifetime
Returns:
```json
{
  "success": true,
  "data": {
    "earnings": { "today": {...}, "week": {...}, "month": {...}, "lifetime": {...} },
    "activePeriod": {...},
    "wallet": { "balance", "pendingBalance", "totalDeposited", "totalWithdrawn" },
    "rider": { "totalEarnings", "totalTrips", "completedTrips", "cancelledTrips", "rating" },
    "commissionRates": { "SMART_BODA_RIDE": { "riderPercent": 85, "platformPercent": 15 }, ... },
    "period": "today"
  }
}
```

### POST /api/riders/withdraw
Body: `{ "amount": 10000, "phoneNumber": "0777123456", "provider": "MTN"|"AIRTEL" }`
Returns: `{ "success": true, "data": { "message", "newBalance", "transactionId", "provider", "amount" } }`

## Verification
- ESLint: Passed with no errors
- Route registration: `rider/earnings` already registered in Expo `_layout.tsx`
- All wallet operations use existing `wallet-service.ts` — no duplicate business logic
