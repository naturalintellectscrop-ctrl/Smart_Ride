# Smart Ride — Production Setup Runbook

> **Read this top to bottom.** Every command below has been corrected for the
> obstacles you hit. Copy-paste blocks verbatim.

---

## 0. What was wrong (your three obstacles)

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 1 | `eas secret:create … <your-mapbox-token>` → `bash: syntax error near unexpected token 'newline'` | Bash interprets `<` and `>` as **redirection operators**. The placeholders `<your-mapbox-token>` literally try to redirect to a file named `your-mapbox-token`. | Replace the placeholders with **real values**, and always quote values that contain special chars. See §3. |
| 2 | `export DATABASE_URL=…&sslmode=require` → backgrounded the command (`[1] 4205` then `Done`) | The unquoted `&` is the shell **job-control operator**. It ran everything before `&` as a background job and treated `sslmode=require` as a separate command. | Wrap the URL in **double quotes**. See §2. |
| 3 | `bun run prisma/seed-production-admin.ts` → `Module not found` | You ran it from `expo-app/`, but the script lives at the **project root** `prisma/seed-production-admin.ts` (one level up). | `cd` to the project root first. See §4. |

---

## 1. First: sync your local repo

Several files exist on the server copy that your local `/c/Smart_Ride` is missing
or behind on. Pull them down before anything else:

```bash
cd /c/Smart_Ride
git pull origin main
```

Files you MUST have locally after the pull (server has them now):

- `prisma/seed-production-admin.ts`  ← the script you were trying to run
- `expo-app/google-services.json`    ← **merged** with all 3 keystore SHA-1s (debug + old upload + EAS production)
- `expo-app/.env`                    ← real Firebase values (gitignored — recreated locally, see §5)
- `expo-app/.env.example`            ← template (committed)
- `.env.production.example`          ← backend template (committed)
- `src/lib/security/env-validation.ts` ← payment gateways now OPTIONAL (was crashing prod)
- `eas.json`                         ← already `apk` buildType for preview/production/apk profiles ✓
- `agent-ctx/NP-1-nylonpay-research.md` ← NylonPay integration guide (68 KB)

> **Note on `expo-app/.env`:** it is gitignored, so `git pull` will NOT bring it
> over. Recreate it locally from §5 below. Same for `.env.production`.

---

## 2. Fix obstacle #2 — DATABASE_URL quoting (shell)

When you `export` a URL containing `&` in bash, you MUST quote it:

```bash
# ❌ WRONG — & backgrounds the job, sslmode is lost
export DATABASE_URL=postgresql://postgres.mmovwpdgrgdiyqheroak:smart_ride662@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require

# ✅ CORRECT — double quotes protect the &
export DATABASE_URL="postgresql://postgres.mmovwpdgrgdiyqheroak:smart_ride662@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

# Verify it took:
echo "$DATABASE_URL"
# Should print the full URL including &sslmode=require
```

> The `&` problem only exists in the **shell**. Inside a `.env` file, `&` is
> perfectly safe (no shell parsing). That's why `.env.production` works fine.

**Important — pooler vs direct connection:**
- Port **6543** (pooler, `?pgbouncer=true`) → for **runtime queries** (app + seed script)
- Port **5432** (direct, `db.<ref>.supabase.co`) → for **`prisma db push` / migrations**

Prisma migrations can fail on the pooler because pgbouncer doesn't support all
prepared-statement features Prisma needs. When you run `prisma db push`, switch
to the direct URL:

```bash
export DATABASE_URL="postgresql://postgres.mmovwpdgrgdiyqheroak:smart_ride662@db.mmovwpdgrgdiyqheroak.supabase.co:5432/postgres"
bun run db:push
# then switch back to the pooler URL for runtime:
export DATABASE_URL="postgresql://postgres.mmovwpdgrgdiyqheroak:smart_ride662@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
```

---

## 3. Fix obstacle #1 — EAS secrets (real values, no angle brackets)

The commands failed because `<your-mapbox-token>` etc. are shell redirections.
Use the **real values** below. The Firebase/Google values come straight from
your `google-services.json`; the external ones (Mapbox/Agora/Sentry) need you to
create accounts — see §6.

Run these from `expo-app/` (you were already there):

