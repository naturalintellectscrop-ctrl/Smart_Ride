import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ============================================
// SMART RIDE - Database Configuration
// ============================================
// RLS INTEGRATION:
// When using PostgreSQL with RLS enabled, call setRLSContext() before
// your queries to set session variables that RLS policies check.
// See supabase/migrations/rls_complete.sql for the full policy set.
// ============================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function readEnvFileVar(key: string): string | undefined {
  try {
    const envPath = resolve(process.cwd(), '.env')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const envKey = match[1].trim()
        if (envKey === key) {
          let value = match[2].trim()
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          return value
        }
      }
    }
  } catch { /* .env file might not exist in production */ }
  return undefined
}

function buildDatabaseUrl(opts?: { host?: string; port?: string }): string | undefined {
  const host = opts?.host || process.env.DB_HOST
  const port = opts?.port || process.env.DB_PORT || '5432'
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const database = process.env.DB_NAME || 'postgres'
  const sslmode = process.env.DB_SSLMODE || 'require'
  if (!host || !user || !password) return undefined
  const encodedPassword = encodeURIComponent(password)
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}?sslmode=${sslmode}`
}

function repairDatabaseUrl(url: string): string {
  try {
    const atCount = (url.match(/@/g) || []).length
    if (atCount <= 1) {
      try {
        const parsed = new URL(url)
        const password = decodeURIComponent(parsed.password || '')
        if (password && /[?$&#*]/.test(password)) {
          parsed.password = encodeURIComponent(password)
          return parsed.toString()
        }
      } catch { /* URL parsing failed */ }
    }
    const schemeEnd = url.indexOf('://')
    if (schemeEnd === -1) return url
    const afterScheme = url.substring(schemeEnd + 3)
    const hostPattern = /@([a-zA-Z0-9][\w.-]*\.\w+)/
    const hostMatch = afterScheme.match(hostPattern)
    if (!hostMatch) return url
    const hostStart = afterScheme.indexOf(hostMatch[0])
    const credentialsPart = afterScheme.substring(0, hostStart)
    const hostAndRest = afterScheme.substring(hostStart + 1)
    const colonIndex = credentialsPart.indexOf(':')
    if (colonIndex === -1) return url
    const user = credentialsPart.substring(0, colonIndex)
    const rawPassword = credentialsPart.substring(colonIndex + 1)
    const encodedPassword = encodeURIComponent(rawPassword)
    return `postgresql://${user}:${encodedPassword}@${hostAndRest}`
  } catch { return url }
}

function resolveDatabaseUrl(): string {
  // Priority 1: Build from individual DB_ env vars (preferred for RLS)
  const builtUrl = buildDatabaseUrl()
  if (builtUrl) return builtUrl

  // Priority 2: PostgreSQL URLs from system environment (skip file: URLs — those are for SQLite dev)
  const systemUrl = process.env.DATABASE_URL
  if (systemUrl && (systemUrl.startsWith('postgresql://') || systemUrl.startsWith('postgres://'))) {
    return repairDatabaseUrl(systemUrl)
  }

  // Priority 3: PostgreSQL URLs from .env file (override system file: URLs)
  const envFileUrl = readEnvFileVar('DATABASE_URL')
  if (envFileUrl && (envFileUrl.startsWith('postgresql://') || envFileUrl.startsWith('postgres://'))) {
    return envFileUrl
  }

  // Priority 4: Fallback to file: URLs (SQLite) only if no PostgreSQL URL found anywhere
  if (systemUrl && systemUrl.startsWith('file:')) return systemUrl
  if (envFileUrl && envFileUrl.startsWith('file:')) return envFileUrl

  throw new Error('DATABASE_URL must be a PostgreSQL connection string. Set DB_HOST, DB_USER, DB_PASSWORD or DATABASE_URL.')
}

/**
 * Add connection pool parameters to the datasource URL.
 * For SQLite (file:) URLs, skip URL parsing and return as-is.
 * Prevents connection exhaustion on serverless platforms (e.g. Vercel).
 */
function getDatasourceUrl(databaseUrl: string): string {
  // SQLite URLs don't support connection pool params
  if (databaseUrl.startsWith('file:')) return databaseUrl

  try {
    const url = new URL(databaseUrl)
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', process.env.DB_CONNECTION_LIMIT || '10')
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', process.env.DB_POOL_TIMEOUT || '10')
    }
    return url.toString()
  } catch {
    // If URL parsing fails, return as-is
    return databaseUrl
  }
}

function isPostgres(): boolean {
  const url = resolveDatabaseUrl()
  return url.startsWith('postgresql://') || url.startsWith('postgres://')
}

