# Task: remaining-dashboards — Stitch Light Theme Transformation

## Summary
Transformed 20 files from dark theme (#0D0D12, #13131A, #1A1A24, #00FF88) to Stitch light design system (#f8f9fa, #ffffff, #005f3a).

## Files Changed

### Rider Dashboard Tabs (4 files)
1. **rider-tasks.tsx** — Already light theme. Changed: `bg-emerald-600` → `bg-[#005f3a]`, `hover:bg-emerald-700` → `hover:bg-[#004d30]`, `text-emerald-600` → `text-[#005f3a]`
2. **rider-earnings.tsx** — Already light theme. Changed: `from-emerald-600 to-teal-700` → `from-[#005f3a] to-[#0e7a4d]`, `bg-emerald-600` → `bg-[#005f3a]`, `bg-emerald-500` → `bg-[#0e7a4d]`, `border-emerald-500` → `border-[#005f3a]`
3. **rider-messages.tsx** — Full rewrite: `#0D0D12` → `#f8f9fa`, `#13131A` → `white`, `#1A1A24` → `#f3f4f5`, `#00FF88` → `#005f3a`, `text-white` → `text-[#191c1d]`, `text-gray-400/500` → `text-[#6f7a71]`, `border-white/5` → `border-[#bec9bf]`, `hover:bg-white/5` → `hover:bg-[#edeeef]`, neon green buttons → `bg-[#005f3a]`
4. **rider-profile.tsx** — Already light theme. Changed: `from-emerald-500 to-teal-600` → `from-[#005f3a] to-[#0e7a4d]`

### Merchant Dashboard Tabs (4 files)
5. **merchant-messages.tsx** — Full rewrite: `#0D0D12` → `#f8f9fa`, `#13131A` → `white`, `bg-orange-500` filters → `bg-[#005f3a]`, `border-white/5` → `border-[#bec9bf]`, `text-white` → `text-[#191c1d]`, `text-gray-400/500` → `text-[#6f7a71]`
6. **merchant-menu.tsx** — Already light theme. Changed: `bg-orange-600` → `bg-[#005f3a]`, `hover:bg-orange-700` → `hover:bg-[#004d30]`
7. **merchant-finance.tsx** — Already light theme. Changed: `bg-orange-600` → `bg-[#005f3a]`, `from-orange-500 to-orange-600` → `from-[#005f3a] to-[#0e7a4d]`, `text-orange-100` → `text-[#98f6be]`, `hover:bg-orange-700` → `hover:bg-[#004d30]`
8. **merchant-profile.tsx** — Full rewrite: `#0D0D12` → `#f8f9fa`, `#13131A` → `white`, `#00FF88` → `#005f3a`, `border-white/5` → `border-[#bec9bf]`, `text-white` → `text-[#191c1d]`, `text-gray-400/500` → `text-[#6f7a71]`, orange gradient → `#005f3a` gradient

### Pharmacist Dashboard (7 files)
9. **pharmacist-dashboard.tsx** — Full rewrite: `#0D0D12` → `#f8f9fa`, `#13131A` → `white`, `bg-rose-400` → `text-rose-600 bg-rose-50`, `border-white/5` → `border-[#bec9bf]`, `text-gray-500` → `text-[#6f7a71]`
10. **pharmacist-home.tsx** — Full rewrite: `#0D0D12` → `#f8f9fa`, `#13131A` → `white`, `#00FF88` → `#005f3a`, `#1A1A24` → `#f3f4f5`, `text-white` → `text-[#191c1d]`, `text-gray-400/500` → `text-[#6f7a71]`, `border-white/5` → `border-[#bec9bf]`
11. **pharmacist-orders.tsx** — Already light theme. Changed: `bg-rose-600` → `bg-[#005f3a]`, `hover:bg-rose-700` → `hover:bg-[#004d30]`, `focus:ring-rose-500` → `focus:ring-[#005f3a]`
12. **pharmacist-messages.tsx** — Full rewrite: `#0D0D12` → `#f8f9fa`, `#13131A` → `white`, `border-white/5` → `border-[#bec9bf]`, `text-white` → `text-[#191c1d]`, `text-gray-400/500` → `text-[#6f7a71]`, `bg-white/5` → `bg-[#edeeef]`
13. **pharmacist-prescriptions.tsx** — Already light theme. Changed: `bg-rose-600` → `bg-[#005f3a]`, `hover:bg-rose-700` → `hover:bg-[#004d30]`, `focus:ring-rose-500` → `focus:ring-[#005f3a]`
14. **pharmacist-inventory.tsx** — Already light theme. Changed: `bg-rose-600` → `bg-[#005f3a]`, `hover:bg-rose-700` → `hover:bg-[#004d30]`, `focus:ring-rose-500` → `focus:ring-[#005f3a]`
15. **pharmacist-profile.tsx** — Already light theme. No changes needed (uses rose gradient which is role-specific accent).

### Onboarding Screens (5 files)
16. **rider-role-selection.tsx** — Full rewrite: `#0D0D12` → `#f8f9fa`, `#13131A` → `white`, `#00FF88` → `#005f3a`, `text-white` → `text-[#191c1d]`, `text-gray-400/500` → `text-[#6f7a71]`, `border-white/5` → `border-[#bec9bf]`, `bg-white/5` → `bg-[#edeeef]`, dark info card colors → light amber equivalents
17. **rider-registration.tsx** — Full rewrite: `#0D0D12` → `#f8f9fa`, `#13131A` → `white`, `#1A1A24` → `#f3f4f5`, `#00FF88` → `#005f3a`, `text-white` → `text-[#191c1d]`, `text-gray-400/500` → `text-[#6f7a71]`, `border-white/5/10` → `border-[#bec9bf]`, neon green buttons → `bg-[#005f3a]`, box shadows updated
18. **merchant-registration.tsx** — Bulk sed transformation: `#0D0D12` → `#f8f9fa`, `#13131A` → `white`, `#1A1A24` → `#f3f4f5`, `#00FF88` → `#005f3a`, `text-white` → `text-[#191c1d]`, `text-gray-400/500` → `text-[#6f7a71]`, `border-white/5/10` → `border-[#bec9bf]`, dark info card colors → light equivalents
19. **health-provider-registration.tsx** — Bulk sed transformation: same pattern as merchant-registration, plus rose-specific dark variants (`text-rose-400` → `text-rose-600`, `bg-rose-500/15` → `bg-rose-100`, etc.)
20. **pending-approval.tsx** — Bulk sed transformation: same dark → light pattern, plus rgba glow effects updated (`rgba(0,255,136,0.15)` → `rgba(0,95,58,0.1)`, etc.)

## Color Mapping Applied
| Dark Theme | Stitch Light | Usage |
|-----------|-------------|-------|
| #0D0D12 | #f8f9fa | Main surface |
| #13131A | #ffffff | Surface container lowest |
| #1A1A24 | #f3f4f5 | Surface container low |
| #00FF88 | #005f3a | Primary |
| text-white | text-[#191c1d] | On-surface |
| text-gray-400/500 | text-[#6f7a71] | Outline |
| text-gray-300 | text-[#3f4941] | On-surface variant |
| border-white/5/10 | border-[#bec9bf] | Outline variant |
| bg-white/5 | bg-[#edeeef] | Surface container |
| hover:bg-white/5 | hover:bg-[#e7e8e9] | Surface container high |

## Lint: PASSED ✅
## Dev Server: Running on port 3000 ✅
