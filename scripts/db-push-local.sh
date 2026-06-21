#!/usr/bin/env bash
# ============================================
# Smart Ride - Push Prisma schema to LOCAL SQLite database
# ============================================
# Usage:
#   bun run db:push:local
#
# This script:
#   1. Temporarily swaps prisma/schema.prisma provider postgresql -> sqlite
#   2. Runs prisma db push against the local DATABASE_URL (file: protocol)
#   3. Restores the provider back to postgresql (for production/Vercel)
#
# WHY: The committed schema uses provider = "postgresql" so that Vercel
# production builds generate a PostgreSQL-compatible Prisma Client. But
# local dev uses a SQLite file database (DATABASE_URL = file:...). Prisma
# requires the schema provider to match the DATABASE_URL protocol, so we
# swap temporarily for local db:push only.
#
# IMPORTANT: Never commit the schema with provider = "sqlite" — that breaks
# the Vercel production build (Prisma Client can't connect to PostgreSQL).
# ============================================

set -euo pipefail

SCHEMA_FILE="prisma/schema.prisma"

# --- Validate we're not about to break anything ---
if [ ! -f "$SCHEMA_FILE" ]; then
  echo "ERROR: $SCHEMA_FILE not found. Run from project root."
  exit 1
fi

# Check current provider
CURRENT_PROVIDER=$(grep -A2 'datasource db' "$SCHEMA_FILE" | grep -E '^\s*provider\s*=' | head -1 | sed -E 's/.*"([^"]+)".*/\1/')

if [ "$CURRENT_PROVIDER" = "sqlite" ]; then
  echo "Schema is already sqlite — running prisma db push directly..."
  npx prisma db push --skip-generate
  echo ""
  echo "⚠️  WARNING: schema.prisma has provider = \"sqlite\"."
  echo "   This BREAKS Vercel production builds. Run this script to fix:"
  echo "   sed -i 's/provider = \"sqlite\"/provider = \"postgresql\"/' prisma/schema.prisma"
  exit 0
fi

echo "Current schema provider: $CURRENT_PROVIDER"
echo "→ Temporarily swapping to sqlite for local push..."
echo ""

# Swap to sqlite
sed -i.bak -E 's/(\s*provider\s*=\s*")postgresql(")/\1sqlite\2/' "$SCHEMA_FILE"

# Restore on exit (even if push fails)
restore() {
  echo ""
  echo "→ Restoring provider back to postgresql..."
  mv "$SCHEMA_FILE.bak" "$SCHEMA_FILE"
  echo "✓ Restored. Schema committed with provider = postgresql (safe for Vercel)."
}
trap restore EXIT

# Verify the swap worked
NEW_PROVIDER=$(grep -A2 'datasource db' "$SCHEMA_FILE" | grep -E '^\s*provider\s*=' | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
if [ "$NEW_PROVIDER" != "sqlite" ]; then
  echo "ERROR: Failed to swap provider to sqlite. Aborting."
  exit 1
fi

echo "=== Running prisma db push against LOCAL SQLite ==="
echo ""

npx prisma db push --skip-generate

echo ""
echo "✓ Local SQLite database schema updated."
