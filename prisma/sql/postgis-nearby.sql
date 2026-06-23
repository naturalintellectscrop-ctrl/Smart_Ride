-- ============================================================
-- Smart Ride — PostGIS proximity search for nearby drivers
-- ============================================================
-- Run ONCE against the Supabase database (SQL Editor or psql).
-- Powers GET /api/riders/nearby (ST_DWithin). Until this runs, that endpoint
-- automatically falls back to a bounding-box scan, so deploying is safe.
--
--   psql "$DATABASE_URL" -f prisma/sql/postgis-nearby.sql
-- or paste into Supabase Dashboard → SQL Editor → Run.
-- ============================================================

-- 1. Enable PostGIS (Supabase supports it; no-op if already enabled).
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. GiST index on the rider's live position as a geography point.
--    Partial index on online riders keeps it small and hot. This is what makes
--    ST_DWithin fast at scale instead of a full-table scan.
-- Note the DOUBLE parentheses around the expression — Postgres requires a
-- functional-index expression containing a cast (::) to be parenthesized.
CREATE INDEX IF NOT EXISTS rider_geog_gist
  ON "Rider"
  USING gist ((ST_SetSRID(ST_MakePoint("currentLongitude", "currentLatitude"), 4326)::geography))
  WHERE "isOnline" = true
    AND "currentLatitude" IS NOT NULL
    AND "currentLongitude" IS NOT NULL;

-- 3. The geohash column + its btree index are created by `prisma db push`
--    (added to schema.prisma). Nothing to do here for geohash.

-- Verify:
--   SELECT postgis_version();
--   \d+ "Rider"   -- should list rider_geog_gist
