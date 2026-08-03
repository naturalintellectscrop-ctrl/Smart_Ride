# Quick Start: Next Session (Golden Screen Migration Execution)

**Use this to jump back in immediately.**

---

## What's Done

✅ Infrastructure complete  
✅ 2 new components: `SmartBottomSheet`, `RideTimeline`  
✅ 9 components exported  
✅ 6 archetype templates ready  
✅ All 39 screens audited  
✅ Build verified working  

**You're ready to migrate screens.**

---

## Step 1: Verify (5 min)

```bash
cd /vercel/share/v0-project
npm run build
# Should complete with "✓ Built successfully"
```

---

## Step 2: Pick a Screen (3 min)

Use **SCREEN_MIGRATION_CHECKLIST.md**, start with **Critical Path**:

1. **`/rider/ride-request.tsx`** (AR-3 progressive booking) — HIGHEST PRIORITY
2. **`/rider/ride-tracking.tsx`** (AR-3 active ride) — HIGH PRIORITY
3. **`/orders/restaurants.tsx`** (AR-4 list+search) — MEDIUM PRIORITY

---

## Step 3: Find the Pattern (2 min)

Go to **GOLDEN_SCREEN_IMPLEMENTATION_GUIDE.md**:

- Find the archetype (e.g., "AR-3: Operational Map")
- See the component template
- See the 10-step migration checklist

---

## Step 4: Migrate (15-30 min per screen)

### For AR-3 (Operational Map) — Ride Request
```tsx
// 1. Import
import { AppHeader, SmartBottomSheet, SegmentedControl } from '@/src/components';

// 2. Replace header
// OLD: <GlowHeader ...>
// NEW: <AppHeader title="Book a Ride" variant="compact" onBack={...} />

// 3. Add SmartBottomSheet for options
<SmartBottomSheet 
  visible={showOptions}
  title="Select Vehicle"
  onDismiss={() => setShowOptions(false)}
>
  <SegmentedControl 
    options={[
      { label: 'Boda', value: 'BODA' },
      { label: 'Car', value: 'CAR' }
    ]}
    value={selectedVehicle}
    onChange={setSelectedVehicle}
  />
</SmartBottomSheet>

// 4. Verify navigation still works
// 5. Verify API calls intact
// 6. Test, build, done
```

### For AR-4 (List + Search) — Restaurants
```tsx
// 1. Import
import { AppHeader, SearchInput, Card, EmptyState } from '@/src/components';

// 2. Replace header
// OLD: Custom header
// NEW: <AppHeader title="Restaurants" variant="compact" />

// 3. Add search
<SearchInput 
  placeholder="Find restaurants..."
  onChangeText={handleSearch}
/>

// 4. Add states (empty/loading/error)
{loading ? (
  <Skeleton count={5} />
) : restaurants.length ? (
  <FlatList data={restaurants} renderItem={renderRow} />
) : (
  <EmptyState icon="restaurant" title="No restaurants found" />
)}

// 5. Verify navigation, APIs, test
```

### For AR-5 (Detail + Sticky) — Order Detail
```tsx
// 1. Import
import { AppHeader, RideTimeline, GradientButton } from '@/src/components';

// 2. Add header
<AppHeader title="Order #12345" onBack={handleBack} />

// 3. Add status timeline
<RideTimeline steps={[
  { id: '1', label: 'Confirmed', status: 'completed' },
  { id: '2', label: 'Preparing', status: 'active' },
  { id: '3', label: 'Ready for pickup', status: 'pending' }
]} />

// 4. Add sticky button at bottom
<View style={{ paddingBottom: insets.bottom }}>
  <GradientButton onPress={handleAction} title="Confirm" />
</View>

// 5. Verify, test, done
```

---

## Step 5: Verify (5 min)

- [ ] Build passes: `npm run build`
- [ ] No TypeScript errors in screen
- [ ] Navigation still works (tap to screen, tap back)
- [ ] API calls still happen (check network tab if possible)
- [ ] Empty/loading/error states exist
- [ ] Looks good in preview

---

## Step 6: Mark Done (1 min)

In **SCREEN_MIGRATION_CHECKLIST.md**:
- Find the screen
- Change status to: `[x] DONE`

