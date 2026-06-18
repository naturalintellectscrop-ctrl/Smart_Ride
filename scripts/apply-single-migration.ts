#!/usr/bin/env node
/**
 * Apply a single SQL migration file directly to PostgreSQL.
 * Usage: node scripts/apply-single-migration.ts <path-to-sql>
 */
import { readFileSync } from 'fs';
import pg from 'pg';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/apply-single-migration.ts <path-to-sql>');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const sql = readFileSync(file, 'utf-8');
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    const { rows } = await pool.query('SELECT current_database(), current_user');
    console.log(`Connected to ${rows[0].current_database} as ${rows[0].current_user}`);
    console.log(`Applying: ${file}`);
    await pool.query('BEGIN');
    await pool.query(sql);
    await pool.query('COMMIT');
    console.log('SUCCESS');

    // Verify Task policies
    const { rows: policies } = await pool.query(`
      SELECT tablename, policyname, cmd
      FROM pg_policies
      WHERE schemaname='public' AND tablename IN ('Task','Order','HealthOrder','Prescription','Cart')
      ORDER BY tablename, policyname
    `);
    console.log('\nPolicies on key tables:');
    for (const p of policies) {
      console.log(`  ${p.tablename}.${p.policyname} [${p.cmd}]`);
    }
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('FAILED:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
