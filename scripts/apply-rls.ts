#!/usr/bin/env npx ts-node
// ============================================
// SMART RIDE — Apply RLS Migrations to Supabase
// ============================================
// Usage:
//   npx ts-node scripts/apply-rls.ts
//
// Or with direct postgres connection:
//   DATABASE_URL="postgresql://postgres:password@host:5432/postgres" npx ts-node scripts/apply-rls.ts
//
// This script:
//   1. Reads all SQL migration files from supabase/migrations/
//   2. Connects to PostgreSQL using DATABASE_URL
//   3. Executes each migration in order
//   4. Reports success/failure for each migration
// ============================================

import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

// We'll use pg directly since Prisma doesn't support raw SQL migrations well
async function main() {
  // Try to import pg
  let pg: typeof import('pg')
  try {
    pg = await import('pg')
  } catch {
    console.error('❌ pg package not found. Install it with: bun add pg')
    console.error('   Then run: npx ts-node scripts/apply-rls.ts')
    process.exit(1)
  }

  const { Pool } = pg

  // Get DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required')
    console.error('   Set it to your Supabase direct connection string:')
    console.error('   DATABASE_URL="postgresql://postgres:password@host:5432/postgres" npx ts-node scripts/apply-rls.ts')
    process.exit(1)
  }

  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.error('❌ DATABASE_URL must be a PostgreSQL connection string')
    console.error('   Use the DIRECT connection (port 5432), not the pooler (port 6543)')
    process.exit(1)
  }

  console.log('🔗 Connecting to PostgreSQL...')
  const pool = new Pool({ connectionString: databaseUrl })

  try {
    // Test connection
    const { rows } = await pool.query('SELECT current_database(), current_user')
    console.log(`✅ Connected to database: ${rows[0].current_database} as ${rows[0].current_user}`)

    // Read migration files
    const migrationsDir = resolve(__dirname, '..', 'supabase', 'migrations')
    let files: string[]
    try {
      files = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()
    } catch {
      console.error(`❌ Migrations directory not found: ${migrationsDir}`)
      process.exit(1)
    }

    if (files.length === 0) {
      console.log('ℹ️  No migration files found')
      return
    }

    console.log(`\n📋 Found ${files.length} migration(s):`)
    for (const file of files) {
      console.log(`   - ${file}`)
    }

    // Apply each migration
    for (const file of files) {
      const filePath = join(migrationsDir, file)
      const sql = readFileSync(filePath, 'utf-8')

      console.log(`\n⏳ Applying: ${file}`)
      try {
        await pool.query('BEGIN')
        await pool.query(sql)
        await pool.query('COMMIT')
        console.log(`✅ Success: ${file}`)
      } catch (error: unknown) {
        await pool.query('ROLLBACK')
        const msg = error instanceof Error ? error.message : String(error)
        console.error(`❌ Failed: ${file}`)
        console.error(`   Error: ${msg}`)

        // Ask whether to continue
        console.error('   Skipping to next migration...')
      }
    }

    // Verification queries
    console.log('\n🔍 Verification:')
    console.log('─'.repeat(60))

    // Check RLS enabled tables
    const rlsResult = await query(pool, `
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `)
    const rlsEnabled = rlsResult.filter(r => r.rowsecurity)
    const rlsDisabled = rlsResult.filter(r => !r.rowsecurity)
    console.log(`   Tables with RLS enabled: ${rlsEnabled.length}`)
    if (rlsDisabled.length > 0) {
      console.log(`   ⚠️  Tables WITHOUT RLS: ${rlsDisabled.map(r => r.tablename).join(', ')}`)
    }

    // Check policies
    const policiesResult = await query(pool, `
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY policy_count DESC
    `)
    console.log(`   Tables with policies: ${policiesResult.length}`)
    for (const row of policiesResult.slice(0, 10)) {
      console.log(`     ${row.tablename}: ${row.policy_count} policies`)
    }
    if (policiesResult.length > 10) {
      console.log(`     ... and ${policiesResult.length - 10} more`)
    }

    // Check smart_ride_api role
    const roleResult = await query(pool, `
      SELECT rolname, rolsuper, rolbypassrls
      FROM pg_roles
      WHERE rolname = 'smart_ride_api'
    `)
    if (roleResult.length > 0) {
      console.log(`   ✅ smart_ride_api role exists (superuser: ${roleResult[0].rolsuper}, bypassrls: ${roleResult[0].rolbypassrls})`)
    } else {
      console.log(`   ⚠️  smart_ride_api role NOT created yet (run migration 003)`)
    }

    console.log('\n✅ RLS migration complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Set a password for smart_ride_api role:')
    console.log('      ALTER ROLE smart_ride_api LOGIN PASSWORD \'your-secure-password\';')
    console.log('   2. Update DATABASE_URL to use smart_ride_api instead of postgres')
    console.log('   3. Test that RLS policies work correctly')

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ Fatal error:', msg)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

async function query(pool: InstanceType<typeof import('pg').Pool>, sql: string): Promise<any[]> {
  const { rows } = await pool.query(sql)
  return rows
}

main().catch(console.error)
