import { PrismaClient } from '@prisma/client'

// ============================================
// SMART RIDE - Database Configuration
// ============================================
// Supabase PostgreSQL (Free Tier)
// - DATABASE_URL: Pooler connection (transaction mode, port 6543)
// - DIRECT_URL: Pooler connection (session mode, port 5432) for migrations
// ============================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Use the .env DATABASE_URL (Supabase pooler)
  // The system env var might have an old SQLite path, so we prioritize .env
  const databaseUrl = process.env.DATABASE_URL

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
    ...(databaseUrl ? { datasourceUrl: databaseUrl } : {}),
  })
}

// Use singleton pattern to prevent multiple PrismaClient instances
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
