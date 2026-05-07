// ============================================
// ISOLATION TEST #1 - SafeAreaProvider ONLY
// ============================================
// Purpose: Determine if crash is in provider tree (A)
//          or lower native/runtime (B)
// ============================================

// CRITICAL: Reanimated must be first import
import 'react-native-reanimated';

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
