#!/usr/bin/env bun
/**
 * Smart Ride Database Setup Script
 * Run this after setting up PostgreSQL (Railway/Supabase)
 * 
 * Usage:
 *   1. Update DATABASE_URL in .env.local
 *   2. Run: bun run db:setup
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');

console.log('🚀 Smart Ride Database Setup\n');
console.log('━'.repeat(50));

// Step 1: Check for .env.local
console.log('\n📋 Step 1: Checking environment file...');
if (!existsSync(envPath)) {
  console.log('❌ .env.local not found!');
  console.log('   Creating from template...');
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL=["']?(postgresql:\/\/[^"'\n]+)["']?/);

if (!dbUrlMatch) {
  console.log('⚠️  PostgreSQL DATABASE_URL not found in .env.local');
  console.log('\n   Please update .env.local with your PostgreSQL URL:');
  console.log('   DATABASE_URL="postgresql://postgres:PASSWORD@HOST:5432/DATABASE"');
  console.log('\n   Get your database URL from:');
  console.log('   - Railway: https://railway.app → Your Project → PostgreSQL → Variables');
  console.log('   - Supabase: https://supabase.com → Project → Settings → Database → Connection String');
  process.exit(1);
}

console.log('✅ PostgreSQL DATABASE_URL found');

// Step 2: Generate Prisma Client
console.log('\n📋 Step 2: Generating Prisma client...');
try {
  execSync('bun run db:generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');
} catch (error) {
  console.log('❌ Failed to generate Prisma client');
  process.exit(1);
}

// Step 3: Push Schema
console.log('\n📋 Step 3: Pushing database schema...');
try {
  execSync('bun run db:push', { stdio: 'inherit' });
  console.log('✅ Database schema created');
} catch (error) {
  console.log('❌ Failed to push schema. Check your DATABASE_URL');
  process.exit(1);
}

// Step 4: Seed Data
console.log('\n📋 Step 4: Seeding initial data...');
try {
  execSync('bun run db:seed', { stdio: 'inherit' });
  console.log('✅ Database seeded');
} catch (error) {
  console.log('❌ Failed to seed database');
  process.exit(1);
}

// Success!
console.log('\n' + '━'.repeat(50));
console.log('✅ DATABASE SETUP COMPLETE!\n');
console.log('🔐 Demo Credentials:');
console.log('   Admin:      admin@smartride.ug / Admin@123456');
console.log('   Client:     client@demo.com / Client@123456');
console.log('   Boda Rider: rider@demo.com / Rider@123456');
console.log('   Car Driver: driver@demo.com / Driver@123456');
console.log('   Delivery:   delivery@demo.com / Delivery@123456');
console.log('\n⚠️  Remember to change these passwords in production!');
console.log('\n🚀 Ready to deploy to Vercel!');
