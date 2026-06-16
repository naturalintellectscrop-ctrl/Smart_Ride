// ============================================
// SMART RIDE MOBILE - DELETE ACCOUNT SCREEN
// ============================================
// Confirmation screen for permanent account deletion
// Stitch MD3 Design System — Danger theme (red)
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { useAuthStore } from '@/src/store';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';

// Consequences list
const CONSEQUENCES = [
  'Your profile, name, and contact details will be erased.',
  'You will lose access to your ride history and orders.',
  'All saved addresses and payment methods will be removed.',
  'Your active sessions will be revoked immediately.',
  'This action is permanent and cannot be undone.',
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const CONFIRM_PHRASE = 'DELETE';
  const canSubmit = password.trim().length > 0 && confirmText === CONFIRM_PHRASE;

  const handleDelete = useCallback(async () => {
    setError(null);

    if (!password) {
      setError('Please enter your password to confirm');
      return;
    }

    if (confirmText !== CONFIRM_PHRASE) {
      setError(`Please type "${CONFIRM_PHRASE}" to confirm`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.deleteAccount(password.trim());

      if (response.success) {
        setSuccess(true);
        // Show success state, then logout and navigate to login
        setTimeout(async () => {
          try {
            await logout();
          } catch (e) {
            console.warn('[DELETE-ACCOUNT] logout error:', e);
          }
          router.replace('/auth/login');
        }, 2000);
      } else {
        setError(response.error || 'Failed to delete account');
      }
    } catch (err) {
      console.error('Delete account error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [password, confirmText, logout, router]);

  // Success state
  if (success) {
    return (
      <View style={styles.screen}>
        <View style={[styles.successContainer, { paddingTop: insets.top + 80 }]}>
          <Animated.View entering={ZoomIn.duration(400).springify()}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
            </View>
          </Animated.View>
          <Animated.Text
            entering={FadeInUp.duration(400).delay(100).springify()}
            style={styles.successTitle}
          >
            Account Deleted
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.duration(400).delay(200).springify()}
            style={styles.successMessage}
          >
            Your account has been successfully deleted. Redirecting to login...
          </Animated.Text>
          <ActivityIndicator
            color={COLORS.primary}
            size="small"
            style={{ marginTop: SPACING.md }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/profile');
              }
            }}
            style={styles.headerBtn}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delete Account</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Warning Hero */}
          <Animated.View
            entering={ZoomIn.duration(400).springify()}
            style={styles.warningHero}
          >
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning-outline" size={40} color={COLORS.error} />
            </View>
            <Text style={styles.warningTitle}>Permanent Action</Text>
            <Text style={styles.warningSubtitle}>
              You're about to permanently delete your Smart Ride account
            </Text>
          </Animated.View>

          {/* Consequences Card */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(100).springify()}
            style={styles.consequencesCard}
          >
            <Text style={styles.consequencesTitle}>What happens next:</Text>
            {CONSEQUENCES.map((item, index) => (
              <View key={index} style={styles.consequenceRow}>
                <View style={styles.consequenceDot}>
                  <Ionicons name="close" size={10} color={COLORS.onError} />
                </View>
                <Text style={styles.consequenceText}>{item}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Error */}
          {error && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </Animated.View>
          )}

          {/* Password Confirmation */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(200).springify()}
            style={styles.formSection}
          >
            <Text style={styles.fieldLabel}>Enter your password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={COLORS.outline}
                style={{ paddingLeft: 12 }}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Your account password"
                placeholderTextColor={COLORS.outline}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.outline}
                />
              </TouchableOpacity>
            </View>

            {/* Type DELETE Confirmation */}
            <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>
              Type <Text style={styles.confirmPhrase}>{CONFIRM_PHRASE}</Text> to confirm
            </Text>
            <View
              style={[
                styles.inputWrapper,
                confirmText.length > 0 &&
                  confirmText !== CONFIRM_PHRASE && { borderColor: COLORS.error },
              ]}
            >
              <Ionicons
                name="keypad-outline"
                size={16}
                color={COLORS.outline}
                style={{ paddingLeft: 12 }}
              />
              <TextInput
                style={styles.textInput}
                placeholder={`Type "${CONFIRM_PHRASE}"`}
                placeholderTextColor={COLORS.outline}
                value={confirmText}
                onChangeText={(text) => {
                  setConfirmText(text);
                  if (error) setError(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
            {confirmText.length > 0 && confirmText !== CONFIRM_PHRASE && (
              <Text style={styles.matchError}>Text does not match</Text>
            )}
          </Animated.View>

          {/* Delete Button */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(300).springify()}
            style={styles.actionContainer}
          >
            <TouchableOpacity
              style={[
                styles.deleteButton,
                (!canSubmit || isLoading) && styles.deleteButtonDisabled,
              ]}
              onPress={handleDelete}
              disabled={!canSubmit || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.onError} size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color={COLORS.onError} />
                  <Text style={styles.deleteButtonText}>
                    I understand, delete my account
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/profile');
                }
              }}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Keep My Account</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    ...TYPOGRAPHY.headlineLgMobile,
    color: COLORS.onSurface,
    letterSpacing: -0.5,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },

  // Warning Hero
  warningHero: {
    alignItems: 'center',
    backgroundColor: COLORS.errorContainer,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(186, 26, 26, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  warningTitle: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onErrorContainer,
    marginBottom: 4,
  },
  warningSubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onErrorContainer,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Consequences
  consequencesCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  consequencesTitle: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  consequenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  consequenceDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  consequenceText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    flex: 1,
    lineHeight: 20,
  },

  // Error Banner
  errorBanner: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    borderColor: 'rgba(186, 26, 26, 0.2)',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBannerText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },

  // Form
  formSection: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  fieldLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 14,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    color: COLORS.onSurface,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  confirmPhrase: {
    color: COLORS.error,
    fontWeight: '700',
    letterSpacing: 1,
  },
  matchError: {
    color: COLORS.error,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },

  // Actions
  actionContainer: {
    marginTop: SPACING.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 2,
    marginBottom: SPACING.md,
    ...SHADOWS.button,
    shadowColor: COLORS.error,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: COLORS.onError,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
  },
  cancelButtonText: {
    color: COLORS.onSurface,
    fontWeight: '600',
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  successIconContainer: {
    width: 112,
    height: 112,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0, 110, 47, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    ...TYPOGRAPHY.headlineLgMobile,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  successMessage: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
  },
});
