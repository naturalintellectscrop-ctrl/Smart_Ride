# Smart Ride Production Deployment Guide

This guide walks you through deploying Smart Ride to production with PostgreSQL database.

## Prerequisites

- GitHub account (for code hosting)
- Railway or Supabase account (for PostgreSQL)
- Vercel account (for hosting)

---

## Step 1: Set Up PostgreSQL Database

### Option A: Railway (Recommended - Easier)

1. **Go to [Railway.app](https://railway.app)** and sign up with GitHub
2. **Create New Project** → "Provision PostgreSQL"
3. **Get Connection String:**
   - Click on your PostgreSQL database
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` 
   - It looks like: `postgresql://postgres:PASSWORD@HOST.railway.app:5432/railway`

### Option B: Supabase (More Features)

1. **Go to [Supabase.com](https://supabase.com)** and sign up
2. **Create New Project:**
   - Name: `smart-ride`
   - Database Password: (save this!)
   - Region: Europe West or US East (closest to Uganda)
3. **Get Connection String:**
   - Go to Settings → Database
   - Find "Connection string" → "URI"
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your database password
   - It looks like: `postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres`

---

## Step 2: Update Environment Variables

1. **Open your `.env.local` file**
2. **Replace the DATABASE_URL line:**

```env
# Replace this:
DATABASE_URL="file:/home/z/my-project/db/custom.db"

# With your Railway/Supabase URL:
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/YOUR_DB"
```

---

## Step 3: Push Database Schema

Run these commands in your terminal:

```bash
# Generate Prisma client
bun run db:generate

# Push schema to PostgreSQL
bun run db:push

# Seed initial data (admin user, demo accounts, pricing)
bun run db:seed
```

---

## Step 4: Deploy to Vercel

### Quick Deploy

1. **Go to [Vercel.com](https://vercel.com)** and sign up with GitHub
2. **Import your repository:**
   - Click "New Project"
   - Import from GitHub
   - Select your Smart Ride repository
3. **Configure Environment Variables:**
   - Add all variables from `.env.local`
   - **Required:** `DATABASE_URL`, `JWT_SECRET`, `NEXTAUTH_SECRET`
4. **Deploy!**

### Using Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## Step 5: Update Production URLs

After deployment, update these in Vercel environment variables:

```env
NEXTAUTH_URL="https://your-app.vercel.app"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
MTN_MOMO_CALLBACK_URL="https://your-app.vercel.app/api/payments/mtn-callback"
AIRTEL_MONEY_CALLBACK_URL="https://your-app.vercel.app/api/payments/airtel-callback"
```

---

## Demo Credentials (After Seeding)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@smartride.ug | Admin@123456 |
| Demo Client | client@demo.com | Client@123456 |
| Boda Rider | rider@demo.com | Rider@123456 |
| Car Driver | driver@demo.com | Driver@123456 |
| Delivery | delivery@demo.com | Delivery@123456 |

⚠️ **Change these passwords immediately in production!**

---

## Production Checklist

### Security
- [ ] Change all default passwords
- [ ] Generate new JWT_SECRET (`openssl rand -base64 32`)
- [ ] Generate new NEXTAUTH_SECRET (`openssl rand -base64 32`)
- [ ] Enable SSL in PostgreSQL (automatic on Railway/Supabase)

### Payments
- [ ] Get MTN MoMo production credentials
- [ ] Get Airtel Money production credentials
- [ ] Update callback URLs

### Maps
- [ ] Get production Mapbox token
- [ ] Enable Uganda geocoding

### Firebase
- [ ] Enable Google Sign-In
- [ ] Add production domain to authorized domains
- [ ] Enable FCM for push notifications

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Vercel        │────▶│   PostgreSQL    │
│   (Frontend +   │     │   (Railway/     │
│    API Routes)  │     │    Supabase)    │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Firebase      │
│   - Auth        │
│   - Push Notif  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   External APIs │
│   - MTN MoMo    │
│   - Airtel      │
│   - Mapbox      │
└─────────────────┘
```

---

## Troubleshooting

### Database Connection Error
```
Error: Can't reach database server
```
**Solution:** Verify DATABASE_URL is correct and database is running.

### Prisma Schema Error
```
Error: P1001 Can't reach database server
```
**Solution:** Check if your IP is whitelisted (Supabase) or if database is running (Railway).

### Build Error
```
Error: Prisma Client not found
```
**Solution:** Add `bun run db:generate` to build command in Vercel settings.

---

## Support

- **Documentation:** `/docs` folder
- **Issues:** GitHub Issues
- **Email:** support@smartride.ug
