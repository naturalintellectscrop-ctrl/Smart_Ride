import { PrismaClient } from '@prisma/client'

// Next.js automatically loads .env files - no need for dotenv
// DATABASE_URL is set via Vercel environment variables or .env locally

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL

  const options: any = {
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  }

  // Explicitly pass datasourceUrl if available
  // This ensures Prisma uses the correct DATABASE_URL even if
  // the Prisma schema default doesn't match
  if (databaseUrl) {
    options.datasourceUrl = databaseUrl
  }

  return new PrismaClient(options)
}

// Use singleton pattern to prevent multiple PrismaClient instances
// This is critical for Render free tier which has connection limits
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
