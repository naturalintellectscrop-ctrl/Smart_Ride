// ============================================
// SMART RIDE MOBILE - PRESCRIPTIONS SCREEN
// ============================================
// Placeholder screen for prescription management
// DESIGN: Dark theme with StyleSheet, GlassCard
// ============================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/src/constants';
import { GlassCard, GradientButton } from '@/src/components';

export default function PrescriptionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 || 56 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prescriptions</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.View
          entering={ZoomIn.duration(400).delay(100)}
          style={styles.placeholderContainer}
        >
          <GlassCard variant="default" padding={24} borderRadius={50} style={styles.iconCircle}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.primary} />
          </GlassCard>

          <Animated.Text
            entering={FadeIn.duration(400).delay(200)}
            style={styles.title}
          >
            Prescriptions Coming Soon
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.duration(400).delay(300)}
            style={styles.description}
          >
            Prescription upload and management will be available in a future update.
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.duration(400).delay(400)}
            style={styles.subtext}
          >
            You'll be able to upload prescriptions from your doctor, track verification status,
            and easily reorder medicines from your prescription history.
          </Animated.Text>

          <Animated.View
            entering={FadeIn.duration(400).delay(500)}
            style={styles.buttonContainer}
          >
            <GradientButton
              title="Back to Health"
              onPress={() => router.back()}
              variant="outline"
              size="md"
              icon={<Ionicons name="heart-outline" size={18} color={COLORS.primary} />}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: -0.5,
  },

  // Content
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 280,
  },
});
