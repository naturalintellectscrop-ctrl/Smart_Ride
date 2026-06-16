# D8 — Health Prescriptions Client + KYC Document Upload

**Agent**: fullstack-developer (D8)
**Task ID**: D8
**Date**: 2026-06-16

## Summary

Implemented two features in the Smart Ride mobile app:

1. **Health Prescriptions Client Screen** — Replaced the "Coming Soon" placeholder at `expo-app/app/health/prescriptions.tsx` with a full client-side prescriptions screen that lets users upload, view, and track their own prescriptions. Added authentication + user-scoping to the backend prescription routes and added prescription + document-upload methods to the mobile API service.

2. **KYC Document Upload for Rider Onboarding** — Enhanced the rider onboarding documents step (`expo-app/app/rider/onboarding.tsx`) to support real image uploads (rider selfie, National ID front/back, driving license, vehicle photo) via `/uploads/documents`. Added a new `vehiclePhotoUrl` field to the Rider Prisma model, added GET/PUT handlers to `/api/riders/onboarding`, and updated `/api/riders/register` to accept either URL strings or base64 data URLs for documents.

## Files Modified

### Backend (Next.js API routes)
- `prisma/schema.prisma` — Added `vehiclePhotoUrl String?` to the `Rider` model. Ran `bun run db:push` (SQLite sync succeeded).
- `src/app/api/prescriptions/route.ts` — Replaced unauthenticated list/create handlers with `requireAuth`-based handlers. GET now scopes by role: clients only see their own prescriptions; pharmacists/admins may filter by `clientId`/`status`/`search`. POST uses the authenticated user's id as `clientId` (admins may override). Schema now accepts `imageUrl` (uploaded separately) instead of requiring base64 `imageData`.
- `src/app/api/prescriptions/[id]/route.ts` — Added `requireAuth` to GET/PATCH/DELETE. Clients can only view/delete their own prescriptions. PATCH now uses the authenticated user as `verifiedBy` when not provided. `verifiedBy` is now optional in the Zod schema.
- `src/app/api/riders/onboarding/route.ts` — Added new `GET` (returns the rider's current onboarding state, reconstructing `personal`/`documents`/`vehicle` step data) and `PUT` (persists a single step's data as draft; updates Rider document URLs and Vehicle record where applicable). Kept the existing `POST` (registers a new rider).
- `src/app/api/riders/register/route.ts` — Reworked to accept both legacy base64 data URLs and plain URL strings (from `/uploads/documents`). Added field aliases (`address`, `plateNumber`, `model`, `color`, `riderRole`) and new top-level URL fields (`photoUrl`, `nationalIdFrontUrl`, `nationalIdBackUrl`, `driverLicenseUrl`, `vehiclePhotoUrl`). `fileSize` is now computed safely (returns `null` for URL strings instead of crashing on `Buffer.from(undefined, 'base64')`). Persists document URLs directly on the `Rider` record and creates `Document` rows for traceability.

### Mobile (Expo app)
- `expo-app/src/services/api.ts`:
  - Changed `updateRiderOnboarding(step: number, ...)` to `updateRiderOnboarding(step: string | number, ...)` to match the onboarding screen's call sites.
  - Expanded `registerRider(...)` type signature to include all new fields and aliases.
  - Added **Prescriptions** API methods: `getPrescriptions(status?)`, `uploadPrescription(data)`, `getPrescription(id)`, `verifyPrescription(id, { notes, healthOrderId })`, `rejectPrescription(id, reason)`, `deletePrescription(id)`.
  - Added a generic **`uploadDocument(file, documentType?)`** method that posts `multipart/form-data` to `/uploads/documents` and returns `{ url, key, filename }`. Handles timeouts via `AbortController` and 401 retry via the existing token-refresh flow inside `secureStorage`.
- `expo-app/app/health/prescriptions.tsx` — Full rewrite. New screen features:
  - Header with back button + "My Prescriptions" title.
  - Prominent "Upload Prescription" primary button.
  - List of prescription cards (thumbnail, prescription number, status badge, doctor/clinic, notes, rejection/verification reason, "View Image" action).
  - Pull-to-refresh, loading state, error state with retry, and an empty state ("No prescriptions yet. Upload your first prescription.").
  - Bottom-sheet upload modal with image picker (`pickImage` from `@/src/utils/imagePicker`), doctor-name input, notes textarea, two-step upload (POST to `/uploads/documents` → POST to `/prescriptions`), progress text, cancel/upload buttons.
  - Fullscreen image viewer modal for inspecting prescription images.
  - Stitch MD3 design system (light theme, primary `#005f3a`, GlassCard, GradientButton, StatusBadge, Linear-Gradient header glow).
- `expo-app/app/rider/onboarding.tsx` — Replaced the text-only documents step with real KYC uploads:
  - New `DocumentUploadCard` reusable component (placeholder + Retake/Remove actions + uploading spinner).
  - New documents state shape with URL fields: `nationalIdFront`, `nationalIdBack`, `licenseNumber`, `licenseExpiry`, `licensePhoto`, `vehiclePhoto`, `photoUrl`.
  - `handleUploadDocument(field)` uses `pickImage({ aspect: [4, 3], quality: 0.7 })` then `api.uploadDocument(...)` and stores the returned URL.
  - Step 2 now collects: rider selfie (required), National ID front (required), National ID back (required), license number + expiry (text), driving-license photo (required for drivers), vehicle photo (optional).
  - `validateStep2()` enforces required uploads based on vehicle type.
  - Submit handler maps the UI vehicle type to a `riderRoleType` (`MOTORCYCLE → SMART_BODA`, `CAR → SMART_CAR`, otherwise `DELIVERY_PERSONNEL`) and passes the document URLs plus personal + vehicle data to `api.registerRider(...)`.
  - Bottom-bar Continue button is disabled while any document upload is in-flight.

## Verification

- `bun run lint` — passes with no errors.
- `bun run db:push` — Prisma schema synced (SQLite, `db/custom.db`); Prisma client regenerated.
- Dev server (`bun run dev`) — running cleanly, no compile errors in the latest log entries.

## Notes / Decisions

- The existing `/api/uploads/documents` endpoint returns `{ success, url, key, filename, ... }` at the top level (not nested under `data`). The new `api.uploadDocument` method normalises this into `{ success, data: { url, key, filename } }` so callers can use the standard `response.data.url` pattern.
- The Prisma `Prescription.clientId` field references `User.id`, so the authenticated user's `userId` is used directly as the `clientId` for client uploads. No separate Client model exists.
- `requireAuth` returns `Promise<JWTPayload | NextResponse>`. The pattern `if (authResult instanceof NextResponse) return authResult; const user = authResult as JWTPayload;` is used (matching the existing uploads routes).
- The previous `POST /api/prescriptions` route accepted `clientId` in the body. The new auth-scoped version uses the authenticated user's id automatically (admins can still override via `clientId` in the body) for security.
- The previous `PATCH /api/prescriptions/[id]` route required `verifiedBy` in the body. It's now optional and defaults to the authenticated user, so the pharmacist screen's `verifyPrescription(id, { notes })` call works without changes.
