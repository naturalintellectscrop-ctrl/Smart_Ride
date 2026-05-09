# Smart Ride Authentication System

## Quick Start

### 1. Database Setup

Run the Prisma migration to create all required tables:

```bash
cd smart-ride-mobile
npx prisma migrate dev --name add_sessions_and_otp
npx prisma generate
```

This creates:
- `Session` table - Multi-device session management
- `OTP` table - Phone authentication OTP storage

### 2. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required for Production:**
- `JWT_SECRET` - At least 32 characters
- `SMS_ENABLED="true"` - Enable SMS sending
- `AFRICASTALKING_API_KEY` - Your Africa's Talking API key
- `AFRICASTALKING_USERNAME` - 'sandbox' for testing, production username for live

### 3. SMS Configuration (Africa's Talking)

1. Create account at [Africa's Talking](https://account.africastalking.com/)
2. Get your API key from Settings > API Key
3. For testing, use `sandbox` as username
4. For production, use your live username and apply for a sender ID

## Authentication Flow

### Phone + OTP Login Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Phone Login    │────▶│    Send OTP     │────▶│   Verify OTP    │
│  (phone-login)  │     │  POST /send-otp │     │  POST /verify   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Store Tokens   │◀────│  Create Session │
                        │  Memory + Store │     │  Database       │
                        └─────────────────┘     └─────────────────┘
```

### Token Architecture

| Token | Storage | Expiry | Purpose |
|-------|---------|--------|---------|
| `accessToken` | Memory only | 15 min | API authentication |
| `refreshToken` | SecureStore | 30 days | Token refresh |

### Auto-Refresh Flow

```
App Start
    │
    ▼
Load refreshToken from SecureStore
    │
    ├─── Not Found ──▶ Show Welcome Screen
    │
    └─── Found ────▶ POST /auth/refresh
                          │
                          ├─── Success ───▶ Store new accessToken
                          │                       │
                          │                       ▼
                          │                  Authenticated
                          │
                          └─── Failure ───▶ Clear tokens, Show Login
```

## API Endpoints

### Send OTP
```
POST /api/auth/send-otp
Body: { phone: "+2567XX XXX XXX", purpose: "login" }
Response: { success: true, expiresIn: 300 }
```

### Verify OTP
```
POST /api/auth/verify-otp
Body: { phone: "+2567XX XXX XXX", otp: "123456", purpose: "login" }
Response: { 
  success: true, 
  data: { 
    user: {...}, 
    accessToken: "...", 
    refreshToken: "...",
    expiresIn: 900 
  } 
}
```

### Refresh Token
```
POST /api/auth/refresh
Body: { refreshToken: "..." }
Response: { 
  success: true, 
  data: { 
    accessToken: "...", 
    refreshToken: "...",
    expiresIn: 900 
  } 
}
```

## Files Structure

```
smart-ride-mobile/
├── app/
│   ├── auth/
│   │   ├── phone-login.tsx    # Phone input screen
│   │   ├── verify-otp.tsx     # OTP verification screen
│   │   ├── login.tsx          # Email/password login
│   │   └── register.tsx       # Registration
│   └── index.tsx              # Welcome screen
│
├── src/
│   ├── services/
│   │   └── api.ts             # API client with auth
│   │
│   ├── store/
│   │   └── authStore.ts       # Auth state management
│   │
│   └── constants/
│       └── index.ts           # COLORS, API_CONFIG
│
└── src/lib/auth/              # Backend
    ├── otp-service.ts         # OTP generation & SMS
    ├── session-service.ts     # Session management
    └── jwt.ts                 # JWT token handling
```

## Error Handling

### User-Facing Errors

| Scenario | Error Message | Action |
|----------|--------------|--------|
| Invalid phone | "Please enter a valid Ugandan phone number" | Fix input |
| OTP expired | "OTP has expired. Please request a new one." | Resend OTP |
| Wrong OTP | "Invalid OTP. 2 attempts remaining." | Retry |
| Too many attempts | "Too many failed attempts. Please request a new OTP." | Resend |
| Network error | "Failed to send OTP. Please try again." | Retry |
| SMS failure | "Failed to send OTP. Please try again." | Retry |

### Resilience Features

1. **Network Quality Detection** - Adapts timeout based on connection
2. **Exponential Backoff** - Retries with increasing delays
3. **SecureStore Timeout** - Prevents storage operations from hanging
4. **Token Validation** - Validates format before using
5. **Fail-Loud** - All errors are shown to user, no silent failures

## Testing in Development

### Without SMS Provider

Set `SMS_ENABLED="false"` in `.env`. OTP will be logged to console:

```
[OTP] DEV MODE - OTP for +2567XX XXX XXX: 123456 (Purpose: login)
```

### With Africa's Talking Sandbox

1. Set `AFRICASTALKING_USERNAME="sandbox"`
2. Use the sandbox dashboard to view sent messages
3. Messages are not delivered to real phones in sandbox mode

## Production Checklist

- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Enable SMS with `SMS_ENABLED="true"`
- [ ] Configure Africa's Talking production credentials
- [ ] Apply for approved sender ID
- [ ] Run database migration
- [ ] Test complete auth flow
- [ ] Verify token refresh works
- [ ] Test on slow network (3G)
