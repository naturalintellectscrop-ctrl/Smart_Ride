/**
 * PostgreSQL Database Setup Script
 * 
 * This script helps you set up PostgreSQL database for Smart Ride.
 * Run: bun run db:setup
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Smart Ride - PostgreSQL Database Setup              ║
╚═══════════════════════════════════════════════════════════════╝

Choose your database provider:

┌─────────────────────────────────────────────────────────────────┐
│ 1. RAILWAY (Recommended - $5 free credit/month)                 │
│    → https://railway.app/                                       │
│    → Sign up with GitHub                                        │
│    → New Project → Add PostgreSQL                               │
│    → Copy DATABASE_URL from variables                           │
├─────────────────────────────────────────────────────────────────┤
│ 2. SUPABASE (Alternative - 500MB free)                          │
│    → https://supabase.com/                                      │
│    → Create new project                                         │
│    → Settings → Database → Connection string → URI              │
│    → Copy connection string                                     │
├─────────────────────────────────────────────────────────────────┤
│ 3. NEON (Alternative - 3GB free)                                │
│    → https://neon.tech/                                         │
│    → Create project                                             │
│    → Copy connection string                                     │
└─────────────────────────────────────────────────────────────────┘

SETUP STEPS:

1. Create your database on one platform above

2. Copy the connection string (format):
   postgresql://postgres:PASSWORD@HOST:5432/DATABASE?schema=public

3. Add to .env.local:
   DATABASE_URL=postgresql://postgres:password@host:5432/db

4. Push schema:
   bun run db:push

5. Seed initial data:
   bun run db:seed

─────────────────────────────────────────────────────────────────
`);