---

## Templates Quick Reference

```tsx
// AR-3: Operational Map (Booking, Active Ride, Driver Dashboard)
<AppHeader />
<SmartRideMap />
<SmartBottomSheet>
  {/* operations content */}
</SmartBottomSheet>

// AR-4: List + Search (Restaurants, Orders, Chat list)
<AppHeader />
<SearchInput />
<Chip filters />
<FlatList data={items} />
<EmptyState />

// AR-5: Detail + Sticky (Order Detail, Receipts, Profile)
<AppHeader />
{/* sections */}
<RideTimeline steps={[...]} />
<View style={{paddingBottom: insets.bottom}}>
  <GradientButton /> {/* sticky */}
</View>

// AR-6: Conversation (Chat, Calls)
<AppHeader />
<ChatBubble stream />
<View>
  <TextInput /> {/* composer */}
</View>
```

---

## Key Files to Keep Open

- **How:** `GOLDEN_SCREEN_IMPLEMENTATION_GUIDE.md`
- **Where:** `SCREEN_MIGRATION_CHECKLIST.md`
- **Status:** `MIGRATION_PROGRESS.md`
- **Session Report:** `SESSION_COMPLETION_REPORT.md`

---

## Common Mistakes to Avoid

❌ **Don't** replace the entire screen — modify incrementally  
❌ **Don't** remove imports before checking if still used  
❌ **Don't** create one-off components — use Design System primitives  
❌ **Don't** hardcode colors/spacing — use `COLORS`, `SPACING`, `TYPOGRAPHY` tokens  
❌ **Don't** forget to verify navigation after changes  

---

## Daily Workflow

```
1. Pick next screen from checklist (5 min)
2. Read archetype template (2 min)
3. Read current screen (5 min)
4. Make incremental changes (15-30 min)
5. Verify + test (5 min)
6. Build & commit (2 min)
7. Mark done in checklist (1 min)
→ REPEAT
```

**Realistic pace:** 3-5 screens per session (90-150 min of focused work)

---

## Session Goal Template

**Today's Goal:** Migrate X screens (pick from critical path)

- [ ] Screen 1: [name] (AR-X)
- [ ] Screen 2: [name] (AR-X)
- [ ] Screen 3: [name] (AR-X)
- [ ] Build verification
- [ ] Commit + update progress

---

## If You Get Stuck

1. **Component not found?**
   - Check `/src/components/index.ts` — is it exported?
   - Re-read `GOLDEN_SCREEN_IMPLEMENTATION_GUIDE.md` for correct import

2. **Navigation broken?**
   - Verify `router.push()` calls still exist
   - Check `useRouter()` import
   - Test manual navigation

3. **Build fails?**
   - Run `npm run build` again (sometimes network issue)
   - Check for syntax errors in modified file
   - Ensure no circular imports

4. **Not sure about archetype?**
   - Cross-reference in `SCREEN_MIGRATION_CHECKLIST.md`
   - If still unsure, look at similar screen's archetype

---

## Estimated Effort

| Archetype | Screens | Time/Screen | Total |
|---|---|---|---|
| AR-3 (Operational) | 7 | 30-45 min | 3-5 hours |
| AR-4 (List+Search) | 14 | 15-25 min | 3.5-6 hours |
| AR-5 (Detail+Sticky) | 10 | 15-20 min | 2.5-3.3 hours |
| AR-6 (Conversation) | 2 | 20-30 min | 40-60 min |
| **TOTAL** | **39** | **~15-35 min avg** | **60-80 hours** |

**Per-session estimate:** 3-5 screens (90-150 min focused work)  
**Completion estimate:** 12-20 sessions (3-4 weeks at 1 session/day)

---

## Success Looks Like

✅ Build passes  
✅ Screen uses archetype components (AppHeader, SmartBottomSheet, RideTimeline, etc.)  
✅ Navigation still works  
✅ API calls still happen  
✅ Empty/loading/error states exist  
✅ Marked done in checklist  
✅ Visual consistency with Design System  

---

**You've got this. Go migrate some screens. 🚀**

Start with `/rider/ride-request.tsx` (AR-3 booking flow).

---

Last updated: August 3, 2026
