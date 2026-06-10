# Task 7-a: Startup Environment Validation + Production Dockerfile

## Summary
Created startup environment validation, production Dockerfile, and wired env validation into health endpoint.

## Files Created
- `/src/lib/config/env.ts` — Startup environment validation with validateEnv(), isFeatureAvailable(), getEnvStatus()
- `/Dockerfile` — Multi-stage production build (deps → builder → runner)
- `/.dockerignore` — Excludes non-essential files from Docker context
- `/docker-compose.yml` — Local dev setup with PostgreSQL + app service

## Files Modified
- `/src/app/api/health/startup/route.ts` — Added getEnvStatus() integration, features in response

## Key Decisions
- Replaced existing env.ts (which exported actual values) with new module that NEVER exposes values
- CRITICAL vars throw in production, warn in development
- Feature availability is per-category (all vars must be present for feature to be "available")
- Dockerfile uses standalone Next.js output for minimal image size
- Non-root user (nextjs:nodejs) for security
- Healthcheck uses /api/health (liveness probe, no DB dependency)
