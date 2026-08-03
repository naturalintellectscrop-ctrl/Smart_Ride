# Smart Ride Screen Migration Checklist

**Status:** 40+ screens ready for Golden Screen pattern application  
**Purpose:** Systematic verification that all screens migrate to their correct archetypes

---

## Legend

- **AR-1**: Brand Canvas (Splash, Welcome)
- **AR-2**: Focused Form (Login, Signup, OTP, Forgot Password)
- **AR-3**: Operational Map (Booking, Active Ride, Driver Dashboard)
- **AR-4**: List + Search (Restaurants, Orders, Notifications)
- **AR-5**: Detail + Sticky (Order Detail, Receipts, Profile)
- **AR-6**: Conversation (Chat, Calls)

---

## Client Journey

### Core Screens (Priority 1)

- [ ] `/(tabs)/index.tsx` **Client Home**
  - Archetype: **AR-3** (content-first variant)
  - Status: ✅ READY (already implements pattern)
  - Components needed: AppHeader, BottomNav, SmartRideMap, ServiceIcon
  - Action: Verify BottomNav wiring to routing

- [ ] `/(tabs)/rides.tsx` **Rides List**
  - Archetype: **AR-4** (list + search)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, SearchInput, Chip, FlatList, EmptyState
  - Lines to modify: ~200-300
  - Action: Replace header, add SearchInput, ensure pull-to-refresh

- [ ] `/rider/ride-request.tsx` **Booking Flow**
  - Archetype: **AR-3 progressive** (pickup → destination → options → confirm)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader (compact), SmartBottomSheet, SegmentedControl, GradientButton
  - Lines to modify: ~150-250 (out of 1473)
  - Action: Add SmartBottomSheet for options step, integrate SegmentedControl

- [ ] `/rider/ride-tracking.tsx` **Active Ride**
  - Archetype: **AR-3 live** (map + status + actions)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, SmartRideMap, RideTimeline, StatusBadge, SmartDialog
  - Lines to modify: ~100-150
  - Action: Add RideTimeline for status visualization, integrate live updates

- [ ] `/orders/restaurants.tsx` **Food Ordering (Browse)**
  - Archetype: **AR-4** (list + search + filters)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, SearchInput, Chip, Card, FlatList, EmptyState
  - Lines to modify: ~150-200
  - Action: Replace header with AppHeader, add proper states

- [ ] `/orders/orders.tsx` **Order History**
  - Archetype: **AR-4** (list + search)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, SearchInput, Chip, Card, EmptyState
  - Lines to modify: ~100-150
  - Action: Add Chip filters, grouped sections by date

- [ ] `/orders/order-detail.tsx` **Order Detail**
  - Archetype: **AR-5** (detail + sticky bottom)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Card, RideTimeline, GradientButton (sticky)
  - Lines to modify: ~80-120
  - Action: Add RideTimeline for order status, sticky confirm button

- [ ] `/shopping/index.tsx` **Shopping Browse**
  - Archetype: **AR-4** (list + search + filters)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, SearchInput, Chip, Card, FlatList
  - Lines to modify: ~150-200 (out of 769)
  - Action: Same as restaurants - list+search pattern

- [ ] `/shopping/cart.tsx` **Shopping Cart**
  - Archetype: **AR-5** (detail + sticky)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Card, GradientButton (sticky)
  - Lines to modify: ~80-120
  - Action: Sticky checkout button, proper empty state

- [ ] `/delivery/index.tsx` **Delivery Services**
  - Archetype: **AR-4** (list)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Card, FlatList, EmptyState
  - Lines to modify: ~100-150 (out of 1612)
  - Action: Apply list pattern

- [ ] `/health/index.tsx` **Health Services**
  - Archetype: **AR-4** (list + search)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, SearchInput, Card, FlatList
  - Lines to modify: ~120-180 (out of 805)
  - Action: Apply list+search pattern

- [ ] `/wallet/index.tsx` **Wallet Overview**
  - Archetype: **AR-5** (detail-focused hero + sections)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Card, GradientButton, StatusBadge
  - Lines to modify: ~80-120 (out of 358)
  - Action: Ensure hero balance display, section organization

---

## Rider / Driver Journey

- [ ] `/rider/driver-dashboard.tsx` **Driver Dashboard**
  - Archetype: **AR-3** (operational)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, OnlinePill, SmartRideMap, Card, Rating, StatCard
  - Lines to modify: ~150-200 (out of 864)
  - Action: Apply operational pattern

