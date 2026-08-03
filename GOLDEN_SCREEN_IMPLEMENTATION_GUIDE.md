# Golden Screen Implementation Guide

**Status:** Live Implementation Template  
**Purpose:** Reference for applying Golden Screen patterns to all 40+ Smart Ride screens

---

## Quick Start: Archetype Templates

### AR-1: Brand Canvas (Splash, Welcome)
```tsx
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { GradientButton } from '@/src/components';

// Hero gradient → logo → headline → stacked CTAs
// Motion: FadeSlideIn staggered (80/220/340/460ms), `slower` timing
// No scroll
```

### AR-2: Focused Form (Login, Registration, OTP, Forgot Password)
```tsx
import { AppHeader } from '@/src/components';
import { TextField, PasswordField, OtpField } from '@/src/components';

// Centered scrollable card
// Logo/title → error banner → fields → button → divider → alternates
// Keyboard-aware, validate on blur
```

### AR-3: Operational Map (Client Home, Booking, Active Ride, Driver Dashboard)
```tsx
import { AppHeader, SmartRideMap, SmartBottomSheet } from '@/src/components';

// AppHeader overlay → map ~55% → operations panel ~45% (rounded-26)
// Bottom sheet with `slow`+`gentle` spring
// Markers glide/rotate, camera ease
```

### AR-4: List + Search (Restaurants, Orders, Chat list, Notifications)
```tsx
import { AppHeader, SearchInput, Card, EmptyState } from '@/src/components';

// AppHeader → SearchInput → Chip filters → FlatList → states
// Pull-to-refresh on every list
// Rows FadeInUp staggered
```

### AR-5: Detail + Sticky Action (Order Detail, Receipts, Profile)
```tsx
import { AppHeader, RideTimeline, Card } from '@/src/components';

// Scroll: hero → grouped sections → **sticky bottom Button**
// Sections FadeInUp, sticky CTA elevates on scroll
```

### AR-6: Conversation (Chat, Voice Call)
```tsx
import { AppHeader, ChatBubble } from '@/src/components';

// AppHeader (avatar + name) → message list (inverted) → composer
// Optimistic send, typing indicator
```

---

## Component Migration Checklist

When migrating a screen:

1. **Identify archetype** - Which AR does this screen inherit?
2. **Replace header** - Use `AppHeader` (compact or large variant) instead of custom
3. **Replace dialogs** - Use `SmartDialog` (aliased from `SmartRideModal`)
4. **Replace sheets** - Use `SmartBottomSheet` for modal content
5. **Add status indicators** - Use `RideTimeline`, `StatusBadge`, `CountBadge`
6. **Apply animations** - Use `FadeIn`, `FadeInUp`, `SlideInUp` with `MOTION` tokens
7. **Add states** - Empty, loading, error via `EmptyState`, `Skeleton`, `ErrorState`
8. **Test** - Build, verify navigation, check all API calls remain intact

---

## Critical Path: Priority Screens

**Phase 1 (Golden Screens — establish pattern):**
- ✓ Client Home (AR-3)
- → Ride Booking (AR-3 progressive) — needs `SmartBottomSheet` for options
- → Active Ride (AR-3 live) — needs `RideTimeline` + live status
- → Driver Dashboard (AR-3)
- → Merchant Dashboard (AR-3/4)
- → Wallet (AR-5)

**Phase 2 (Client Journey):** Home, Rides list, Booking flow, Tracking, Orders

**Phase 3 (Rider/Driver Journey):** Dashboard, Requests, Active ride, Earnings

**Phase 4 (Merchant/Pharmacist):** Orders, Menu, Earnings

**Phase 5 (Shared):** Chat, Notifications, Profile, Settings

---

## Key Rules (Non-Negotiable)

- **One header per screen** → Use `AppHeader` (compact default, large for editorial)
- **All dialogs** → Via feedback store + `SmartDialog` (no system Alert)
- **All sheets** → Via `SmartBottomSheet` (unified entry/exit motion)
- **All toasts** → Via feedback store (no SnackBar, no native toast)
- **Money type** → Always hero-sized (28–36px, weight 800), tabular
- **Status colors** → Only on status (error = red, success = green, warning = orange)
- **Motion** → Every animation maps to `MOTION` tokens (no hardcoded timings)
- **No one-off components** → If it appears on a screen, it exists in the Design System

---

## Build & Verify

After each phase:

```bash
cd /vercel/share/v0-project
npm run build          # Web (Next.js)
# Expo TypeScript check (via VSCode / editor)
# Manual test in preview
```

Every screen must:
- ✓ Build without errors
- ✓ Have no TypeScript issues
- ✓ Navigate correctly to its destinations
- ✓ Keep all existing API calls
- ✓ Show proper empty/loading/error states

---

## Pattern Examples

### Button usage across screens
```tsx
// Primary action (confirm, submit, book)
<GradientButton variant="primary" onPress={handlePrimaryAction} />

// Secondary (cancel, skip, not now)
<GradientButton variant="secondary" onPress={handleSecondary} />

// Danger (delete, logout, cancel ride)
<GradientButton variant="danger" onPress={handleDestructive} title="Logout" />

// Loading
<GradientButton loading={isLoading} onPress={handlePress} />
```

### List loading/empty states
```tsx
{loading ? (
  <Skeleton count={5} style={{ marginBottom: SPACING.md }} />
) : data.length > 0 ? (
  <FlatList data={data} renderItem={renderRow} />
) : (
  <EmptyState icon="inbox" title="No orders yet" subtitle="Once you place an order, it will appear here." />
)}
```

### Sticky bottom action pattern
```tsx
<View style={{ flex: 1 }}>
  <ScrollView>{/* content */}</ScrollView>
  <View style={{ paddingBottom: insets.bottom + SPACING.md }}>
    <GradientButton variant="primary" onPress={handlePrimaryAction} title="Confirm" />
  </View>
</View>
```

---

## Completed Screens

- [x] Client Home (AR-3 content-first)
- [ ] Ride Booking
- [ ] Active Ride
- [ ] Driver Dashboard
- [ ] Merchant Dashboard
- [ ] Wallet

**Updates in progress — refer back here as you migrate remaining journeys.**
