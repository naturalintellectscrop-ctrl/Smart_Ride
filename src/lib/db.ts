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
// We read the .env file directly as a fallback to ensure the correct
// PostgreSQL URL is always used, even when system env vars have stale values.
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

function resolveDatabaseUrl(): string {
  // Priority:
  // 1. process.env.DATABASE_URL if it's a PostgreSQL URL (works for Vercel dashboard env vars)
  // 2. .env file DATABASE_URL (for dev environments where system env has stale values)
  const systemUrl = process.env.DATABASE_URL

  if (systemUrl && (systemUrl.startsWith('postgresql://') || systemUrl.startsWith('postgres://'))) {
    return systemUrl
  }

  // Fall back to .env file (which has the correct Supabase URL)
  const envFileUrl = readEnvFileVar('DATABASE_URL')
  if (envFileUrl && (envFileUrl.startsWith('postgresql://') || envFileUrl.startsWith('postgres://'))) {
    return envFileUrl
  }

  // Last resort: return whatever DATABASE_URL is set to (might fail later)
  if (systemUrl) {
    console.error(
      `[Smart Ride] WARNING: DATABASE_URL is not PostgreSQL: ${systemUrl.substring(0, 30)}...`
    )
  }

  throw new Error(
    'DATABASE_URL must be a PostgreSQL connection string. ' +
    'Please set DATABASE_URL in your Vercel dashboard or .env file.'
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
