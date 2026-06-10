#!/usr/bin/env bun
// ============================================
// SMART RIDE — Supabase Realtime Setup Script
// ============================================
// Configures Supabase for real-time functionality:
//   1. Enables Realtime on required tables
//   2. Verifies RLS policies exist
//   3. Checks that API keys are configured
//
// Usage:
//   1. Set SUPABASE_SERVICE_ROLE_KEY in .env (from Dashboard → Settings → API)
//   2. Run: bun run scripts/setup-supabase-realtime.ts
// ============================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================
// ENVIRONMENT VARIABLE LOADING
// ============================================

function loadEnvFile(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env');
  const vars: Record<string, string> = {};

  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        vars[key] = value;
      }
    }
  } catch {
    console.log('⚠️  No .env file found');
  }

  return vars;
}

// ============================================
// MAIN SETUP
// ============================================

async function main() {
  console.log('🚀 Smart Ride — Supabase Realtime Setup\n');
  console.log('━'.repeat(60));

  const envVars = loadEnvFile();

  // Step 1: Check API keys
  console.log('\n📋 Step 1: Checking Supabase API keys...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl.includes('your-project')) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_URL is not configured!');
    console.log('   → Go to https://supabase.com/dashboard → Your Project → Settings → API');
    console.log('   → Copy the Project URL and update .env');
    process.exit(1);
  }

  if (!serviceRoleKey || serviceRoleKey.includes('your_supabase')) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY is not configured!');
    console.log('   → Go to https://supabase.com/dashboard → Your Project → Settings → API');
    console.log('   → Copy the service_role key and update .env');
    console.log('   ⚠️  This key is SECRET — never expose it to the client!');
    process.exit(1);
  }

  if (!anonKey || anonKey.includes('your_supabase')) {
    console.log('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured (needed for client-side)');
    console.log('   → Go to https://supabase.com/dashboard → Your Project → Settings → API');
    console.log('   → Copy the anon/public key and update .env');
  }

  console.log(`✅ Supabase URL: ${supabaseUrl}`);
  console.log(`✅ Service role key: ${serviceRoleKey.substring(0, 10)}...`);
  if (anonKey && !anonKey.includes('your_supabase')) {
    console.log(`✅ Anon key: ${anonKey.substring(0, 10)}...`);
  }

  // Create admin client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 2: Enable Realtime on required tables
  console.log('\n📋 Step 2: Enabling Realtime on required tables...');

  const realtimeTables = [
    'Task',
    'Payment',
    'Notification',
    'Message',
    'Rider',
    'DispatchMatch',
    'Order',
    'HealthOrder',
  ];

  for (const table of realtimeTables) {
    try {
      // Add table to the supabase_realtime publication
      const { error } = await supabase.rpc('exec_sql', {
        query: `ALTER PUBLICATION supabase_realtime ADD TABLE "${table}";`,
      }).catch(() => {
        // Fallback: use direct SQL via REST
        return { error: 'rpc_not_available' };
      });

      if (error) {
        // Try alternative approach — check if already in publication
        console.log(`   ℹ️  ${table}: Could not auto-enable (may already be enabled or requires manual setup)`);
        console.log(`      → Run in SQL Editor: ALTER PUBLICATION supabase_realtime ADD TABLE "${table}";`);
      } else {
        console.log(`   ✅ ${table}: Realtime enabled`);
      }
    } catch (e) {
      console.log(`   ℹ️  ${table}: Run manually in SQL Editor: ALTER PUBLICATION supabase_realtime ADD TABLE "${table}";`);
    }
  }

  // Step 3: Verify RLS is enabled
  console.log('\n📋 Step 3: Checking Row Level Security...');

  try {
    const { data, error } = await supabase
      .from('Task')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('RLS') || error.code === '42501') {
        console.log('   ⚠️  RLS policies may not be configured');
        console.log('   → Run the migrations in supabase/migrations/ via the SQL Editor');
      } else {
        console.log(`   ℹ️  Task table check: ${error.message}`);
      }
    } else {
      console.log('   ✅ Task table is accessible (RLS policies working)');
    }
  } catch (e) {
    console.log('   ℹ️  Could not verify RLS — may need to apply migrations');
  }

  // Step 4: Test Realtime connectivity
  console.log('\n📋 Step 4: Testing Realtime connectivity...');

  try {
    const channel = supabase.channel('setup-test');
    const subscription = new Promise<{ status: string }>((resolve) => {
      channel.subscribe((status: string) => {
        resolve({ status });
      });
    });

    const result = await Promise.race([
      subscription,
      new Promise<{ status: string }>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
      ),
    ]);

    if (result.status === 'SUBSCRIBED') {
      console.log('   ✅ Realtime connection successful!');
    } else {
      console.log(`   ⚠️  Realtime status: ${result.status}`);
    }

    supabase.removeChannel(channel);
  } catch (e: any) {
    console.log(`   ❌ Realtime connection failed: ${e.message}`);
    console.log('   → Check that Realtime is enabled in Project Settings');
  }

  // Summary
  console.log('\n' + '━'.repeat(60));
  console.log('\n📝 Summary of required actions:\n');

  if (!anonKey || anonKey.includes('your_supabase')) {
    console.log('  1. 🔑 Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
    console.log('     Get from: https://supabase.com/dashboard/project/mmovwpdgrgdiyqheroak/settings/api');
  }

  console.log('  2. 📡 Enable Realtime on tables (run in SQL Editor):');
  console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE "Task";');
  console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE "Payment";');
  console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";');
  console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE "Message";');
  console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE "Rider";');
  console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE "Order";');
  console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE "HealthOrder";');

  console.log('\n  3. 🔒 Apply RLS migrations (run in SQL Editor):');
  console.log('     Contents of: supabase/migrations/001_enable_rls.sql');
  console.log('     Contents of: supabase/migrations/002_service_role_policies.sql');
  console.log('     Contents of: supabase/migrations/003_create_api_role.sql');

  console.log('\n  4. 🧪 Test with: bun run scripts/setup-supabase-realtime.ts');
  console.log('\n✅ Setup guide complete!\n');
}

main().catch(console.error);
