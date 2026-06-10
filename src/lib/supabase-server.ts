/**
 * Supabase Server Client
 *
 * Provides a server-side Supabase client for database operations
 * via the REST API. This works in ALL environments (local dev,
 * Vercel, etc.) because it uses the HTTP API, not direct PostgreSQL.
 *
 * Use this for operations that need to work regardless of the
 * Prisma provider (e.g., admin login, critical auth flows).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Get a Supabase admin client (service role).
 * This bypasses RLS and can access all data.
 * ONLY use on the server side — never expose to the client.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.'
    );
  }

  _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdmin;
}

/**
 * Query the User table by email using Supabase REST API.
 * Returns the user record with all fields needed for admin login.
 */
export async function findUserByEmail(email: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('User')
    .select('id, email, name, role, status, passwordHash, phone, authProvider')
    .eq('email', email)
    .single();

  if (error) {
    // PGRST116 = no rows returned (user not found)
    if (error.code === 'PGRST116') return null;
    console.error('[Supabase] findUserByEmail error:', error);
    return null;
  }

  return data as {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    passwordHash: string | null;
    phone: string | null;
    authProvider: string | null;
  } | null;
}

/**
 * Update a user record via Supabase REST API.
 */
export async function updateUser(id: string, data: Record<string, unknown>) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('User')
    .update(data)
    .eq('id', id);

  if (error) {
    console.error('[Supabase] updateUser error:', error);
    return false;
  }
  return true;
}

/**
 * Create an audit log entry via Supabase REST API.
 */
export async function createAuditLog(entry: {
  action: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId?: string;
  userId?: string;
  description?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: string;
}) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('AuditLog').insert({
    ...entry,
    source: entry.source || 'ADMIN_DASHBOARD',
  });

  if (error) {
    console.error('[Supabase] createAuditLog error:', error);
    return false;
  }
  return true;
}
