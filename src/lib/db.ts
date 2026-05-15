import { PrismaClient } from '@prisma/client'

// Next.js automatically loads .env files - no need for dotenv
// SQLite database: free, local, zero-config for testing
// DATABASE_URL="file:./db/smart-ride.db"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  })
}

// Use singleton pattern to prevent multiple PrismaClient instances
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
