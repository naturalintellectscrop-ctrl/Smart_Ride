# Task 4-g2: Migrate Smart Ride API routes (Batch 2) to use RLS context

## Task ID: 4-g2
## Agent: subagent
## Status: COMPLETED

## Summary
Migrated 35 out of 36 assigned API routes to use Row-Level Security (RLS) context with Supabase PostgreSQL. All routes now properly call `setServiceRoleContext()` or `setRLSContext()` before DB queries and `resetRLSContext()` in a finally block.

## Routes Migrated: 35
## Routes Skipped: 1 (notifications/token — no active DB queries)

## Migration Patterns Applied
- **Public/system routes** → `setServiceRoleContext()` + `try/finally { resetRLSContext() }`
- **Registration routes** → `setServiceRoleContext()` (need superuser access to create users)
- **Webhook/callback routes** → `setServiceRoleContext()` AFTER signature verification + `try/finally { resetRLSContext() }`
- **Authenticated routes** (tasks/[id]) → `setRLSContext(user)` + `try/finally { resetRLSContext() }`

## Key Decisions
- All imports merged with existing `@/lib/db` import for cleaner code
- For payment callback routes (airtel, mtn, flutterwave): setServiceRoleContext() placed AFTER webhook signature verification
- For registration routes (merchants/register, riders/register): used setServiceRoleContext() since they need superuser access to create user accounts
- For rides/route.ts: used setServiceRoleContext() since its Bearer token parsing is non-standard
- For tasks/[id]/route.ts: used setRLSContext(user) with requireAuth user context since it has proper authentication

## Verification
- `bun run lint` — passes clean
- Dev server compiles clean
