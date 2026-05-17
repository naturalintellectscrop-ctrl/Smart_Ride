import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ============================================
// SMART RIDE - Database Configuration
// ============================================
// Supabase PostgreSQL (Free Tier)
// - DATABASE_URL: Pooler connection (transaction mode, port 6543)
// - DIRECT_URL: Direct connection (session mode, port 5432) for migrations
//
// Supports two configuration methods:
// 1. DATABASE_URL / DIRECT_URL - Full connection strings (URL-encode special chars in password)
// 2. Individual components (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME) -
//    We URL-encode the password automatically, avoiding Vercel encoding issues
// ============================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Read a variable from the .env file directly
 * This ensures we get the correct value even if system env vars override it
 */
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
          // Remove surrounding quotes
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          return value
        }
      }
    }
  } catch {
    // .env file might not exist in production (Vercel uses dashboard env vars)
  }
  return undefined
}

/**
 * Build a PostgreSQL connection URL from individual components
 * This avoids URL-encoding issues with special characters in passwords
 */
function buildDatabaseUrl(opts?: { host?: string; port?: string }): string | undefined {
  const host = opts?.host || process.env.DB_HOST
  const port = opts?.port || process.env.DB_PORT || '5432'
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const database = process.env.DB_NAME || 'postgres'
  const sslmode = process.env.DB_SSLMODE || 'require'

  if (!host || !user || !password) {
    return undefined
  }

  // URL-encode the password to handle special characters
  const encodedPassword = encodeURIComponent(password)
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}?sslmode=${sslmode}`
}

/**
 * Resolve the database URL using multiple fallback strategies
 */
function resolveDatabaseUrl(): string {
  // Strategy 1: Individual DB components (most reliable on Vercel)
  // Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME on Vercel to avoid URL encoding issues
  const builtUrl = buildDatabaseUrl({ port: process.env.DB_PORT || '6543' })
  if (builtUrl) {
    return builtUrl
  }

  // Strategy 2: process.env.DATABASE_URL if it's a PostgreSQL URL
  const systemUrl = process.env.DATABASE_URL
  if (systemUrl && (systemUrl.startsWith('postgresql://') || systemUrl.startsWith('postgres://'))) {
    return systemUrl
  }

  // Strategy 3: .env file DATABASE_URL (for dev environments)
  const envFileUrl = readEnvFileVar('DATABASE_URL')
  if (envFileUrl && (envFileUrl.startsWith('postgresql://') || envFileUrl.startsWith('postgres://'))) {
    return envFileUrl
  }

  // No valid database URL found
  throw new Error(
    'DATABASE_URL must be a PostgreSQL connection string. ' +
    'Please set DATABASE_URL in your Vercel dashboard or .env file. ' +
    'Alternatively, set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME individually.'
  )
}

let prismaClient: PrismaClient | undefined

function getDb(): PrismaClient {
  // Return cached client if available
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  const databaseUrl = resolveDatabaseUrl()

  prismaClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
    datasourceUrl: databaseUrl,
  })

  // Cache in global for development hot-reload
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaClient
  }

  return prismaClient
}

// Lazy initialization - only create the client when first accessed
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb()
    const value = (client as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
