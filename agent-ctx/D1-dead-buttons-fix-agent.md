# Task D1 — Fix dead buttons and non-functional features (Smart Ride Expo mobile app)

**Agent**: code-agent
**Scope**: Mobile-only fixes — no web/backend changes
**Date:** 2026-06-16

## Files Touched
- `expo-app/app/merchant/index.tsx` — wired Profile action card to `/profile/edit`
- `expo-app/app/chat/index.tsx` — added working chat search (state + filter + UI), fixed Book a Ride button to go to ride-request
- `expo-app/app/orders/cart.tsx` — added inline address editor for the Change button
- `expo-app/app/auth/login.tsx` — wired Terms/Privacy text to Linking.openURL
- `expo-app/app/auth/phone-login.tsx` — wired Terms/Privacy text to Linking.openURL
- `expo-app/app/auth/register.tsx` — restructured terms row so checkbox toggle is separate from link taps; wired links
- `expo-app/app/chat/[id].tsx` — real location sharing via useLocationStore + LOCATION bubble rendering with map deep-link
- `expo-app/src/store/chatStore.ts` — extended Message type with `LOCATION` + `metadata`; sendMessage forwards metadata

## Key Decisions
- Used `useLocationStore.getState()` inside `handleShareLocation`'s alert callback so we read fresh coords without subscribing.
- For LOCATION bubble rendering, used `Linking.openURL` with platform-specific schemes (`maps:` on iOS, `geo:` on Android) instead of pulling in a map library.
- For the register.tsx terms row, restructured to make the checkbox a separate `TouchableOpacity` (no stopPropagation hack), keeping links independently tappable.
- For the cart "Change" address button, went with an inline TextInput editor (Cancel/Save) instead of a modal — simpler and matches the existing instructions input pattern.
- Updated `chatStore.ts` Message type so `metadata` and `LOCATION` type flow through both optimistic and server-message paths.

## Lint
`bun run lint` — passes (no errors).

See `/home/z/my-project/worklog.md` (Task ID: D1) for the full change list.