- [ ] `/rider/earnings.tsx` **Earnings Summary**
  - Archetype: **AR-4/5** (earnings cards + list)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, SegmentedControl, Card, FlatList, StatCard
  - Lines to modify: ~100-150
  - Action: Period selector + stats display

- [ ] `/rider/history.tsx` **Trip History**
  - Archetype: **AR-4** (list + filters)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Chip, Card, FlatList, EmptyState
  - Lines to modify: ~100-150
  - Action: Filter by trip type/date

- [ ] `/rider/trip-details.tsx` **Trip Detail**
  - Archetype: **AR-5** (detail + receipt-like)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Card, RideTimeline, ReceiptCard components
  - Lines to modify: ~80-120
  - Action: RideTimeline for route, receipt layout for fare breakdown

- [ ] `/rider/trip-summary.tsx` **Trip Completion Summary**
  - Archetype: **AR-5** (detail + rating prompt)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Card, Rating, GradientButton
  - Lines to modify: ~80-120
  - Action: Rating component integration, celebration moment design

---

## Merchant Journey

- [ ] `/merchant/index.tsx` **Merchant Dashboard**
  - Archetype: **AR-3/4** (operational + orders list)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, SmartRideMap, Card, OrderCard, FlatList, StatCard
  - Lines to modify: ~200-300 (out of 1063)
  - Action: Apply operational + list pattern hybrid

- [ ] `/merchant/orders.tsx` **Merchant Order Queue**
  - Archetype: **AR-4** (list + status filters)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Chip, OrderCard, FlatList, EmptyState
  - Lines to modify: ~100-150
  - Action: Filter by order status (new/preparing/ready)

- [ ] `/merchant/order-detail.tsx` **Order Fulfillment**
  - Archetype: **AR-5** (detail + preparation actions)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Card, RideTimeline, OrderCard, GradientButton
  - Lines to modify: ~80-120
  - Action: RideTimeline for preparation status, action buttons

- [ ] `/merchant/menu.tsx` **Menu Management**
  - Archetype: **AR-4** (list + search)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, SearchInput, Card, FlatList
  - Lines to modify: ~100-150
  - Action: Add/edit menu items, search + filters

- [ ] `/merchant/earnings.tsx` **Revenue Dashboard**
  - Archetype: **AR-5** (revenue summary + period control)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, SegmentedControl, StatCard, Card, FlatList
  - Lines to modify: ~100-150
  - Action: Period selector, stats + orders list

---

## Pharmacist Journey

- [ ] `/pharmacist/index.tsx` **Pharmacy Dashboard**
  - Archetype: **AR-3/4** (operational)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Card, OrderCard, FlatList, StatCard
  - Lines to modify: ~150-200 (out of 435)
  - Action: Similar to merchant dashboard

- [ ] `/pharmacist/orders.tsx` **Prescription Order Queue**
  - Archetype: **AR-4** (list + status filters)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Chip, Card, FlatList, EmptyState
  - Lines to modify: ~100-150
  - Action: Filter by prescription status

- [ ] `/pharmacist/prescription-detail.tsx` **Prescription Verification**
  - Archetype: **AR-5** (detail + verification actions)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Card, UploadField, GradientButton (confirm/reject dialogs)
  - Lines to modify: ~80-120
  - Action: Verify/reject with SmartDialog confirmation

- [ ] `/pharmacist/earnings.tsx` **Pharmacy Revenue**
  - Archetype: **AR-5** (revenue summary)
  - Status: → READY FOR MIGRATION
  - Components needed: Same as merchant earnings
  - Lines to modify: ~100-150
  - Action: Period selector + stats

---

## Shared Experiences

- [ ] `/chat/index.tsx` **Conversation List**
  - Archetype: **AR-4** (list + search)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, SearchInput, Card, CountBadge, FlatList
  - Lines to modify: ~100-150 (out of 542)
  - Action: Add unread count badge, last message preview

- [ ] `/chat/[id].tsx` **Conversation**
  - Archetype: **AR-6** (conversation)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader (with call/SOS actions), ChatBubble, composer
  - Lines to modify: ~150-200
  - Action: AppHeader integration, ensure call/SOS reachable

- [ ] `/notifications/index.tsx` **Notification Center**
  - Archetype: **AR-4** (list + grouped + actionable)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, Chip, Card, SectionHeader, CountBadge, EmptyState
  - Lines to modify: ~80-120 (out of 770)
  - Action: Grouped by date, unread dot differentiation

