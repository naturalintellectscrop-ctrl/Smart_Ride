# Task 9+10 - Stitch Design Integration for Rider & Merchant Dashboards

## Summary

Merged Stitch light design system into the Smart Ride rider and merchant dashboards, replacing dark theme visuals while preserving ALL existing business logic, API calls, state management, and functionality.

---

## Files Modified

### 1. `/home/z/my-project/src/components/smart-ride/dashboards/rider-dashboard.tsx`
**Changes:**
- **Background**: `bg-[#0D0D12]` → `bg-sr-surface` (#f8f9fa light gray)
- **Bottom navigation**: Replaced dark glassmorphism nav (`bg-[#13131A]/95 backdrop-blur-xl border-white/5`) with Stitch white nav style matching client dashboard (`bg-white rounded-t-xl sr-shadow-nav border-t border-sr-outline-variant/30`)
- **Active tab**: Changed from `text-[#00FF88] bg-[#00FF88]/15` to `bg-sr-secondary-container text-sr-on-secondary-container`
- **Inactive tab**: Changed from `text-gray-500 hover:bg-white/5` to `text-sr-on-surface-variant hover:bg-sr-surface-container-high`
- **Badge color**: `bg-[#FF3B5C]` → `bg-sr-error`
- **Removed**: Dark status bar (`bg-gradient-to-r from-emerald-500 to-teal-600`) and `getRoleGradient()` helper
- **Bottom padding**: `pb-20` → `pb-24` for Stitch nav clearance
- **Kept**: All socket connection, notification fetching, unread count, tab switching, RiderHome/RiderTasks/RiderEarnings/RiderMessages/RiderProfile rendering

### 2. `/home/z/my-project/src/components/smart-ride/dashboards/tabs/rider-home.tsx`
**Changes:**
- **Background**: `bg-[#0D0D12]` → `bg-sr-surface`
- **Header section**: Dark gradient header → light `bg-sr-surface-container-lowest` with `sr-shadow-1`
- **Top bar**: Added 40px avatar with `border-sr-primary-fixed`, greeting + rider name, ONLINE/OFFLINE pill toggle (`w-32 rounded-full`, sliding pill `bg-sr-primary` ↔ `bg-gray-400`), bell icon
- **Map placeholder**: Added heatmap overlay with blurred circles using `sr-animate-heatmap` 3s animation, grid overlay, and "Live map" label
- **Earnings card**: `bg-[#13131A] border-white/5` → glass-blur style (`bg-white/90 backdrop-blur-[12px] rounded-xl border-sr-outline-variant/30`), added trip count pill badge
- **Online/offline toggle**: Dark card → light `bg-sr-surface-container-lowest border-sr-outline-variant/30`
- **Go Online button**: `bg-gradient-to-r from-[#00FF88]` → `bg-sr-primary text-sr-on-primary`
- **Incoming request cards**: Dark `bg-[#13131A] border-[#00FF88]/30` → glass-blur `bg-white/90 backdrop-blur-[12px] border-sr-primary/10`, added circular SVG timer, Accept button `flex-[2]` with `bg-sr-primary`, Decline `flex-1` outline
- **Nearby requests**: Badge colors updated to `bg-sr-primary-fixed/20 text-sr-primary`
- **Stats cards**: Dark `bg-[#13131A] border-white/5` → white `bg-sr-surface-container-lowest border-sr-outline-variant/30 rounded-xl`
- **Active task badge**: `bg-[#00FF88]/15 text-[#00FF88]` → `bg-sr-primary-fixed/20 text-sr-primary`
- **Performance stats**: Text colors from white → `text-sr-on-surface`, `text-sr-on-surface-variant`
- **Weekly trend bars**: `bg-gradient-to-t from-[#00FF88]` → `bg-sr-primary/30`
- **All `text-[#00FF88]`**: → `text-sr-primary` (green #005f3a)
- **All `text-gray-400/500`**: → `text-sr-on-surface-variant` (#3f4941)
- **All `text-white`**: → `text-sr-on-surface` (#191c1d)
- **Kept**: ALL API calls (fetchStats, fetchActiveTask, handleToggleOnline, handleAcceptRequest, handleRejectRequest), socket listeners (driver:request, task:status:update, connect), fallback polling, data freshness tracking, all state management, request expiry timers

### 3. `/home/z/my-project/src/components/smart-ride/dashboards/merchant/merchant-dashboard.tsx`
**Changes:**
- **Background**: `bg-[#0D0D12]` → `bg-sr-surface`
- **Removed**: Dark gradient status bar (`bg-gradient-to-r from-orange-500 to-red-500`)
- **Bottom navigation**: Replaced dark nav with Stitch white nav (`bg-white rounded-t-xl sr-shadow-nav border-t border-sr-outline-variant/30`)
- **Active tab**: `text-orange-400 bg-orange-500/15` → `bg-sr-secondary-container text-sr-on-secondary-container`
- **Inactive tab**: `text-gray-500 hover:bg-white/5` → `text-sr-on-surface-variant hover:bg-sr-surface-container-high`
- **Badge**: `bg-[#FF3B5C]` → `bg-sr-error`
- **Compact 6-tab layout**: Reduced sizes (`h-4 w-4` icons, `text-[10px]` labels, `min-w-[48px]`) to fit 6 tabs
- **Kept**: All tab switching, MerchantHome/MerchantOrders/MerchantMenu/MerchantFinance/MerchantProfile/MerchantMessages rendering, useUser/useNotifications context

### 4. `/home/z/my-project/src/components/smart-ride/dashboards/merchant/tabs/merchant-home.tsx`
**Changes:**
- **Background**: `bg-[#0D0D12]` → `bg-sr-surface`
- **Header**: Dark gradient `from-orange-500 to-red-500` → light `bg-sr-surface-container-lowest sr-shadow-1`
- **Live indicator**: Added `bg-sr-primary-fixed/20 text-sr-primary` badge with green dot ("Live • Accepting Orders")
- **Store icon**: `bg-[#00FF88]` glow → `bg-sr-primary text-sr-on-primary` clean
- **Toggle**: `bg-[#00FF88]`/`bg-gray-500` → `bg-sr-primary`/`bg-gray-400`
- **Stats cards**: Dark `bg-[#13131A] border-white/5` → white `bg-sr-surface-container-lowest border-sr-outline-variant/30 rounded-xl`
- **Icon backgrounds**: `bg-orange-500/15`/`bg-[#00FF88]/15` → `bg-sr-primary/10`/`bg-sr-primary-fixed/20`
- **Pending alert**: Dark amber → light amber (`bg-amber-50 border-amber-200`)
- **Quick action colors**: Updated to use `bg-sr-primary/10 text-sr-primary` etc.
- **Preparation queue cards**: Dark → white with `bg-sr-surface-container-lowest rounded-xl`
- **Order IDs**: `text-white` → `text-sr-primary` (primary bold)
- **Item dots**: `bg-orange-400` → `bg-sr-primary`
- **Accept/Reject buttons**: `bg-gradient-to-r from-orange-500`/`bg-[#FF3B5C]/15` → `bg-sr-primary`/`bg-red-50 text-sr-error border-red-200`
- **Mark Ready**: `bg-gradient-to-r from-[#00FF88]` → `bg-sr-primary text-sr-on-primary`
- **Waiting for rider**: `text-[#00FF88] bg-[#00FF88]/10` → `text-sr-primary bg-sr-primary-fixed/10`
- **Recent orders**: Dark card → white with `divide-sr-outline-variant/30`
- **Weekly performance**: Dark → white with `text-sr-primary` accents
- **All text colors**: `text-white` → `text-sr-on-surface`, `text-gray-400/500` → `text-sr-on-surface-variant`
- **Kept**: ALL existing logic - isOnline toggle, preparationQueue, recentOrders, quick actions, stats display, onBellClick

### 5. `/home/z/my-project/src/components/smart-ride/dashboards/merchant/tabs/merchant-orders.tsx`
**Changes:**
- **Background**: `bg-gray-50` → `bg-sr-surface`
- **Header**: `bg-white border-gray-200` → `bg-sr-surface-container-lowest border-sr-outline-variant/30`
- **Search bar**: White with orange filter → `bg-sr-surface-container-lowest border-sr-outline-variant/30` with green filter icon (`bg-sr-primary/10 text-sr-primary`)
- **Added 3-tab bar**: Active state with `text-sr-primary bg-sr-surface-container-low` and 4px bottom indicator (`bg-sr-primary rounded-full`), counts as headline-md bold
- **Filter chips**: `bg-orange-600` → `bg-sr-primary text-sr-on-primary`
- **Order cards**: Added `rounded-xl sr-shadow-1` with `bg-sr-surface-container-lowest border-sr-outline-variant/30`
- **Order ID**: `text-gray-900` → `text-sr-primary` (label-md primary bold)
- **Quantity badges**: Added 32px `bg-sr-primary text-sr-on-primary` circular quantity badges replacing plain text
- **Items section**: `bg-gray-50` → `bg-sr-surface-container-low`
- **Accept/Reject**: `bg-orange-600` → `bg-sr-primary text-sr-on-primary`, reject `bg-red-100` → `bg-red-50 text-sr-error border-red-200`
- **Mark Ready**: `bg-green-600` → `bg-sr-primary text-sr-on-primary`
- **Ready for pickup rider info**: `bg-teal-50` → `bg-sr-primary-fixed/10 border-sr-primary/20`
- **Completed state**: `bg-green-50` → `bg-sr-primary-fixed/10 border-sr-primary/20`
- **Loading spinner**: `text-orange-400` → `text-sr-primary`
- **Empty state**: `text-gray-300` → `text-sr-outline-variant`
- **Refresh button**: `text-orange-600` → `text-sr-primary`
- **All text colors**: Updated to use `text-sr-on-surface`, `text-sr-on-surface-variant`
- **Kept**: ALL existing API calls (fetchOrders, handleAcceptOrder, handleRejectOrder, handleStartPreparing, handleMarkReady, handlePrintKOT), all state management, all order status state machine transitions, search/filter logic

---

## Design System Token Mapping (Dark → Stitch Light)

| Dark Theme | Stitch Light Token | Hex Value |
|---|---|---|
| `bg-[#0D0D12]` | `bg-sr-surface` | #f8f9fa |
| `bg-[#13131A]` | `bg-sr-surface-container-lowest` | #ffffff |
| `bg-[#1A1A24]` | `bg-sr-surface-container-low` | #f3f4f5 |
| `text-white` | `text-sr-on-surface` | #191c1d |
| `text-gray-400/500` | `text-sr-on-surface-variant` | #3f4941 |
| `text-[#00FF88]` | `text-sr-primary` | #005f3a |
| `bg-[#00FF88]` | `bg-sr-primary` | #005f3a |
| `border-white/5` | `border-sr-outline-variant/30` | #bec9bf |
| `bg-[#FF3B5C]` | `bg-sr-error` | #ba1a1a |
| Glassmorphism dark | `bg-white/90 backdrop-blur-[12px]` | Glass-blur light |

Lint: ✅ Passing (0 errors)