```bash
cd /c/Smart_Ride/expo-app

# ---- Firebase (values from your google-services.json — already known) ----
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY              --value "AIzaSyB6d8SCey9MX_fJy6nXx9ycqtNmPw6fuGg"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID               --value "1:531949209415:android:73229ed013d4d5f507ae62"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID           --value "smart-ride-774e7"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID  --value "531949209415"

# ---- Google Sign-In Web Client ID (OAuth client type 3) ----
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "531949209415-h0ri57i233r1l767tnc4i26brdt3asb3.apps.googleusercontent.com"

# ---- API base URL ----
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://smartrideug.vercel.app/api"
```

For the three remaining secrets, you need to **create the accounts first** (§6),
then substitute the real values:

```bash
# ---- Mapbox (get token from https://account.mapbox.com/access-tokens/) ----
eas secret:create --scope project --name EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN --value "pk.eyJ1IjoieW91ciIsImEiOiJ....your.real.mapbox.token"

# ---- Agora (get App ID from https://agora.io — Project Management) ----
eas secret:create --scope project --name EXPO_PUBLIC_AGORA_APP_ID --value "your_real_agora_app_id"

# ---- Sentry DSN (get from https://sentry.io — Project Settings → Client Keys) ----
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://your_real@sentry.io/project"
```

> **Tip:** If a secret already exists, `eas secret:create` will error. Update
> with `eas secret:update --scope project --name NAME --value "newvalue"`.

Verify they're all set:
```bash
eas secret:list --scope project
```

---

## 4. Fix obstacle #3 — seed the admin (correct directory)

The seed script lives at the **project root**, not in `expo-app/`:

```bash
# ❌ WRONG — script isn't in expo-app/prisma/
cd /c/Smart_Ride/expo-app
bun run prisma/seed-production-admin.ts   # → Module not found

# ✅ CORRECT — run from project root
cd /c/Smart_Ride
export DATABASE_URL="postgresql://postgres.mmovwpdgrgdiyqheroak:smart_ride662@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
export SEED_ADMIN_EMAIL="naturalintellectscrop@gmail.com"
export SEED_ADMIN_PASSWORD="intellects@nrtcorp"
bun run prisma/seed-production-admin.ts
```

Expected output:
```
=================================
Smart Ride - Production Admin Seed
=================================
Checking if admin exists: naturalintellectscrop@gmail.com
Creating new admin user...
✅ Created admin: naturalintellectscrop@gmail.com (SUPER_ADMIN)
=================================
✅ Admin credentials:
   Email: naturalintellectscrop@gmail.com
   Password: (set via SEED_ADMIN_PASSWORD env var — not printed)
=================================
```

> If you already ran it once, re-running is safe — it will detect the existing
> admin, update the password, and promote the role to `SUPER_ADMIN`.

---

## 5. Recreate `expo-app/.env` locally (gitignored)

`git pull` won't bring this over. Create it:

```bash
cd /c/Smart_Ride/expo-app
cat > .env << 'EOF'
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=531949209415-h0ri57i233r1l767tnc4i26brdt3asb3.apps.googleusercontent.com
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyB6d8SCey9MX_fJy6nXx9ycqtNmPw6fuGg
EXPO_PUBLIC_FIREBASE_APP_ID=1:531949209415:android:73229ed013d4d5f507ae62
EXPO_PUBLIC_FIREBASE_PROJECT_ID=smart-ride-774e7
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=531949209415
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=REPLACE_WITH_YOUR_MAPBOX_TOKEN
EXPO_PUBLIC_AGORA_APP_ID=REPLACE_WITH_YOUR_AGORA_APP_ID
EXPO_PUBLIC_SENTRY_DSN=REPLACE_WITH_YOUR_SENTRY_DSN
EOF
```

> For local dev against a phone, change the first line to your machine's LAN IP,
> e.g. `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:3000/api`.

---

## 6. External integrations YOU must perform (one-time)

These cannot be automated — each requires an account + manual key generation.

