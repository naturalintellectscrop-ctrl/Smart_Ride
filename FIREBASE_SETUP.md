# Firebase Setup for Smart Ride Mobile

## IMPORTANT: You Don't Need a New Firebase Project!

Firebase allows you to add multiple apps (Web, Android, iOS) to the **same project**. 
Your existing web app will continue working while you add mobile support.

## Step-by-Step Guide

### Step 1: Go to Your Existing Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your existing Smart Ride project

### Step 2: Add Android App

1. In your project overview, click **"Add app"** → Select **Android** icon
2. Enter the following details:
   - **Android package name**: `ug.smartride.app`
   - **App nickname**: `Smart Ride Android`
   - **SHA-1**: (Optional for development, required for Google Sign-In)

3. Click **"Register app"**

4. **Download `google-services.json`**
   - This is your Android config file
   - Place it in: `smart-ride-mobile/google-services.json`

5. Click **"Next"** through the remaining steps (we handle this via Expo)

### Step 3: Add iOS App

1. In your project overview, click **"Add app"** → Select **iOS** icon
2. Enter the following details:
   - **iOS bundle ID**: `ug.smartride.app`
   - **App nickname**: `Smart Ride iOS`
   - **App Store ID**: (Leave blank for now)

3. Click **"Register app"**

4. **Download `GoogleService-Info.plist`**
   - This is your iOS config file
   - Place it in: `smart-ride-mobile/GoogleService-Info.plist`

5. Click **"Next"** through the remaining steps

### Step 4: Enable Required Services

In Firebase Console, ensure these are enabled for ALL apps:

#### Authentication
1. Go to **Authentication** → **Sign-in method**
2. Enable:
   - ✅ Email/Password
   - ✅ Phone (if using phone auth)
   - ✅ Google (if using Google Sign-In)

#### Cloud Messaging (FCM) for Push Notifications
1. Go to **Project Settings** → **Cloud Messaging**
2. For each app, note the **Server Key** and **Sender ID**
3. Add to your `.env`:
   ```
   FIREBASE_SERVER_KEY=your_server_key
   FIREBASE_SENDER_ID=your_sender_id
   ```

### Step 5: Update Expo Configuration

Your `app.json` already references these files:
```json
{
  "android": {
    "googleServicesFile": "./google-services.json"
  }
}
```

### Step 6: Configure Push Notifications

The notification service is already set up in `src/services/notifications.ts`. 
It will automatically use Firebase Cloud Messaging when you build the app.

## File Structure After Setup

```
smart-ride-mobile/
├── google-services.json       ← Android config (from Firebase)
├── GoogleService-Info.plist   ← iOS config (from Firebase)
├── app.json                   ← Already configured
└── src/services/
    └── notifications.ts       ← Push notification service
```

## How Backend Connects

Your existing backend already has Firebase integration:

```
src/lib/firebase/
├── firebase-service.ts    ← Firebase Admin SDK
└── fcm-service.ts         ← FCM for push notifications
```

**No changes needed to the backend!** It will send push notifications to both web and mobile apps.

## Testing Push Notifications

1. Run the mobile app
2. The app will register its FCM token with your backend
3. Backend can now send push notifications to the device

## Multi-Platform Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE PROJECT                          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Web App   │  │ Android App │  │   iOS App   │         │
│  │ (Existing)  │  │   (New)     │  │   (New)     │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│  ┌───────────────────────▼───────────────────────┐         │
│  │            Firebase Services                    │         │
│  │  • Authentication                              │         │
│  │  • Cloud Messaging (Push)                      │         │
│  │  • Firestore (if used)                         │         │
│  │  • Storage (if used)                           │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ API Calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              SMART RIDE BACKEND (Next.js)                    │
│                                                              │
│  • REST APIs (/api/*)                                        │
│  • Firebase Admin SDK                                        │
│  • Push Notifications                                        │
│  • Authentication                                            │
└─────────────────────────────────────────────────────────────┘
```

## Summary

- ✅ Add Android app to existing Firebase project
- ✅ Add iOS app to existing Firebase project
- ✅ Download config files and place in mobile app
- ✅ No backend changes required
- ✅ Web app continues working normally
- ✅ Push notifications work for all platforms
