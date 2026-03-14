# Smart Ride - Mobile App Migration Guide

## Overview

This document provides a comprehensive guide for migrating Smart Ride from Next.js Web App to React Native Mobile App.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Migration Steps](#migration-steps)
4. [Feature Mapping](#feature-mapping)
5. [Code Reuse Strategy](#code-reuse-strategy)
6. [Testing Strategy](#testing-strategy)
7. [Deployment](#deployment)

---

## Prerequisites

### Development Environment

```bash
# 1. Install Node.js (v18+)
# Download from: https://nodejs.org

# 2. Install React Native CLI
npm install -g react-native-cli

# 3. For iOS Development (macOS only)
# Install Xcode from App Store
# Install CocoaPods
sudo gem install cocoapods

# 4. For Android Development
# Install Android Studio
# Download from: https://developer.android.com/studio
# Install JDK 17+
```

### Environment Setup

```bash
# Create new React Native project
npx react-native@latest init SmartRide --template typescript

# Navigate to project
cd SmartRide

# Install dependencies
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install react-native-maps react-native-geolocation-service
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/messaging
npm install zustand @react-native-async-storage/async-storage
npm install react-native-vector-icons react-native-svg
npm install axios

# iOS Pods
cd ios && pod install && cd ..
```

---

## Architecture Overview

### Current Architecture (Next.js)

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Application                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)    │    API Routes    │    Database       │
│  - Components        │    - /api/auth   │    - Prisma        │
│  - Pages             │    - /api/rides  │    - PostgreSQL    │
│  - Hooks             │    - /api/orders │                    │
│  - Context           │    - /api/pay    │                    │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (React Native)

```
┌─────────────────────────────────────────────────────────────┐
│                 React Native Mobile App                      │
├─────────────────────────────────────────────────────────────┤
│  Mobile App (React Native)    │    Same Backend API         │
│  - Screens                      │    - /api/auth            │
│  - Components                   │    - /api/rides           │
│  - Navigation                   │    - /api/orders          │
│  - Native Modules               │    - /api/pay             │
│    - Maps (Google Maps)         │                           │
│    - Geolocation                │    Shared Database        │
│    - Push Notifications (FCM)   │    - Prisma               │
│    - Camera                     │    - PostgreSQL           │
│    - Background Tasks           │                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Difference: Backend API is REUSED

- **Same API endpoints** - No backend changes needed
- **Same database** - PostgreSQL stays
- **Same business logic** - Just new mobile UI

---

## Migration Steps

### Phase 1: Project Setup (Week 1)

```bash
# 1. Create React Native project
npx react-native@latest init SmartRide --template typescript

# 2. Configure TypeScript
# tsconfig.json - Copy path aliases from web project

# 3. Set up folder structure
mkdir -p src/{components,screens,navigation,services,hooks,store,utils,types,assets}
```

### Phase 2: Core Infrastructure (Week 2)

1. **State Management** - Port Zustand stores
2. **API Service** - Create API client (same endpoints)
3. **Navigation** - Set up React Navigation
4. **Theme System** - Port design tokens

### Phase 3: Authentication (Week 3)

1. Firebase Auth integration
2. Login/Register screens
3. Token management
4. Biometric auth (Face ID/Touch ID)

### Phase 4: Core Features (Week 4-6)

1. **Map Integration** - Google Maps for React Native
2. **Location Services** - GPS tracking
3. **Ride Booking** - Request flow
4. **Push Notifications** - FCM setup

### Phase 5: Additional Features (Week 7-8)

1. Food Delivery
2. Shopping
3. Payments (MTN MoMo, Airtel)
4. Profile Management

### Phase 6: Testing & Polish (Week 9-10)

1. Unit tests
2. Integration tests
3. UI polish
4. Performance optimization

---

## Feature Mapping

### Web Feature → React Native Equivalent

| Web Feature | React Native Implementation | Package |
|------------|---------------------------|---------|
| React Components | React Native Components | Built-in |
| CSS/Tailwind | StyleSheet / Styled Components | `react-native-unistyles` |
| Next.js Router | React Navigation | `@react-navigation/native` |
| Browser Geolocation | Native Geolocation | `react-native-geolocation-service` |
| Web Push | Firebase Cloud Messaging | `@react-native-firebase/messaging` |
| Mapbox GL JS | Google Maps | `react-native-maps` |
| LocalStorage | AsyncStorage | `@react-native-async-storage/async-storage` |
| Service Worker | Background Tasks | `react-native-background-fetch` |
| Camera (Web) | Native Camera | `react-native-image-picker` |

### Features That Work Better in React Native

| Feature | Web Limitation | Native Advantage |
|---------|---------------|------------------|
| **GPS Tracking** | Limited accuracy, no background | High accuracy, works in background |
| **Push Notifications** | Web Push unreliable | Native FCM/APNs, always works |
| **Maps** | WebGL performance issues | Native map rendering, 60fps |
| **Offline** | Service Worker limitations | Full offline database support |
| **Payment** | Browser restrictions | Direct mobile money SDK integration |

---

## Code Reuse Strategy

### What Can Be Reused

1. **API Client** - Same fetch/axios calls
2. **TypeScript Types** - Copy interface definitions
3. **Business Logic** - Validation, calculations
4. **Zustand Stores** - State management logic
5. **Utility Functions** - Date, string, formatting

### What Needs Rewriting

1. **UI Components** - Convert to React Native primitives
2. **Navigation** - Use React Navigation
3. **Styling** - Convert CSS to StyleSheet
4. **Platform APIs** - Use native modules

### Example: Porting a Component

**Web (React + Tailwind):**
```tsx
// Web Component
export function RideCard({ ride }: { ride: Ride }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-md">
      <h2 className="text-lg font-semibold">{ride.destination}</h2>
      <p className="text-gray-600">{ride.fare} UGX</p>
    </div>
  );
}
```

**React Native:**
```tsx
// React Native Component
import { View, Text, StyleSheet } from 'react-native';

export function RideCard({ ride }: { ride: Ride }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ride.destination}</Text>
      <Text style={styles.subtitle}>{ride.fare} UGX</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
});
```

---

## Testing Strategy

### Unit Tests

```bash
# Install testing libraries
npm install --save-dev jest @testing-library/react-native

# Run tests
npm test
```

### E2E Tests (Detox)

```bash
# Install Detox
npm install --save-dev detox detox-cli

# Configure for Android/iOS
detox init
```

---

## Deployment

### Google Play Store (Android)

1. **Create Developer Account** - $25 one-time fee
2. **Generate Signed APK/AAB**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
3. **Upload to Play Console**
4. **Set up staged rollout**

### Apple App Store (iOS)

1. **Create Developer Account** - $99/year
2. **Configure Signing** in Xcode
3. **Archive and Upload** via Xcode
4. **Submit for Review**

---

## Timeline Estimate

| Phase | Duration | Team Size | Deliverables |
|-------|----------|-----------|--------------|
| Setup | 1 week | 1 dev | Project structure, dependencies |
| Core | 2 weeks | 2 devs | Auth, navigation, API |
| Features | 4 weeks | 2 devs | All major features |
| Polish | 2 weeks | 2 devs | Testing, bug fixes |
| Launch | 1 week | 1 dev | Store submission |

**Total: 10 weeks (2.5 months)**

---

## Resources

- [React Native Docs](https://reactnative.dev)
- [React Navigation](https://reactnavigation.org)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Firebase React Native](https://rnfirebase.io)
- [Zustand](https://zustand-demo.pmnd.rs/)

---

## Next Steps

1. Set up React Native development environment
2. Create new project using this folder structure
3. Port API service and types from web app
4. Build authentication flow
5. Implement map and location services
6. Add ride booking features
7. Test on physical devices
8. Submit to app stores

**Questions? Contact the development team.**
