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
// Supports multiple configuration methods:
// 1. Individual components (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) -
//    Auto-encodes password, most reliable on Vercel
// 2. DATABASE_URL / DIRECT_URL - Full connection strings
//    (must URL-encode special chars in password)
// 3. Auto-repair: If DATABASE_URL has auth issues, tries to fix
//    URL encoding in the password portion
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
 * Fix a DATABASE_URL that may have an unencoded password
 *
 * When users set DATABASE_URL on the Vercel dashboard and include a password
 * with special characters (like ?, $, &, *, #), those characters may not be
 * URL-encoded properly. This function tries to repair the URL by extracting
 * the password portion and re-encoding it.
 *
 * Example broken URL:
 *   postgresql://user:y?Fa$&G-X.vqY*3@host:5432/db
 * Fixed URL:
 *   postgresql://user:y%3FFa%24%26G-X.vqY%2A3@host:5432/db
 */
function repairDatabaseUrl(url: string): string {
  try {
    // Match the pattern: postgresql://[user]:[password]@[host]:[port]/[database]?[params]
    // The @ sign separates credentials from host, but password may contain unencoded chars
    // We need to find the LAST @ before the host portion

    // First, check if the URL looks like it might have an unencoded password
    // by checking if there are multiple @ signs (which would indicate the first @ is in the password)
    const atCount = (url.match(/@/g) || []).length
    if (atCount <= 1) {
      // Standard URL with single @, try standard parsing
      try {
        const parsed = new URL(url)
        // If password contains characters that should be encoded but aren't,
        // URL parsing might have already handled them incorrectly
        const password = decodeURIComponent(parsed.password || '')
        if (password && /[?$&#*]/.test(password)) {
          // Password has special chars, re-encode it
          parsed.password = encodeURIComponent(password)
          return parsed.toString()
        }
      } catch {
        // URL parsing failed, likely because the password has unencoded chars
        // that break the URL structure (like ? or #)
      }
    }

    // If standard parsing didn't work or there are multiple @ signs,
    // try manual extraction by finding the last @ before a valid host pattern
    const schemeEnd = url.indexOf('://')
    if (schemeEnd === -1) return url

    const afterScheme = url.substring(schemeEnd + 3)

    // Find the @ that separates credentials from host
    // Look for @ followed by something that looks like a hostname (not another @)
    const hostPattern = /@([a-zA-Z0-9][\w.-]*\.\w+)/
    const hostMatch = afterScheme.match(hostPattern)
    if (!hostMatch) return url

    const hostStart = afterScheme.indexOf(hostMatch[0])
    const credentialsPart = afterScheme.substring(0, hostStart)
    const hostAndRest = afterScheme.substring(hostStart + 1) // skip the @

    // Split credentials into user:password
    const colonIndex = credentialsPart.indexOf(':')
    if (colonIndex === -1) return url

    const user = credentialsPart.substring(0, colonIndex)
    const rawPassword = credentialsPart.substring(colonIndex + 1)

    // Re-encode the password
    const encodedPassword = encodeURIComponent(rawPassword)

    // Reconstruct the URL
    const fixedUrl = `postgresql://${user}:${encodedPassword}@${hostAndRest}`
    return fixedUrl
  } catch {
    // If repair fails, return the original URL
    return url
  }
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

  // Strategy 2: process.env.DATABASE_URL with auto-repair
  const systemUrl = process.env.DATABASE_URL
  if (systemUrl) {
    // Accept PostgreSQL URLs
    if (systemUrl.startsWith('postgresql://') || systemUrl.startsWith('postgres://')) {
      return repairDatabaseUrl(systemUrl)
    }
    // Accept SQLite file URLs for local development
    if (systemUrl.startsWith('file:')) {
      return systemUrl
    }
  }

  // Strategy 3: .env file DATABASE_URL (for dev environments)
  const envFileUrl = readEnvFileVar('DATABASE_URL')
  if (envFileUrl) {
    if (envFileUrl.startsWith('postgresql://') || envFileUrl.startsWith('postgres://')) {
      return envFileUrl
    }
    if (envFileUrl.startsWith('file:')) {
      return envFileUrl
    }
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
