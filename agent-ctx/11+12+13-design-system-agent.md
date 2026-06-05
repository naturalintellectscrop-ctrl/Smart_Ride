# Task 11+12+13 — Stitch Design System Merge

## Agent: Design System Agent
## Task: Merge Stitch designs into existing Smart Ride application

---

### Summary of Changes

All 5 files were transformed from dark-theme (#0D0D12 / #13131A / #1A1A24) to the Stitch design system while **preserving ALL existing functionality** (SOS alert logic, API calls, emergency contact calling, location sharing, messaging logic, socket connections, call state machines, mute/speaker toggles, call duration tracking, etc.).

---

### 1. `sos-button.tsx`
**Changes:**
- Inline variant: Changed from dark bg (`bg-[#1A1A24]`) to light bg (`bg-white`) with `border-[#bec9bf]`
- Active state: Changed from `red-500/20` to `bg-[#ba1a1a]/10` with error color `#ba1a1a`
- Floating variant: Changed button border from `border-2` to `border-[4px] border-white/20` (Stitch spec)
- Error color: Changed from `#EF4444` to `#ba1a1a` throughout
- Large variant: Now shows "SOS" text instead of icon (Stitch spec for 128×128 button)
- SOSStatusBadge: Changed from `bg-red-600/90` gradient to solid `bg-[#ba1a1a]` with `border-white/20`
- All progress ring colors updated to `#ba1a1a`
- **Preserved:** All hold-to-activate logic, progress animation, press/cancel handlers, position classes

### 2. `sos-emergency-screen.tsx`
**Changes:**
- Background: Changed from `bg-[#0D0D12]` to `bg-[#f8f9fa]` (Surface #f8f9fa)
- Header: New Stitch header with `h-14 bg-white border-b`, back arrow + "Emergency SOS" title
- Emergency Response Section: New white card (`bg-white rounded-xl shadow-sm border border-[#bec9bf]/30`)
- Slide-to-Alert: New `h-16 bg-[#121414] rounded-full` with white 48px thumb circle and shimmer text animation
- SOS Button: Now 128×128 circle, `bg-[#ba1a1a]`, `border-[4px] border-white/20`, ping animation, "SOS" text
- Trip Details: New driver avatar (48px/w-12), name + "On Trip" pill badge (`bg-[#0e7a4d]/10 text-[#005f3a]`)
- Trusted Contacts: New toggle switches (`w-11 h-6`, `bg-[#005f3a]` when checked, `bg-[#bec9bf]` when unchecked)
- Security Call Button: New full-width `h-14 bg-[#0e7a4d]` button
- Privacy Footer: New `Verified` icon + italic text
- All cards changed from `bg-[#13131A]` to `bg-white` with `border-[#bec9bf]/30`
- All text colors updated: `text-white` → `text-[#191c1d]`, `text-white/40` → `text-[#6f7a71]`, etc.
- Contact Manager Modal: Changed to light theme with white bg, `bg-[#f3f4f5]` items
- QuickAction sub-component: Simplified to 4 color variants (error, primary, secondary, outline)
- **Preserved:** ALL SOS alert logic, API calls to /api/sos, emergency contact calling, location sharing, WhatsApp sharing, SMS messaging, audio recording, all callbacks, cancel SOS confirmation flow

### 3. `messaging-screen.tsx`
**Changes:**
- Background: Changed from `bg-[#0D0D12]` to `bg-[#f8f9fa]`
- Conversation list: Cards changed from `bg-[#13131A]` to `bg-white` with border
- Header: White bg, clean border, `text-[#191c1d]` titles
- Filter tabs: Active changed from `bg-[#00FF88]` to `bg-[#005f3a]` (Primary)
- Chat header: New back arrow + name with online dot (`animate-pulse`) + call icon
- Secure Badge: New centered pill `bg-[#e7e8e9]` with `Lock` icon + "End-to-end encrypted"
- System messages: `bg-[#f3f4f5] border border-[#bec9bf]/30`, italic text
- Chat bubbles: Right (user) → `bg-[#0e7a4d]` with `rounded-br-[4px]`; Left (other) → `bg-[#e1e3e4]` with `rounded-bl-[4px]`; max-width 80%, shadow-sm
- Timestamps: `text-[10px]` in `text-[#6f7a71]`; double checkmarks in `text-[#4ae176]`
- Input bar: `AddCircle` + `ImageIcon` buttons, `rounded-full` input with `bg-[#f3f4f5]`, send button `bg-[#6bff8f]`
- Chat height: `calc(100vh - 64px - 80px)`
- **Preserved:** ALL messaging logic, API calls, MaskedCallButton integration, sendMessage, quickReplies, markAsRead, conversation management

### 4. `enhanced-messaging-screen.tsx`
**Changes:**
- Same design system changes as messaging-screen.tsx
- MiniMap: Changed to `aspect-video rounded-xl`, light map style (`mapbox/light-v11`), white status overlay with `bg-white/80 backdrop-blur-sm`, gradient overlay
- Call Modal: Dark overlay design with `bg-gradient-to-b from-[#191c1d] to-[#2e3132]`, `#4ae176` accent, call controls at Stitch spec sizes (Mute 64px, End Call 80px bg-[#ba1a1a], Speaker 64px)
- **Preserved:** ALL messaging logic, API calls, socket connections, conversation management, map integration, call modal with full state machine

### 5. `call-interface.tsx`
**Changes:**
- Background: Full-screen dark overlay with map-like gradient + blur overlay (`backdrop-blur-[12px] bg-[rgba(17,24,39,0.85)]`)
- Header: New "Secure In-app Call" title with `Phone` icon + `VerifiedUser` icon + "End-to-end encrypted" label in `text-[#4ae176]`
- Caller Profile: Large avatar `w-48 h-48` (192px) with `border-4 border-[#0e7a4d]` (primary-container), pulsing ring animations
- Call Timer: MM:SS format maintained, now in white on dark
- Privacy Badge: New `bg-[#e1e3e4]/10 backdrop-blur-sm` with `Lock` icon + "Phone number protected" text
- Call Controls: Mute (64px/w-16), End Call (80px/w-20 bg-[#ba1a1a]), Speaker (64px/w-16), all `rounded-full`
- Accept button: Changed from `bg-[#00FF88]` to `bg-[#005f3a]`
- Signal quality indicator colors updated to use `#4ae176` for good, `#ba1a1a` for poor
- **Preserved:** ALL call logic, API calls to /api/calling, masked calling, mute/speaker toggle, call duration tracking, incoming/connecting/active/ended state machine, auto-close timer, callback/message/report end actions

---

### Design System Color Mapping Applied

| Old Color | New Color | Design Token |
|-----------|-----------|-------------|
| `#0D0D12` (bg) | `#f8f9fa` | Surface |
| `#13131A` (cards) | `#ffffff` | Surface container lowest |
| `#1A1A24` (items) | `#f3f4f5` | Surface container low |
| `#00FF88` (accent) | `#005f3a` | Primary |
| `#00FF88/10` | `#0e7a4d/10` | Primary container |
| `#EF4444` (red) | `#ba1a1a` | Error |
| `white/10, white/5` | `#bec9bf/30` | Outline variant |
| `text-white` | `text-[#191c1d]` | On-surface |
| `text-white/40` | `text-[#6f7a71]` | Outline |
| `text-white/70` | `text-[#3f4941]` | On-surface variant |
