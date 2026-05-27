# Task 6 - Remove Mock/Hardcoded Data from Rider Dashboard

## Summary
Removed ALL mock/hardcoded data from 4 rider dashboard components and replaced with real API calls.

## Files Modified
1. **`src/components/smart-ride/dashboards/tabs/rider-home.tsx`** - Removed hardcoded stats, activeTask, surgeZones, nearbyRequests. Added real API calls with loading/error/empty states.
2. **`src/components/smart-ride/dashboards/tabs/rider-tasks.tsx`** - Removed hardcoded allTasks array. Added real API calls, task transition via API, loading/error/empty states.
3. **`src/components/smart-ride/dashboards/tabs/rider-earnings.tsx`** - Removed all hardcoded earnings, transactions, bonuses, weekly data, withdrawals. Calculates from completed tasks API.
4. **`src/components/smart-ride/dashboards/rider-dashboard.tsx`** - Removed hardcoded initialUnreadCount={3}. Fetches from notifications API.

## Key Decisions
- Auth pattern: `localStorage.getItem('accessToken')` + `Authorization: Bearer` header (matches existing codebase)
- Gateway pattern: `?XTransformPort=3000` on all API calls
- Surge zones: Placeholder UI with TODO (marketplace API doesn't exist)
- Nearby requests: Empty state "Waiting for requests..." (comes from socket events)
- Earnings: Derived from completed tasks since dedicated rider earnings API doesn't exist
- Bonuses/withdrawals: Empty states (no API exists yet)
- Visual styling: Preserved exactly (colors, gradients, layouts unchanged)

## Lint Status
✅ Passes with no errors
