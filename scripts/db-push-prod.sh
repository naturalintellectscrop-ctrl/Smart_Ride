#!/usr/bin/env bash
# ============================================
# Smart Ride - Push Prisma schema to PRODUCTION database
# ============================================
# Usage:
#   DATABASE_URL="postgresql://user:pass@host:port/db" bun run db:push:prod
#
# OR set it inline:
#   DATABASE_URL="postgresql://..." bun run scripts/db-push-prod.sh
#
# This script:
#   1. Temporarily swaps prisma/schema.prisma provider sqlite -> postgresql
#   2. Runs prisma db push against DATABASE_URL
#   3. Restores the provider back to sqlite (for local dev)
#
# WHY: Local dev uses SQLite (file: URL), production uses PostgreSQL.
# Prisma requires the schema provider to match the DATABASE_URL protocol.
# This script handles the swap so you don't have to remember.
# ============================================

set -euo pipefail

SCHEMA_FILE="prisma/schema.prisma"

# --- Validate DATABASE_URL is set and is PostgreSQL ---
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Get it from: Vercel dashboard → your project → Settings → Environment Variables → DATABASE_URL (Production)"
  echo ""
  echo "Then run:"
  echo "  DATABASE_URL=\"postgresql://...\" bun run scripts/db-push-prod.sh"
  exit 1
fi

if [[ ! "$DATABASE_URL" =~ ^postgres(ql)?:// ]]; then
  echo "ERROR: DATABASE_URL must start with postgresql:// or postgres://"
  echo "Got: ${DATABASE_URL:0:20}..."
  echo "(Your local .env has a file: SQLite URL — you need the PRODUCTION PostgreSQL URL from Vercel)"
  exit 1
fi

echo "✓ DATABASE_URL is PostgreSQL"
echo ""

# --- Save original provider and swap to postgresql ---
ORIGINAL_PROVIDER=$(grep -E '^\s*provider\s*=' "$SCHEMA_FILE" | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
echo "Current schema provider: $ORIGINAL_PROVIDER"

if [ "$ORIGINAL_PROVIDER" != "postgresql" ]; then
  echo "→ Temporarily swapping to postgresql for production push..."
  sed -i.bak -E 's/(\s*provider\s*=\s*")sqlite(")/\1postgresql\2/' "$SCHEMA_FILE"
  # shellcheck disable=SC2064
  trap "echo '→ Restoring provider back to $ORIGINAL_PROVIDER...'; mv \"$SCHEMA_FILE.bak\" \"$SCHEMA_FILE\"; echo '✓ Restored'" EXIT
fi

echo ""
echo "=== Running prisma db push against PRODUCTION ==="
echo "  Target: ${DATABASE_URL#*://*}"  # hide credentials
echo ""

# Run the push
npx prisma db push --skip-generate

echo ""
echo "✓ Production database schema updated successfully."
echo "  The DRIVER role is now a valid UserRole in production."
