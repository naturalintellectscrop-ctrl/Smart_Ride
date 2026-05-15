// ============================================
// SMART RIDE - HOME SCREEN
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Ride</Text>
      <Text style={styles.subtitle}>Isolation Test #1: SafeAreaProvider</Text>
      <Text style={styles.status}>✅ App loaded successfully</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1220',
  },
  title: {
    color: '#10B981',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 24,
  },
  status: {
    color: '#10B981',
    fontSize: 14,
  },
});
