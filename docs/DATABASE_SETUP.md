# PostgreSQL Database Setup Guide

This guide walks you through setting up a PostgreSQL database for Smart Ride.

## Option 1: Railway (Recommended)

Railway offers $5 free credit/month, perfect for development.

### Step 1: Create Account
1. Go to [https://railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (recommended)
4. Authorize Railway to access your GitHub

### Step 2: Create PostgreSQL Database
1. Click **"New Project"**
2. Select **"Provision PostgreSQL"**
3. Wait for database to be created (~30 seconds)

### Step 3: Get Connection String
1. Click on your PostgreSQL project
2. Go to **"Variables"** tab
3. Copy the `DATABASE_URL` value

### Step 4: Add to Your Project
Create or update `.env.local`:
```env
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/railway
```

---

## Option 2: Supabase (Free Tier - 500MB)

Supabase is a Firebase alternative with PostgreSQL.

### Step 1: Create Account
1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub

### Step 2: Create Project
1. Click **"New Project"**
2. Select organization (create one if needed)
3. Enter project name: `smart-ride`
4. Set a strong database password (save this!)
5. Choose region: **EU West (Ireland)** for Africa
6. Click **"Create new project"**

### Step 3: Get Connection String
1. Go to **Settings** → **Database**
2. Scroll to **"Connection string"**
3. Select **"URI"** format
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your database password

### Step 4: Add to Your Project
```env
DATABASE_URL=postgresql://postgres.YOUR-PROJECT-REF:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```

---

## Option 3: Neon (Free Tier - 3GB)

Neon is a serverless PostgreSQL provider.

### Step 1: Create Account
1. Go to [https://neon.tech](https://neon.tech)
2. Click **"Sign up"**
3. Sign up with GitHub

### Step 2: Create Project
1. Click **"Create a project"**
2. Enter project name: `smart-ride`
3. Select region closest to Uganda
4. Click **"Create project"**

### Step 3: Get Connection String
1. Copy the connection string shown after project creation

---

## After Setting Up Database

### Step 1: Push Database Schema
```bash
bun run db:push
```

### Step 2: Seed Initial Data
```bash
bun run db:seed
```

This creates:
- Admin user: `admin@smartride.ug` / `Admin@123456`
- Demo client: `client@demo.com` / `Client@123456`
- Demo riders
- Demo merchants

### Step 3: Verify with Prisma Studio
```bash
bun run db:studio
```

---

## Troubleshooting

### Connection Errors

**"Can't reach database server"**
- Check your connection string
- Verify SSL mode: add `?sslmode=require`

**"Authentication failed"**
- Double-check your password
- Make sure special characters are URL-encoded
