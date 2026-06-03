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
  const builtUrl = buildDatabaseUrl({ port: process.env.DB_PORT || '6543' })
  if (builtUrl) return builtUrl
  const systemUrl = process.env.DATABASE_URL
  if (systemUrl) {
    if (systemUrl.startsWith('postgresql://') || systemUrl.startsWith('postgres://')) return repairDatabaseUrl(systemUrl)
    if (systemUrl.startsWith('file:')) return systemUrl
  }
  const envFileUrl = readEnvFileVar('DATABASE_URL')
  if (envFileUrl) {
    if (envFileUrl.startsWith('postgresql://') || envFileUrl.startsWith('postgres://')) return envFileUrl
    if (envFileUrl.startsWith('file:')) return envFileUrl
  }
  throw new Error('DATABASE_URL must be a PostgreSQL connection string.')
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
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
    datasourceUrl: databaseUrl,
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
// Usage in API routes:
//   import { db, setRLSContext, resetRLSContext } from '@/lib/db'
//   const user = getAuthUser(req)
//   await setRLSContext(user)
//   try { ... } finally { await resetRLSContext() }
// ============================================

export async function setRLSContext(user: { userId: string; role: string } | null): Promise<void> {
  if (!isPostgres()) return
  const client = getDb()
  const userId = user?.userId || ''
  const userRole = user?.role || ''
  try {
    await client.$executeRawUnsafe(
      `SET app.is_service_role = 'true'; ` +
      `SET app.current_user_id = '${userId.replace(/'/g, "''")}'; ` +
      `SET app.current_user_role = '${userRole}';`
    )
  } catch { /* Silently ignore if SET fails (e.g., SQLite) */ }
}

export async function resetRLSContext(): Promise<void> {
  if (!isPostgres()) return
  const client = getDb()
  try {
    await client.$executeRawUnsafe(
      `RESET app.is_service_role; ` +
      `RESET app.current_user_id; ` +
      `RESET app.current_user_role;`
    )
  } catch { /* Silently ignore */ }
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb()
    const value = (client as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') return value.bind(client)
    return value
  },
})
