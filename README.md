# Smart Ride Mobile App

A production-ready React Native mobile application for the Smart Ride multi-service mobility platform in Uganda.

## 🚀 Features

- **Rides**: Smart Boda (motorcycle) and Smart Car rides
- **Food Delivery**: Order from restaurants
- **Shopping**: Shop from stores near you
- **Item Delivery**: Send packages anywhere
- **Smart Health**: Order medicines & healthcare products

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Expo** | React Native framework |
| **Expo Router** | File-based navigation |
| **NativeWind** | Tailwind CSS for mobile |
| **Zustand** | State management |
| **TanStack Query** | Server state management |
| **Socket.io Client** | Real-time updates |
| **Mapbox** | Maps and routing |
| **Expo SecureStore** | Secure token storage |
| **Expo Location** | GPS tracking |
| **Expo Notifications** | Push notifications |

## 📁 Project Structure

```
smart-ride-mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Main tab navigation
│   │   ├── index.tsx      # Home screen
│   │   ├── rides.tsx      # Ride history
│   │   ├── orders.tsx     # Orders list
│   │   └── profile.tsx    # User profile
│   ├── auth/              # Authentication
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── rider/             # Rider screens
│   │   ├── ride-request.tsx
│   │   └── ride-tracking.tsx
│   ├── driver/            # Driver screens
│   │   ├── index.tsx
│   │   └── driver-task.tsx
│   └── orders/            # Order screens
│       ├── restaurants.tsx
│       ├── cart.tsx
│       └── order-tracking.tsx
├── src/
│   ├── store/             # Zustand stores
│   ├── services/          # API & Socket services
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript types
│   └── constants/         # App constants
├── assets/                # Images, fonts, etc.
├── app.json               # Expo configuration
├── tailwind.config.js     # NativeWind config
└── package.json           # Dependencies
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
cd smart-ride-mobile
npm install
```

### 2. Configure Mapbox

Get your Mapbox token from [Mapbox](https://account.mapbox.com/) and add it to `app.json`:

```json
{
  "extra": {
    "mapboxAccessToken": "YOUR_MAPBOX_ACCESS_TOKEN"
  }
}
```

Also update the `@rnmapbox/maps` plugin configuration:
```json
{
  "iosKey": "YOUR_MAPBOX_IOS_KEY",
  "androidKey": "YOUR_MAPBOX_ANDROID_KEY"
}
```

### 3. Configure Firebase

**You don't need a new Firebase project!** Add mobile apps to your existing project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your existing Smart Ride project
3. Add Android app:
   - Package name: `ug.smartride.app`
   - Download `google-services.json` → place in project root
4. Add iOS app:
   - Bundle ID: `ug.smartride.app`
   - Download `GoogleService-Info.plist` → place in project root

See `FIREBASE_SETUP.md` for detailed instructions.

### 4. Run the App

```bash
# Start development server
npx expo start

# Run on specific platform
npx expo start --android
npx expo start --ios
```

Then scan the QR code with:
- **Android**: Expo Go app
- **iOS**: Camera app

## 🔌 Backend Connection

The mobile app connects to your existing Next.js backend:

- **Development**: `http://localhost:3000/api`
- **Production**: Update `apiBaseUrl` in `app.json`

All existing APIs work without any changes:
- Authentication (`/api/auth/*`)
- Tasks/Rides (`/api/tasks/*`)
- Orders (`/api/orders/*`)
- Payments (`/api/payments/*`)
- Notifications (`/api/notifications/*`)

## 📱 App Flows

### Rider Flow

1. **Home** → Select service (Ride, Food, Shopping, etc.)
2. **Ride Request** → Set pickup & dropoff locations
3. **Confirm** → Choose payment method, confirm fare
4. **Tracking** → Real-time driver location on map
5. **Complete** → Rate driver, receive receipt

### Driver Flow

1. **Go Online** → Toggle availability
2. **Receive Request** → Accept/decline incoming rides
3. **Navigate** → Open maps for navigation
4. **Update Status** → Arrived, Picked up, In transit
5. **Complete** → Mark trip complete, earn fare

## 🔄 Real-time Features

- Driver location updates (every 5 seconds)
- Task status changes
- Incoming ride requests
- Order status updates
- SOS alerts

## 📞 Push Notifications

Notification types:
- ✅ Ride request received (drivers)
- ✅ Driver accepted (riders)
- ✅ Driver arrived (riders)
- ✅ Ride completed (both)
- ✅ Order updates (customers)
- ✅ Payment received
- 🚨 SOS emergency alerts

## 🎨 Customization

### Colors

Edit `src/constants/index.ts`:

```typescript
export const COLORS = {
  primary: '#1F4E79',      // Brand color
  secondary: '#22C55E',    // Success/online
  accent: '#F59E0B',       // Highlights
  warning: '#EF4444',      // Errors/SOS
  // ...
};
```

### Theme

The app supports light/dark mode via `next-themes`:
- Automatic detection
- Manual toggle in profile

## 🏗 Building for Production

### Development Build

```bash
npx expo run:android
npx expo run:ios
```

### Production Build (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build
eas build --platform android
eas build --platform ios
```

### Standalone APK (Android)

```bash
cd android
./gradlew assembleRelease
```

## 📋 Environment Variables

Add to `app.json` under `extra`:

```json
{
  "extra": {
    "apiBaseUrl": "https://your-api.com/api",
    "mapboxAccessToken": "your-mapbox-token"
  }
}
```

## 🔒 Security

- JWT tokens stored in **Expo SecureStore** (encrypted)
- API requests authenticated via Bearer token
- HTTPS required for production
- Location permissions handled properly

## 🐛 Debugging

```bash
# View logs
npx expo start --dev-client

# React Native Debugger
# Install: https://github.com/jhen0409/react-native-debugger
```

## 📚 Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [NativeWind](https://www.nativewind.dev/)
- [Mapbox React Native](https://github.com/rnmapbox/maps)

## 🤝 Support

For issues or questions:
- Check existing GitHub issues
- Contact: support@smartride.ug

---

Built with ❤️ for Uganda's mobility needs.
