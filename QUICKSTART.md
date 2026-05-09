# 🚀 Smart Ride Quick Start

## Step 1: Create PostgreSQL Database on Railway (2 minutes)

1. Open **https://railway.app** in your browser
2. Click **"Start a New Project"**
3. Select **"Provision PostgreSQL"**
4. Wait for database to be created (~30 seconds)
5. Click on **"PostgreSQL"** in your project
6. Go to **"Variables"** tab
7. Copy the **DATABASE_URL** value

Your DATABASE_URL will look like:
```
postgresql://postgres:AbCdEf123456@containers-us-west-123.railway.app:5432/railway
```

## Step 2: Update Your Environment

Edit `.env.local` and replace the DATABASE_URL line:

```env
# Change this:
DATABASE_URL="file:/home/z/my-project/db/custom.db"

# To your Railway URL:
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.railway.app:5432/railway"
```

## Step 3: Initialize Database

Run these commands in your terminal:

```bash
bun run db:setup
```

This will:
- Generate Prisma client
- Create all database tables
- Seed admin user and demo accounts

## Step 4: Deploy to Vercel

1. Push your code to GitHub
2. Go to **https://vercel.com**
3. Import your GitHub repository
4. Add environment variables from `.env.local`
5. Deploy!

## That's it! 

Your Smart Ride admin dashboard will be live at:
- `https://your-app.vercel.app` - Main app
- `https://your-app.vercel.app/admin` - Admin dashboard

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smartride.ug | Admin@123456 |
| Client | client@demo.com | Client@123456 |

---

## Alternative: Supabase (if you prefer)

1. Go to **https://supabase.com**
2. Create new project
3. Go to Settings → Database
4. Copy connection string (URI format)
5. Replace `[YOUR-PASSWORD]` with your database password
6. Use this as DATABASE_URL

---

## Need Help?

Run the setup script for guided setup:
```bash
bun run db:setup
```