### 6a. Mapbox (REQUIRED for maps) — 5 minutes
1. Go to https://account.mapbox.com/access-tokens/
2. Sign up / log in.
3. "Create a token" → default scopes are fine.
4. Copy the `pk.eyJ...` token.
5. Set it as the EAS secret (§3) and in `expo-app/.env` (§5).
6. **Also** set `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel (for server-side reverse geocoding).

### 6b. Firebase (ALREADY DONE ✓) — just verify
Your `google-services.json` already has the EAS production SHA-1
(`78:92:F1:18:...`). Confirm in Firebase Console → Project settings →
"SHA certificate fingerprints" you see all three:
- `f28c61cc...0ae1` (debug keystore)
- `98ea9b4b...78f4` (old upload keystore)
- `7892f118...c839` (EAS production keystore) ← the one you just added

If any are missing, add them under Project settings → Your apps → Android →
"Add fingerprint", then re-download `google-services.json`. (Your merged copy
on the server already has all 3 OAuth clients.)

### 6c. Firebase Admin SDK (for push notifications) — 5 minutes
1. Firebase Console → Project settings → **Service accounts** tab.
2. "Generate new private key" → downloads a JSON file.
3. Open it, copy the **entire** JSON as a single minified line.
4. In Vercel, set `FIREBASE_SERVICE_ACCOUNT_JSON` = that minified JSON string.

### 6d. Supabase (REQUIRED for realtime + RLS) — 5 minutes
1. Supabase dashboard → your project `mmovwpdgrgdiyqheroak`.
2. Settings → API:
   - `anon` `public` key → set as `SUPABASE_ANON_KEY` in Vercel.
   - `service_role` key → set as `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
3. Settings → Database → Connection string → confirm the pooler + direct URLs.
4. Run the RLS migrations in `supabase/migrations/` against your database
   (SQL Editor → paste each file → Run). Order: `001` → `002` → `005` → `006` → `008`.

### 6e. Agora (OPTIONAL — in-app calling) — 10 minutes
Only needed if you want voice/video calls between rider and client.
1. https://agora.io → sign up → Project Management → Create project.
2. Copy the **App ID** (no certificate needed for testing).
3. Set as EAS secret `EXPO_PUBLIC_AGORA_APP_ID` + in `expo-app/.env`.
4. For production, enable App Certificate and store the cert server-side.

> **If you skip Agora**, the calling screens will show a disabled state — the
> app still works for everything else. Safe to defer.

### 6f. Sentry (OPTIONAL — crash reporting) — 5 minutes
1. https://sentry.io → create project → React Native.
2. Copy the DSN (`https://...@sentry.io/...`).
3. Set as EAS secret `EXPO_PUBLIC_SENTRY_DSN` + in `expo-app/.env`.

---

## 7. Vercel backend environment variables

In Vercel → your `smartrideug` project → Settings → Environment Variables →
Production environment, set EVERY one of these (use `.env.production` on the
server as your reference — same values):

| Variable | Value / Source |
|----------|---------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | pooler URL with `?pgbouncer=true&sslmode=require` (quoted if via CLI) |
| `JWT_SECRET` | `a8d0c4699991d9ba8db6e73c28178b11` |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `CRON_SECRET` | `f750dfa3d85b8439f625ffc6a203e0d3` |
| `INTERNAL_API_KEY` | `312cbb13ee39ac1fd56fbd095ac21a9c` |
| `SYSTEM_API_KEY` | `25514491f65cd499d388da0b76b36ce0` |
| `NEXT_PUBLIC_APP_URL` | `https://smartrideug.vercel.app` |
| `NEXT_PUBLIC_API_URL` | `https://smartrideug.vercel.app/api` |
| `CORS_ALLOWED_ORIGINS` | `https://smartrideug.vercel.app` |
| `SUPABASE_URL` | `https://mmovwpdgrgdiyqheroak.supabase.co` |
| `SUPABASE_ANON_KEY` | from Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase dashboard |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | from Mapbox (§6a) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | minified JSON (§6c) |
| `RESEND_API_KEY` | optional — from resend.com |

After setting all, **redeploy** the Vercel project (Deployments → latest → Redeploy).

---

## 8. Build the APK (LOCAL — Android Studio + GitBash, no EAS)

You said you want to use **Android Studio + GitBash** instead of EAS. This is
the local-build path. It's faster (no upload to EAS servers) and gives you full
control over the keystore.

### 8a. Prerequisites (one-time setup)

