# Task ID: D6, D7
# Agent: Full-stack Implementation Agent

## Task Summary
Implemented two features in the Smart Ride project:

### Task D6 — Saved Addresses CRUD
- Added `SavedAddress` Prisma model + inverse relation on `User`.
- Backend routes: `GET/POST /api/user/addresses` and `PATCH/DELETE /api/user/addresses/[addressId]`.
- Expo API client: added PATCH support to `request<T>()`; added `getSavedAddresses`, `addSavedAddress`, `updateSavedAddress`, `deleteSavedAddress` methods.
- New screen `expo-app/app/profile/saved-addresses.tsx` — full CRUD with list, empty state, add/edit modal (label + presets, address, "Use Current Location" via locationStore, default toggle), delete confirmation, set-as-default quick action.
- Wired route in `_layout.tsx` and updated profile menu item to navigate instead of showing "Coming Soon".

### Task D7 — Delete Account
- Added `DELETED` to `UserStatus` Prisma enum.
- Backend route `POST /api/auth/delete-account` — verifies password against `passwordHash` (NOT `password` as in the task description — confirmed via Prisma schema), performs soft delete (anonymize PII, set status DELETED), hard-deletes Sessions and ExpoPushTokens.
- Expo API client: added `deleteAccount(password)` method.
- New screen `expo-app/app/profile/delete-account.tsx` — danger-themed confirmation with warning hero, consequences list, password input, type-DELETE confirmation, success → logout → redirect to login.
- Wired route in `_layout.tsx`. Added "Delete Account" menu item with `danger: true` flag; extended `MenuItem` to render danger items in error red.

## Notes for Next Agents
- The existing `src/app/api/auth/change-password/route.ts` uses `user.password` but the Prisma schema field is `passwordHash`. This is a latent bug in pre-existing code — I did NOT fix it (out of scope). My `delete-account` route correctly uses `passwordHash`.
- The `ExpoPushToken` Prisma model has `onDelete: Cascade` from User, so the explicit `expoPushToken.deleteMany` in delete-account is belt-and-suspenders. Same for `Session`.
- `request<T>()` in `api.ts` now supports `'PATCH'` as a method.

## Files Touched
- `prisma/schema.prisma`
- `src/app/api/user/addresses/route.ts` (new)
- `src/app/api/user/addresses/[addressId]/route.ts` (new)
- `src/app/api/auth/delete-account/route.ts` (new)
- `expo-app/src/services/api.ts`
- `expo-app/app/profile/saved-addresses.tsx` (new)
- `expo-app/app/profile/delete-account.tsx` (new)
- `expo-app/app/_layout.tsx`
- `expo-app/app/(tabs)/profile.tsx`

## Verification
- `bun run lint` — passes with no errors.
- `npx tsc --noEmit` — no errors in new files (pre-existing errors in unrelated files untouched).
- `bun run db:push` — schema synced.
