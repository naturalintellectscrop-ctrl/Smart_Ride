-- ============================================
-- RLS CLEANUP SCRIPT (Safe Version)
-- Run this FIRST if you have partially applied RLS
-- This drops ALL existing policies and disables RLS
-- so you can start fresh with rls_complete.sql
-- Uses IF EXISTS for safety with missing tables
-- ============================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Dynamically drop ALL policies on ALL public tables
  FOR r IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Dropped policy % on %.%', r.policyname, r.schemaname, r.tablename;
  END LOOP;

  -- Disable RLS on all public tables that have it enabled
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', 'public', r.tablename);
    RAISE NOTICE 'Disabled RLS on %.%', 'public', r.tablename;
  END LOOP;

  RAISE NOTICE 'Cleanup complete. All policies dropped and RLS disabled.';
END
$$;
