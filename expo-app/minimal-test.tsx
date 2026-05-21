// ============================================
// MINIMAL BOOT TEST ROUTE
// ============================================
// Purpose: Verify app boots without external dependencies
// NO stores, NO services, NO Mapbox, NO Firebase
// Plain text only - if this renders, crash is in dependencies
// ============================================

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function MinimalBootTest() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>✅ BOOT SUCCESS</Text>
        <Text style={styles.subtitle}>Minimal route loaded</Text>
        <Text style={styles.info}>If you see this, the app boots correctly.</Text>
        <Text style={styles.info}>Crash is caused by imported dependencies.</Text>
        <View style={styles.divider} />
        <Text style={styles.checkItem}>✓ React Native works</Text>
        <Text style={styles.checkItem}>✓ Expo Router works</Text>
        <Text style={styles.checkItem}>✓ Navigation works</Text>
        <Text style={styles.checkItem}>✓ SafeAreaView works</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 24,
  },
  info: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 24,
  },
  checkItem: {
    fontSize: 16,
    color: '#00FF88',
    marginBottom: 8,
  },
});
