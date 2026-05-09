# Smart Ride - Deployment Guide

## ✅ Step 1: Database Migration (COMPLETED)

The Railway PostgreSQL database is now synced with the Prisma schema.

**Database URL:** `postgresql://postgres:****@maglev.proxy.rlwy.net:55740/railway`

**Tables created include:**
- `User` - User accounts
- `Session` - Multi-device session management
- `OTP` - One-time password for phone authentication
- `Rider`, `Merchant`, `Order`, `Task`, etc.

---

## 🔧 Step 2: Environment Configuration

### Required Environment Variables

| Variable | Description | Status |
|----------|-------------|--------|
| `DATABASE_URL` | Railway PostgreSQL URL | ✅ Configured |
| `JWT_SECRET` | Secret for JWT tokens | ⚠️ Needs production value |
| `SMS_ENABLED` | Enable SMS sending | ⚠️ Set to "true" when ready |
| `AFRICASTALKING_API_KEY` | Africa's Talking API key | ❌ Needs value |
| `AFRICASTALKING_USERNAME` | "sandbox" or live username | ✅ Set to "sandbox" |
| `AFRICASTALKING_SENDER_ID` | SMS sender ID | ✅ Set to "SmartRide" |

### Generate Production JWT Secret

Run this command to generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and set it as your `JWT_SECRET`.

---

## 📱 Step 3: Africa's Talking Setup

### A. Create Account

1. Visit: https://account.africastalking.com/
2. Click **"Get Started"**
3. Select **Uganda** as your country
4. Complete registration

### B. Get Sandbox Credentials (Testing)

1. Log in to Africa's Talking
2. Go to **Settings** → **API Key**
3. Click **"Generate API Key"**
4. Copy the API key

### C. Test SMS in Sandbox

In sandbox mode, SMS is simulated. You can:
- View sent messages in your Africa's Talking dashboard
- Use their sandbox phone numbers for testing

### D. Configure .env

Update `/home/z/my-project/smart-ride-mobile/.env`:

```env
# Enable SMS
SMS_ENABLED="true"
SMS_PROVIDER="africas_talking"

# Your API Key from Africa's Talking
AFRICASTALKING_API_KEY="your-api-key-here"
AFRICASTALKING_USERNAME="sandbox"
AFRICASTALKING_SENDER_ID="SmartRide"
```

### E. For Production (Live SMS)

1. Go to **Settings** → **Team**
2. Create a **Live Application**
3. Generate a **Live API Key**
4. Apply for a **Sender ID** (approval takes 24-48 hours)
5. Update credentials:

```env
AFRICASTALKING_API_KEY="your-live-api-key"
AFRICASTALKING_USERNAME="SmartRide"  # Your app name or username
AFRICASTALKING_SENDER_ID="SmartRide"  # Approved sender ID
```

---

## 🧪 Step 4: Test Authentication Flow

### A. Start the Development Server

```bash
cd /home/z/my-project/smart-ride-mobile
bun run dev
```

### B. Test Send OTP API

```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+256700123456", "purpose": "login"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 300
}
```

### C. Test Verify OTP API

```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+256700123456", "otp": "123456"}'
```

### D. View Logs

Check the console for OTP in development mode:
```
[OTP] DEV MODE - OTP for +256700123456: 123456 (Purpose: login)
```

---

## 📋 Pre-Deployment Checklist

- [ ] Database migrated to Railway
- [ ] JWT_SECRET set to secure random value
- [ ] Africa's Talking account created
- [ ] API Key configured
- [ ] SMS_ENABLED="true"
- [ ] Tested send-otp API
- [ ] Tested verify-otp API
- [ ] Tested complete login flow
- [ ] Mobile app connected to backend

---

## 🔐 Security Notes

1. **Never commit .env to version control**
2. **Use environment variables in Vercel** for production
3. **Rotate API keys** periodically
4. **Set up IP restrictions** in Africa's Talking dashboard
5. **Monitor SMS usage** to detect anomalies

---

## 🚀 Deploy to Vercel

1. Push changes to GitHub
2. In Vercel dashboard, go to **Settings** → **Environment Variables**
3. Add all required variables
4. Deploy

---

## 📱 Mobile App Configuration

Update the mobile app to point to the production API:

In `/home/z/my-project/smart-ride-mobile/smart-ride-mobile/src/services/api.ts`:

```typescript
const API_BASE_URL = 'https://smartrideug.vercel.app/api';
```

---

## 🆘 Troubleshooting

### SMS Not Sending

1. Check `SMS_ENABLED="true"` in .env
2. Verify API key is correct
3. Check Africa's Talking dashboard for errors
4. Ensure phone number is in format `+256XXXXXXXXX`

### Database Connection Issues

1. Verify DATABASE_URL is correct
2. Check Railway database is running
3. Ensure IP whitelist allows your server

### JWT Token Issues

1. Verify JWT_SECRET is at least 32 characters
2. Check token expiration times
3. Ensure system time is synchronized