1. **Android Studio** installed (provides Android SDK + JDK 17).
2. **GitBash** (you already have it — that's where you run commands).
3. **Node + a package manager** (`bun` or `npm`) — you have this.
4. **Java JDK 17** — Android Studio bundles it. Verify:
   ```bash
   java -version
   # Should show 17.x.x. If not, set JAVA_HOME to Android Studio's JDK:
   # export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
   ```
5. **ANDROID_HOME** env var pointing to the Android SDK:
   ```bash
   # Add to your ~/.bashrc (GitBash) so it persists:
   echo 'export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"' >> ~/.bashrc
   echo 'export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"' >> ~/.bashrc
   source ~/.bashrc
   ```

### 8b. Generate the native Android project (prebuild)

Expo Router apps need a one-time `prebuild` to generate the native
`android/` folder (Java/Kotlin + Gradle) from `app.json` + plugins:

```bash
cd /c/Smart_Ride/expo-app

# Generate the android/ folder (merges app.json plugins, google-services.json,
# Mapbox, Google Sign-In, Sentry, etc. into native Gradle config):
npx expo prebuild --platform android --clean

# This creates /c/Smart_Ride/expo-app/android/ — open it in Android Studio:
#   File → Open → select /c/Smart_Ride/expo-app/android
```

> `--clean` wipes any previous `android/` folder. If you've made manual native
> edits you want to keep, drop `--clean` (but for a fresh build, use it).

### 8c. Set up the signing keystore

You need a release keystore to sign the APK. You can either:

**Option A — Use the EAS keystore you already have** (recommended, so the
SHA-1 matches Firebase):
```bash
cd /c/Smart_Ride/expo-app

# Download your EAS keystore credentials:
eas credentials --platform android
# Navigate: Keystore → "Download keystore" → saves a .keystore file

# Move it into place:
mkdir -p android/app
mv ~/Downloads/smart-ride.keystore android/app/smartride.keystore
```

**Option B — Create a new debug+release keystore** (if you don't care about
SHA-1 matching Firebase — you'd need to re-register the new SHA-1 in Firebase):
```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore android/app/smartride.keystore \
  -alias smartride-key \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Smart Ride, OU=Mobile, O=Natural Intellects, L=Kampala, C=UG"
# Enter a keystore password (REMEMBER IT) — store in android/key.properties
```

Create `android/key.properties` (GITIGNORED — never commit):
```bash
cat > android/key.properties << 'EOF'
storeFile=smartride.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=smartride-key
keyPassword=YOUR_KEY_PASSWORD
EOF
```

### 8d. Build the APK from GitBash

```bash
cd /c/Smart_Ride/expo-app/android

# Build the debug APK (fast, no signing needed — for quick testing):
./gradlew assembleDebug

# Build the release APK (signed, optimized — for real device testing):
./gradlew assembleRelease

# Output APK location:
#   android/app/build/outputs/apk/debug/app-debug.apk
#   android/app/build/outputs/apk/release/app-release.apk
```

> If `./gradlew` fails with "permission denied", run:
> `chmod +x android/gradlew`

### 8e. Install on your phone

```bash
# Option 1 — adb (USB debugging enabled on phone):
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Option 2 — manual: copy the .apk to your phone (USB/email/cloud) and tap to install.
# You may need to enable "Install unknown apps" for your file manager.
```

### 8f. Build from Android Studio (GUI alternative)

1. Open Android Studio → File → Open → `/c/Smart_Ride/expo-app/android`
2. Wait for Gradle sync to finish (bottom-right spinner).
3. Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. When done, click "locate" in the notification to find the `.apk`.

### 8g. Common build issues

| Error | Fix |
|-------|-----|
| `SDK location not found` | Create `android/local.properties` with `sdk.dir=C:\\Users\\YOURNAME\\AppData\\Local\\Android\\Sdk` (double backslashes in GitBash). |
| `google-services.json not found` | Ensure `expo-app/google-services.json` exists (it does — merged with all 3 SHA-1s). Re-run `npx expo prebuild` if missing. |
| `Mapbox download token missing` | Set `SDK_REGISTRY_TOKEN` env var to your Mapbox token, OR it's auto-read from `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` in `.env`. |
| `OutOfMemoryError` in Gradle | Edit `android/gradle.properties`, set `org.gradle.jvmargs=-Xmx4096m`. |
| `Could not resolve sentry` | Ensure `@sentry/react-native` is installed in `expo-app/`: `cd expo-app && bun add @sentry/react-native`. |
| Google Sign-In `DEVELOPER_ERROR` | Your APK's signing SHA-1 must match one of the 3 registered in Firebase. Run `keytool -list -v -keystore android/app/smartride.keystore -alias smartride-key` to check. |

### 8h. EAS alternative (if local build fails)

If the local Android Studio path gives you trouble, EAS cloud builds still work:

```bash
cd /c/Smart_Ride/expo-app
eas build --profile apk --platform android --non-interactive
# Downloads from expo.dev when done.
```

---

## 9. NylonPay (merchant of record) — next phase

Full integration guide: `agent-ctx/NP-1-nylonpay-research.md` (68 KB, 12 sections).

**TL;DR:**
- NylonPay replaces MTN MoMo + Airtel + Flutterwave with ONE SDK
  (`@nile-squad/nylonpay-ts`) + one key pair.
- Customer pays → money lands in your NylonPay collection account (3% fee,
  net to you) → you disburse to riders/merchants via `makePayout()`.
- Uganda fully supported (MTN + Airtel + bank + cards, UGX).
- Sandbox keys (`npk_sandbox_…`) let you test without KYC.
- KYC L1 (free, 1–2 days) → 10M UGX/month. L2 (free, 5 days) → 100M + cards.

**Your action items for NylonPay (do AFTER the APK test):**
1. Sign up at https://dashboard.nylonpay.nilesquad.com (sandbox).
2. Grab `npk_sandbox_…` API key + `nps_sandbox_…` secret.
3. Start KYC L1 in parallel (takes 1–2 days).
4. Tell me when you have the sandbox keys — I'll wire the SDK into
   `src/lib/payments/nylonpay.ts` + the two API routes + the payment state
   machine (estimated ~17 hrs dev, detailed in the research doc §11).

---

## 10. Fastest path to Google Play Internal Testing

```
NOW ───────────────────────────────────────────────────────► PLAY INTERNAL
                                                              TESTING
[Today]                          [Today+1]              [Today+2]
 │                                │                      │
 ├─ §5  expo-app/.env             ├─ §8  APK build       ├─ §6a-6d done
 ├─ §6a Mapbox token              │   (sideload test)    ├─ Vercel redeployed
 ├─ §6c Firebase Admin JSON       │                      ├─ Final APK build
 ├─ §6d Supabase keys + RLS       ├─ §4  seed admin      │  (production profile)
 ├─ §3  EAS secrets (all)         ├─ §7  Vercel env vars ├─ Upload .aab to Play
 ├─ §2  DATABASE_URL quoting      │                      │  Console → Internal
 └─ §1  git pull                  └─ Fix any test bugs   └─ Testing track
```

**Why APK first, then AAB:** you said "lets use apk for the builds coz i need
to test one more time" — correct. APK sideload lets you iterate fast (no Play
review). Once the app behaves, switch `eas.json` `production` profile to
`"buildType": "app-bundle"` and `eas build -p android --profile production` →
upload the `.aab` to Play Console → Internal Testing track → invite testers.

---

## 11. What breaks first with 100 users (capacity notes)

Based on the current architecture (Vercel Hobby + Supabase free tier):

1. **Supabase free tier** — 500 MB DB, 1 GB egress, **50k monthly active users
   on Auth**, paused after 1 week of inactivity. With 100 active users/day
   you're fine; at ~5k/day you'd hit the auth MAU ceiling. Upgrade to Pro ($25/mo)
   well before that.
2. **Vercel Hobby** — 100 GB bandwidth, 100 GB-hr serverless execution. A
   ride-tracking app with frequent polling can burn through serverless hours
   fast. Watch the usage graph after launch.
3. **Mapbox free tier** — 50k map loads/mo. 100 users × ~5 sessions/day × 10
   loads/session = 50k loads in ONE day. **You'll blow past this fast.** Either
   cache tile requests aggressively or budget for Mapbox paid ($0.50/1k loads
   after free tier).
4. **Realtime connections** — Supabase Realtime free tier allows limited
   concurrent connections. Driver location streaming for 100 concurrent rides
   is the highest-risk component. Consider a dedicated WebSocket mini-service
   (the project already supports `mini-services/` for this) if you see lag.
5. **No payment reconciliation** — cash-only means you're trusting drivers to
   hand in cash. At 100 rides/day this becomes an accounting nightmare.
   NylonPay (§9) fixes this; prioritize it after launch.

---

## 12. Quick verification checklist (run after §1–§8)

- [ ] `git pull` succeeded, `prisma/seed-production-admin.ts` exists locally
- [ ] `echo "$DATABASE_URL"` prints the full URL with `&sslmode=require`
- [ ] `eas secret:list` shows all 8+ secrets
- [ ] Seed script ran: admin `naturalintellectscorp@gmail.com` is `SUPER_ADMIN`
- [ ] Vercel redeploy succeeded, `https://smartrideug.vercel.app/api/health` returns 200
- [ ] APK builds, installs, launches, shows login screen
- [ ] Google Sign-In button works on the APK
- [ ] Map renders (Mapbox token valid)
- [ ] Can log in as admin at `https://smartrideug.vercel.app/admin`

When all boxes are checked, you're ready to build the final AAB for Play Internal Testing.
