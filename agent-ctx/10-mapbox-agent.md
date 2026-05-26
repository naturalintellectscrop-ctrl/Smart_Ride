# Task 10: Mapbox Maps Integration Agent

## Summary
Implemented proper Mapbox maps integration for the Smart Ride Expo app, replacing direct react-native-maps usage with a unified SmartRideMap component that supports both Mapbox GL and react-native-maps fallback.

## Files Created
- `/home/z/my-project/expo-app/src/components/SmartRideMap.tsx` - Unified map component
- `/home/z/my-project/expo-app/app/location-picker.tsx` - Full-screen location picker screen

## Files Modified
- `/home/z/my-project/expo-app/app/rider/ride-tracking.tsx` - Replaced direct map usage with SmartRideMap
- `/home/z/my-project/expo-app/app/driver/index.tsx` - Replaced direct map usage with SmartRideMap
- `/home/z/my-project/expo-app/app/driver/driver-task.tsx` - Replaced direct map usage with SmartRideMap
- `/home/z/my-project/expo-app/app/orders/order-tracking.tsx` - Replaced direct map usage with SmartRideMap
- `/home/z/my-project/expo-app/app.json` - Added @rnmapbox/maps plugin
- `/home/z/my-project/expo-app/src/components/index.ts` - Added SmartRideMap exports

## Key Design Decisions
1. **Dual implementation**: Mapbox GL when token is available, react-native-maps fallback otherwise
2. **Graceful degradation**: Try/catch around @rnmapbox/maps require, falls back silently
3. **Web compatibility**: Always uses web mock on Platform.OS === 'web'
4. **Dark theme**: Both implementations use dark map styles (Mapbox dark-v11, custom dark style array for react-native-maps)
5. **Custom Ionicons markers**: Replaced default pin markers with branded marker views

## Important Notes
- EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN env var must be set for Mapbox GL to activate
- @rnmapbox/maps package is NOT currently in package.json - needs `bun add @rnmapbox/maps` to install
- The RNMapboxMapsDownloadToken in app.json is empty - needs actual token for native builds
- All existing screen functionality preserved (polling, socket, animations, etc.)
