import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Load .env file explicitly with override to ensure correct values
config({ override: true })

// Get DATABASE_URL from environment
let databaseUrl = process.env.DATABASE_URL

// Validate DATABASE_URL - must be a PostgreSQL connection string
// Sometimes the environment may have a file: URL from local SQLite which is incorrect
if (!databaseUrl || databaseUrl.startsWith('file:')) {
  // For development, use the Railway PostgreSQL database
  databaseUrl = 'postgresql://postgres:yGphbfshRKrZSMLNPGCwJXGckrTOalVL@maglev.proxy.rlwy.net:55740/railway'
  console.warn('Warning: Using fallback DATABASE_URL for development')
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasourceUrl: databaseUrl,
  })
}

// Export a getter that lazily initializes the client
// This prevents errors during build time when DATABASE_URL might not be available
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db