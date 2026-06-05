-- ============================================
-- SMART RIDE — Create API Database Role
-- Migration 003: Create a non-superuser role for the API server
-- ============================================
--
-- CRITICAL ARCHITECTURE NOTE:
--
-- In Supabase, the `postgres` user is a SUPERUSER and BYPASSES all RLS
-- policies. This means if your API connects as `postgres`, RLS provides
-- NO protection — even with RLS enabled and policies created.
--
-- To make RLS effective, we create a custom role `smart_ride_api` that:
--   1. Has full read/write access to all tables (via GRANT)
--   2. Does NOT have BYPASSRLS privilege
--   3. Is subject to all RLS policies
--
-- The API server should connect as `smart_ride_api` instead of `postgres`.
-- The Prisma RLS middleware (src/lib/db-rls.ts) sets session variables
-- that the RLS policies check.
--
-- SETUP STEPS (run in Supabase SQL Editor):
--   1. Run this migration
--   2. Set the password for smart_ride_api: ALTER ROLE smart_ride_api LOGIN PASSWORD 'your-secure-password';
--   3. Update your DATABASE_URL to connect as smart_ride_api instead of postgres
--   4. The API server will now be subject to RLS policies
--
-- FALLBACK: If you continue connecting as `postgres`, RLS policies
-- are still useful for:
--   - Protecting access via Supabase client (anon key)
--   - Future migration to Supabase Auth
--   - Documentation of access control intent
-- ============================================

-- Create the API role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'smart_ride_api') THEN
    CREATE ROLE smart_ride_api LOGIN NOBYPASSRLS NOCREATEDB NOCREATEROLE NOSUPERUSER;
  END IF;
END
$$;

-- Grant the API role access to the public schema
GRANT USAGE ON SCHEMA public TO smart_ride_api;

-- Grant full CRUD access to all tables
-- These GRANTs allow the role to read/write all tables,
-- but RLS policies will filter WHICH rows can be accessed
GRANT ALL ON ALL TABLES IN SCHEMA public TO smart_ride_api;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO smart_ride_api;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO smart_ride_api;

-- Ensure future tables also get these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO smart_ride_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO smart_ride_api;

-- ============================================
-- Set a secure password for the API role
-- IMPORTANT: Change this password before deploying!
-- Then update DATABASE_URL in your .env and Vercel:
--   postgresql://smart_ride_api:<password>@<host>:6543/postgres
-- ============================================
-- ALTER ROLE smart_ride_api LOGIN PASSWORD 'CHANGE_ME_TO_A_SECURE_PASSWORD';

-- ============================================
-- Verification queries (run after migration):
--
-- 1. Check the role exists and has correct attributes:
--    SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'smart_ride_api';
--    Expected: smart_ride_api | false | false
--
-- 2. Check RLS is enabled on all tables:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
--
-- 3. Check policies exist:
--    SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public';
--
-- 4. Test that the API role is subject to RLS:
--    SET ROLE smart_ride_api;
--    SET app.is_service_role = 'true';
--    SELECT count(*) FROM "User";  -- Should return results (service role policy allows)
--    RESET app.is_service_role;
--    SELECT count(*) FROM "User";  -- Should return 0 (no policy allows without service role)
--    RESET ROLE;
-- ============================================
