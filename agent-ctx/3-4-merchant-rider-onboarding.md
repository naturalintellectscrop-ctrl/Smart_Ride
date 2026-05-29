# Task 3-4: Merchant & Rider Onboarding

## Agent: Merchant & Rider Onboarding Agent

## Summary
Implemented Phase 3 (Merchant Onboarding) and Phase 4 (Rider Onboarding & Operations) with complete service layers and API routes.

## Files Created

### Services
1. `/home/z/my-project/src/lib/merchant/merchant-onboarding.service.ts` — MerchantOnboardingService with registerMerchant, verifyMerchant, suspendMerchant, updateMerchantAvailability, pauseMerchant, reactivateMerchant, getMerchantAnalytics
2. `/home/z/my-project/src/lib/rider/rider-onboarding.service.ts` — RiderOnboardingService with registerRider, verifyRider, suspendRider, assignCapability, getRiderMetrics, getRiderWallet, updateRiderOnlineStatus, reactivateRider

### API Routes
3. `/home/z/my-project/src/app/api/merchants/onboarding/route.ts` — POST: Register merchant
4. `/home/z/my-project/src/app/api/merchants/verify/route.ts` — POST: Verify merchant (approve/reject)
5. `/home/z/my-project/src/app/api/merchants/[id]/availability/route.ts` — PATCH: Update availability/pause
6. `/home/z/my-project/src/app/api/merchants/[id]/analytics/route.ts` — GET: Merchant analytics
7. `/home/z/my-project/src/app/api/riders/onboarding/route.ts` — POST: Register rider
8. `/home/z/my-project/src/app/api/riders/[id]/verify/route.ts` — POST: Verify rider (approve/reject)
9. `/home/z/my-project/src/app/api/riders/[id]/metrics/route.ts` — GET: Rider metrics
10. `/home/z/my-project/src/app/api/riders/[id]/wallet/route.ts` — GET: Rider wallet

## Key Design Decisions
- All services use real DB queries via Prisma — no mock data, stubs, or TODOs
- All operations create audit logs via the existing createAuditLog() utility
- All verification/suspension actions create Notification records for the affected user
- All API routes have JWT authentication with role-based access control (using verifyAccessToken)
- Merchant analytics aggregates from FinanceLog, Order, OrderItem, and Task tables
- Rider metrics calculated from DispatchMatch, Rating, and HeartbeatLog tables
- Rider wallet uses Wallet + WalletTransaction models with ownerId/ownerType lookup
- Rider registration creates RiderCapability records aligned with the CapabilityService defaults
- Rider registration creates a Wallet (ownerType: RIDER) inside the transaction
- Vehicle creation required for SMART_BODA_RIDER and SMART_CAR_DRIVER roles

## Lint Status
- ESLint passes with no errors
