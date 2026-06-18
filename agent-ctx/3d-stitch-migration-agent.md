# Task 3d — Stitch Design Migration for Auth, Chat, Call, and Other Screens

## Summary
Fixed dark glow borders and neon green remnants across 8 target files + 2 bonus files in the Expo mobile app, migrating all visual properties to the Stitch MD3 Green Theme design system.

## Changes Made

### 1. app/auth/forgot-password.tsx
- `rgba(0, 255, 136, 0.15)` → `rgba(0, 95, 58, 0.12)` (logoGlow, successIconContainer)
- `rgba(0, 255, 136, 0.06)` → `rgba(0, 95, 58, 0.06)` (infoContainer bg)
- `rgba(0, 255, 136, 0.12)` → `rgba(0, 95, 58, 0.12)` (infoContainer border)

### 2. app/auth/reset-password.tsx
- `rgba(0, 255, 136, 0.1)` → `rgba(0, 95, 58, 0.1)` (shieldContainer, requestNewLinkButton)
- `rgba(0, 255, 136, 0.15)` → `rgba(0, 95, 58, 0.12)` (successIconContainer)
- `rgba(0, 255, 136, 0.2)` → `rgba(0, 95, 58, 0.2)` (requestNewLinkButton border)

### 3. app/chat/index.tsx
- Glow border: `['rgba(0,255,136,0.3)', 'rgba(0,212,255,0.1)', 'transparent']` → `['#4ae176', '#98f6be', 'transparent']`
- `rgba(0, 255, 136, 0.08)` → `'#98f6be'` (emptyIconContainer bg)
- `rgba(0, 255, 136, 0.15)` → `COLORS.outlineVariant` (emptyIconContainer border)

### 4. app/call/[id].tsx
- Ambient top: `['rgba(0,255,136,0.08)', 'transparent']` → `['rgba(0,95,58,0.08)', 'transparent']`
- Ambient bottom: `['transparent', 'rgba(0,212,255,0.06)']` → `['transparent', COLORS.surfaceContainer]`
- `rgba(37, 37, 48, 0.8)` → `COLORS.surfaceContainerLow` (actionCircle bg)
- `rgba(255, 255, 255, 0.08)` → `COLORS.outlineVariant` (actionCircle border)

### 5. app/sos/index.tsx
- `rgba(255, 255, 255, 0.2)` → `COLORS.onError` (sosButtonGradient border)

### 6. app/notifications/index.tsx
- `rgba(0, 255, 136, 0.05)` → `COLORS.surfaceContainer` (ambientCircle1)
- `rgba(0, 212, 255, 0.04)` → `COLORS.surfaceContainerLow` (ambientCircle2)
- Glow border: same pattern as chat/index.tsx

### 7. app/(tabs)/index.tsx
- `#00FF88` → `COLORS.primary` (HOME_SERVICES ride customColor)

### 8. app/(tabs)/messages.tsx
- Glow border: same pattern as chat/index.tsx
- `rgba(19, 19, 26, 0.7)` → `COLORS.surfaceContainerLow` (conversationCard bg)
- `rgba(255, 255, 255, 0.05)` → `COLORS.outlineVariant` (conversationCard border)
- `COLORS.background` → `COLORS.surface` (container, header)
- `rgba(0, 255, 136, 0.08)` → `'#98f6be'` (emptyIconContainer bg)
- `rgba(0, 255, 136, 0.15)` → `COLORS.outlineVariant` (emptyIconContainer border)

### Bonus fixes
- app/global.css: scrollbar dark theme → Stitch light theme
- app/index.tsx: `rgba(255,255,255,0.05)` → `COLORS.surfaceContainerLow`

## Verification
- grep confirms zero `rgba(0, 255, 136, ...)` or `#00FF88` remain in app/ directory
- Only remaining `rgba(0, 212, 255, ...)` are in notifications CHAT type config (intentional accent color for chat notification badges)
