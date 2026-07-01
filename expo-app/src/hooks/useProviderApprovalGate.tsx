// ============================================
// SMART RIDE MOBILE - PROVIDER APPROVAL GATE
// ============================================
// Gates the Merchant / Pharmacist dashboards behind admin approval.
//
// A provider is NEVER active immediately. After onboarding their record is
// PENDING_APPROVAL until an admin approves it. This hook checks the signed-in
// user's merchant/pharmacy status and returns a full-screen status view to
// render INSTEAD of the dashboard while the account is not APPROVED:
//   - not onboarded  → redirect to the onboarding form
//   - PENDING        → "under review" screen
//   - REJECTED       → reason + re-apply
//   - SUSPENDED      → contact support
//   - APPROVED       → returns null (dashboard renders normally)
//
// Usage (top of a dashboard component, after hooks):
//   const gate = useProviderApprovalGate('PHARMACIST');
//   if (gate) return gate;
// ============================================

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { useAuthStore } from '@/src/store/authStore';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';

type Role = 'MERCHANT' | 'PHARMACIST';
type GateState = 'loading' | 'redirecting' | 'pending' | 'rejected' | 'suspended' | 'approved';

export function useProviderApprovalGate(role: Role): React.ReactElement | null {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [state, setState] = useState<GateState>('loading');
  const [reason, setReason] = useState<string | null>(null);
  const onboardingRoute = role === 'PHARMACIST' ? '/merchant/register?type=PHARMACY' : '/merchant/register';

  const check = useCallback(async () => {
    setState('loading');
    try {
      const res = await api.getMerchantProfile();
      const merchant = res.success ? (res.data as any) : null;
      if (!merchant?.id) {
        setState('redirecting');
        router.replace(onboardingRoute as any);
        return;
      }
      // Pharmacies carry their own status; fall back to the merchant status.
      const status: string = merchant.pharmacy?.status || merchant.status || 'PENDING_APPROVAL';
      setReason(merchant.rejectionReason || merchant.pharmacy?.rejectionReason || null);
      if (status === 'APPROVED') setState('approved');
      else if (status === 'REJECTED') setState('rejected');
      else if (status === 'SUSPENDED') setState('suspended');
      else setState('pending');
    } catch {
      // Network error — don't trap the user on a blank screen; let them retry.
      setState('pending');
    }
  }, [onboardingRoute, router]);

  useEffect(() => { check(); }, [check]);

  if (state === 'approved') return null;

  if (state === 'loading' || state === 'redirecting') {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const config = {
    pending: {
      icon: 'time-outline' as const,
      tint: COLORS.primary,
      title: 'Application under review',
      body: `Your ${role === 'PHARMACIST' ? 'pharmacy' : 'business'} application has been submitted and is being reviewed by our team. You'll be able to start operating as soon as it's approved.`,
    },
    rejected: {
      icon: 'close-circle-outline' as const,
      tint: COLORS.error,
      title: 'Application not approved',
      body: reason
        ? `Your application was not approved. Reason: ${reason}`
        : 'Your application was not approved. Please review your details and re-submit.',
    },
    suspended: {
      icon: 'pause-circle-outline' as const,
      tint: COLORS.error,
      title: 'Account suspended',
      body: 'Your account has been suspended. Please contact Smart Ride support for assistance.',
    },
  }[state];

  return (
    <View style={[styles.container, styles.center]}>
      <View style={[styles.iconCircle, { backgroundColor: `${config.tint}15` }]}>
        <Ionicons name={config.icon} size={44} color={config.tint} />
      </View>
      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.body}>{config.body}</Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={check} activeOpacity={0.85}>
        <Ionicons name="refresh" size={18} color={COLORS.onPrimary} />
        <Text style={styles.primaryBtnText}>Check status again</Text>
      </TouchableOpacity>

      {state === 'rejected' && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace(onboardingRoute as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Re-submit application</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => { useAuthStore.getState().logout(); router.replace('/'); }}
        activeOpacity={0.7}
      >
        <Text style={styles.linkBtnText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineMd,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  body: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodyMd,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
  },
  primaryBtnText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
  },
  secondaryBtn: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  secondaryBtnText: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
  },
  linkBtn: {
    marginTop: SPACING.lg,
    padding: SPACING.sm,
  },
  linkBtnText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodyMd,
    textDecorationLine: 'underline',
  },
});
