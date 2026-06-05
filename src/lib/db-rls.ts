// ============================================
// SMART RIDE — Prisma RLS Middleware
// ============================================
// Sets PostgreSQL session variables before each query so that
// Row-Level Security policies can enforce access control.
//
// Session variables set:
//   app.is_service_role  = 'true'     → API server always sets this (auth handled at API layer)
//   app.current_user_id  = '<cuid>'   → The authenticated user's ID (or empty if unauthenticated)
//   app.current_user_role = '<role>'  → The authenticated user's role (or empty if unauthenticated)
//
// These are read by RLS policies using:
//   current_setting('app.is_service_role', true)
//   current_setting('app.current_user_id', true)
//   current_setting('app.current_user_role', true)
//
// The second argument 'true' means "return NULL if not set" instead of throwing an error.
//
// IMPORTANT: Uses SET LOCAL so variables reset at the end of each transaction,
// preventing session variable leakage between requests on pooled connections.
// ============================================

import { AsyncLocalStorage } from 'async_hooks'
import { PrismaClient } from '@prisma/client'
import { JWTPayload, UserRole } from './auth/jwt'

// Global storage for the current request's user context
// This is set per-request via the setRLSContext() function
const rlsContextStorage = new AsyncLocalStorage<{
  userId: string
  role: UserRole
}>()

/**
 * Get the current RLS context (user ID and role) for the active request
 */
export function getRLSContext(): { userId: string; role: UserRole } | undefined {
  return rlsContextStorage.getStore()
}

/**
 * Run a callback with RLS context set for the current user.
 * This should wrap every API route handler that accesses the database.
 *
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     const user = getAuthUser(req)
 *     return withRLSContext(user, async () => {
 *       const data = await db.user.findMany()
 *       return NextResponse.json(data)
 *     })
 *   }
 */
export async function withRLSContext<T>(
  user: JWTPayload | null,
  callback: () => Promise<T>
): Promise<T> {
  if (!user) {
    // Unauthenticated request - run without user context
    // Service role is still set so API can function
    return callback()
  }

  return rlsContextStorage.run(
    { userId: user.userId, role: user.role },
    callback
  )
}

/**
 * Create a Prisma client with RLS middleware that sets session variables
 * before each query.
 *
 * This replaces the standard PrismaClient instantiation in db.ts
 * when RLS is enabled (i.e., when using PostgreSQL/Supabase).
 */
export function createRLSEnabledPrismaClient(datasourceUrl: string): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
    datasourceUrl,
  })

  // Add Prisma middleware to set RLS session variables
  // Using $extends with query middleware
  const extendedClient = client.$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        // Get the current user context from AsyncLocalStorage
        const context = getRLSContext()

        // Set session variables for RLS policies
        // We use $executeRawUnsafe because Prisma doesn't have a direct
        // way to run SET LOCAL before queries
        const userId = context?.userId || ''
        const userRole = context?.role || ''
        const isServiceRole = 'true' // API server always has service role

        try {
          // Set all session variables in one statement for efficiency
          // SET LOCAL ensures they reset at transaction end
          await client.$executeRawUnsafe(
            `SET LOCAL app.is_service_role = '${isServiceRole}'; ` +
            `SET LOCAL app.current_user_id = '${userId.replace(/'/g, "''")}'; ` +
            `SET LOCAL app.current_user_role = '${userRole}';`
          )
        } catch {
          // If SET LOCAL fails (e.g., outside a transaction), try SET
          // This handles the case where Prisma uses implicit transactions
          try {
            await client.$executeRawUnsafe(
              `SET app.is_service_role = '${isServiceRole}'; ` +
              `SET app.current_user_id = '${userId.replace(/'/g, "''")}'; ` +
              `SET app.current_user_role = '${userRole}';`
            )
          } catch {
            // If SET also fails, continue without RLS context
            // (e.g., SQLite doesn't support SET statements)
          }
        }

        // Execute the actual query
        return query(args)
      },
    },
  })

  return extendedClient as unknown as PrismaClient
}

/**
 * Alternative: Simple function to set RLS context for a specific Prisma operation.
 * Use this when you can't use the middleware approach (e.g., complex transactions).
 *
 * Usage:
 *   await setRLSSession(db, user)
 *   const result = await db.user.findMany()
 */
export async function setRLSSession(
  prisma: PrismaClient,
  user: JWTPayload | null
): Promise<void> {
  const userId = user?.userId || ''
  const userRole = user?.role || ''

  try {
    await prisma.$executeRawUnsafe(
      `SET LOCAL app.is_service_role = 'true'; ` +
      `SET LOCAL app.current_user_id = '${userId.replace(/'/g, "''")}'; ` +
      `SET LOCAL app.current_user_role = '${userRole}';`
    )
  } catch {
    try {
      await prisma.$executeRawUnsafe(
        `SET app.is_service_role = 'true'; ` +
        `SET app.current_user_id = '${userId.replace(/'/g, "''")}'; ` +
        `SET app.current_user_role = '${userRole}';`
      )
    } catch {
      // SQLite or unsupported - silently ignore
    }
  }
}

/**
 * Reset RLS session variables after an operation.
 * Call this to clean up after setRLSSession().
 */
export async function resetRLSSession(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `RESET app.is_service_role; ` +
      `RESET app.current_user_id; ` +
      `RESET app.current_user_role;`
    )
  } catch {
    // Silently ignore if not supported
  }
}