- [ ] `/(tabs)/account.tsx` **User Profile**
  - Archetype: **AR-5** (detail + grouped rows)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, ListRow, Toggle, SectionHeader, GradientButton (logout)
  - Lines to modify: ~100-150 (out of 740)
  - Action: Grouped sections (Preferences, Security, Support, Identity)

- [ ] `/settings/index.tsx` **Settings**
  - Archetype: **AR-4/5** (grouped list)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, ListRow, Toggle, SectionHeader
  - Lines to modify: ~100-150 (out of 161)
  - Action: Apply grouped pattern

- [ ] `/receipts/ride-receipt.tsx` **Ride Receipt**
  - Archetype: **AR-5** (receipt card architecture)
  - Status: → READY FOR MIGRATION
  - Components needed: AppHeader, ReceiptCard (unified architecture), GradientButton
  - Lines to modify: ~80-120
  - Action: Implement one ReceiptCard component that all 4 receipt types inherit

- [ ] `/receipts/order-receipt.tsx`, `/delivery-receipt.tsx`, `/wallet-receipt.tsx` **Other Receipts**
  - Archetype: **AR-5** (reuse ReceiptCard)
  - Status: → READY FOR MIGRATION
  - Components needed: ReceiptCard (content blocks vary)
  - Lines to modify: ~40-60 each
  - Action: Reuse single ReceiptCard with different content blocks

---

## Critical Path (If Resource-Constrained)

**Priority Order for Maximum Impact:**

1. ✅ Client Home (AR-3) — **DONE**
2. → Ride Request / Booking (AR-3) — **HIGH PRIORITY**
3. → Active Ride Tracking (AR-3 live) — **HIGH PRIORITY**
4. → Driver Dashboard (AR-3) — **MEDIUM PRIORITY**
5. → Restaurants/Food (AR-4) — **MEDIUM PRIORITY**
6. → Notifications (AR-4) — **MEDIUM PRIORITY**
7. → Order Detail (AR-5) — **MEDIUM PRIORITY**
8. → Receipts (AR-5 unified) — **MEDIUM PRIORITY**
9. → Chat (AR-6) — **LOWER PRIORITY**
10. → Remaining AR-4 lists — **LOWER PRIORITY**

---

## Summary Statistics

| Archetype | Count | Status | Effort |
|-----------|-------|--------|--------|
| **AR-1** (Brand Canvas) | 2 | ✅ READY | Minimal |
| **AR-2** (Form) | 4 | ✅ READY | Minimal |
| **AR-3** (Operational Map) | 7 | ✅ 1 DONE, 6 → | Medium |
| **AR-4** (List + Search) | 14 | → READY | Low-Medium |
| **AR-5** (Detail + Sticky) | 10 | → READY | Low-Medium |
| **AR-6** (Conversation) | 2 | → READY | Low |
| **TOTAL** | **39** | **~85% ready** | **~60-80 hours** |

---

## Implementation Flow

For each screen:

1. **Read current screen**
2. **Identify archetype** (use "Archetype" column above)
3. **Replace header** with `AppHeader`
4. **Add state containers** (Loading, Empty, Error)
5. **Integrate archetype components** (SmartBottomSheet, RideTimeline, etc.)
6. **Add animations** (FadeInUp, FadeIn per MOTION tokens)
7. **Verify navigation** still works
8. **Test API calls** still functional
9. **Build & test**
10. **Move to next screen**

---

## Next Session Execution

```bash
# Start with highest-priority screens
# 1. Verify build passes
npm run build

# 2. Migrate ride-request.tsx (AR-3 progressive booking)
# - Add SmartBottomSheet import
# - Replace manual sheet with SmartBottomSheet wrapper
# - Integrate SegmentedControl for vehicle selection

# 3. Migrate ride-tracking.tsx (AR-3 live)
# - Add RideTimeline import
# - Implement status visualization
# - Integrate live updates

# 4. Migrate merchant dashboard (AR-3/4 hybrid)

# 5. Continue systematically through priority list

# After major changes:
npm run build && echo "✓ Build successful"
```

---

**Last updated:** August 3, 2026  
**Screens evaluated:** 39 total  
**Ready to migrate:** 39 (100%)  
**Effort estimate:** 60-80 hours to complete all
