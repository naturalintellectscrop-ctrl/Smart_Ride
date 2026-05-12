import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Load .env file explicitly with override to ensure correct values
config({ override: true })

// Get DATABASE_URL from environment
let databaseUrl = process.env.DATABASE_URL

// Validate DATABASE_URL - must be a PostgreSQL connection string
if (!databaseUrl || databaseUrl.startsWith('file:')) {
  console.error('ERROR: DATABASE_URL must be a PostgreSQL connection string')
  console.error('Current DATABASE_URL:', databaseUrl ? 'starts with file:' : 'not set')
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const options: any = {
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  }

  // Explicitly pass datasourceUrl if available
  if (databaseUrl && !databaseUrl.startsWith('file:')) {
    options.datasourceUrl = databaseUrl
  }

  return new PrismaClient(options)
}

// Use singleton pattern to prevent multiple PrismaClient instances
// This is critical for Render free tier which has connection limits
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