let prismaClient: PrismaClient | undefined

function getDb(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma
  const databaseUrl = resolveDatabaseUrl()
  prismaClient = new PrismaClient({
    log: ['error'],
    datasourceUrl: getDatasourceUrl(databaseUrl),
  })
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient
  return prismaClient
}

// ============================================
// RLS Context — Call before DB queries
// ============================================
// When RLS is enabled on Supabase, these session variables tell
// the RLS policies who is making the request.
//
// IMPORTANT: This is automatically called by withAuth() and
// withAdminOnly() in @/lib/auth/guards. You do NOT need to
// call this manually in most routes.
//
// How it works:
//   1. We connect as postgres (superuser) via Supabase pooler
//   2. SET ROLE smart_ride_api — switches to non-BYPASSRLS role so RLS enforces
//   3. SET app.is_service_role / current_user_id / current_user_role — RLS policy checks
//
// Access levels:
//   - Regular users (CLIENT, RIDER, etc.): is_service_role = 'false'
//     → RLS enforces user-scoped access (users see their own data)
//   - Admin users (ADMIN, SUPER_ADMIN, etc.): is_service_role = 'true'
//     → Full access via service_role_access policy (API-level auth
//       already restricts admin routes to admin roles only)
//   - System/webhook calls: is_service_role = 'true'
//     → Full access for internal operations
// ============================================

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN']

const RLS_ROLE = 'smart_ride_api'

export async function setRLSContext(
  user: { userId: string; role: string } | null,
  options?: { isServiceRole?: boolean }
): Promise<void> {
  if (!isPostgres()) return
  const client = getDb()
  const userId = user?.userId || ''
  const userRole = user?.role || ''
  // Determine service role: explicit override, or auto-detect from admin role
  const isAdmin = userRole ? ADMIN_ROLES.includes(userRole) : false
  const isServiceRole = options?.isServiceRole ?? isAdmin
  try {
    // Switch to smart_ride_api role so RLS policies are enforced
    // (postgres has BYPASSRLS, smart_ride_api does NOT)
    // NOTE: We must use $executeRawUnsafe for SET commands because PostgreSQL
    // SET does not support parameterized ($1) values via Prisma's tagged template.
    // Values are sanitized to prevent injection: userId is a cuid, role is an enum.
    await client.$executeRawUnsafe(`SET ROLE ${RLS_ROLE}`)
    await client.$executeRawUnsafe(`SET app.is_service_role = '${isServiceRole ? 'true' : 'false'}'`)
    await client.$executeRawUnsafe(`SET app.current_user_id = '${userId.replace(/'/g, "''")}'`)
    await client.$executeRawUnsafe(`SET app.current_user_role = '${userRole.replace(/'/g, "''")}'`)
  } catch (e) {
    console.error('[RLS] CRITICAL: setRLSContext failed — RLS policies may not be enforced!', e);
    // In production, a failed RLS context is a security risk
    // Consider whether to throw or continue based on your security posture
  }
}

export async function resetRLSContext(): Promise<void> {
  if (!isPostgres()) return
  const client = getDb()
  try {
    // Reset role back to postgres (superuser, no RLS)
    await client.$executeRawUnsafe('RESET ROLE')
    // Reset session variables
    await client.$executeRawUnsafe('RESET app.is_service_role')
    await client.$executeRawUnsafe('RESET app.current_user_id')
    await client.$executeRawUnsafe('RESET app.current_user_role')
  } catch (e) {
    console.error('[RLS] CRITICAL: resetRLSContext failed — RLS policies may not be enforced!', e);
    // In production, a failed RLS context is a security risk
    // Consider whether to throw or continue based on your security posture
  }
}

/**
 * Set RLS context for service role (system/webhook operations).
 * Use this for routes that need full DB access without a user context.
 */
export async function setServiceRoleContext(): Promise<void> {
  if (!isPostgres()) return
  const client = getDb()
  try {
    await client.$executeRawUnsafe(`SET ROLE ${RLS_ROLE}`)
    await client.$executeRawUnsafe(`SET app.is_service_role = 'true'`)
    await client.$executeRawUnsafe(`SET app.current_user_id = ''`)
    await client.$executeRawUnsafe(`SET app.current_user_role = 'SYSTEM'`)
  } catch (e) {
    console.error('[RLS] CRITICAL: setServiceRoleContext failed — RLS policies may not be enforced!', e);
    // In production, a failed RLS context is a security risk
    // Consider whether to throw or continue based on your security posture
  }
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb()
    const value = (client as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') return value.bind(client)
    return value
  },
})
