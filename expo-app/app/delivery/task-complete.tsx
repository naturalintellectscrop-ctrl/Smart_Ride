// ============================================
// SMART RIDE MOBILE — DELIVERY COMPLETION
// ============================================
// The courier's record of a finished delivery: what was handed over, to whom,
// how it was proven, and what it earned.
//
// Proof is READ here, never asserted. `GET /tasks/[id]/proof` returns exactly
// four things the backend records — proofType, photo URL, recipient name and
// captured-at — and this screen shows those and nothing else. Adding a field the
// server does not store (a rating of the handover, a "delivered to neighbour"
// flag) would create evidence that does not exist, which is the opposite of what
// proof of delivery is for.
//
// ProofOfDeliveryType is CODE | PHOTO | SIGNATURE | LEFT_WITH_NOTE. The last is
// deliberately framed as a claim rather than evidence, because that is what the
// schema says it is.
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, GradientButton, SuccessCheck, SectionHeader, StatusBadge } from '@/src/components';
import { JourneyBanner, translateTaskError, JourneyError } from '@/src/components/journey';
import { api } from '@/src/services';
import { SPACING, RADIUS, TYPOGRAPHY, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import type { Task } from '@/src/types';

const ugx = (n?: number | null) => `UGX ${Math.round(Number(n ?? 0)).toLocaleString()}`;

interface ProofRecord {
  proofType: string | null;
  proofPhotoUrl: string | null;
  proofRecipientName: string | null;
  proofCapturedAt: string | null;
}

/** How each proof type reads to a human, and how much it actually proves. */
const PROOF_COPY: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; note: string }> = {
  CODE: {
    label: 'Handover code',
    icon: 'keypad-outline',
    note: 'The recipient read out the code Smart Ride issued them.',
  },
  PHOTO: {
    label: 'Photo',
    icon: 'camera-outline',
    note: 'A photo was captured at the drop-off.',
  },
  SIGNATURE: {
    label: 'Signature',
    icon: 'create-outline',
    note: 'The recipient signed on your device.',
  },
  LEFT_WITH_NOTE: {
    label: 'Left with a note',
    icon: 'document-text-outline',
    // Called what it is. This one is a courier's account, not evidence.
    note: 'You recorded that nobody was available. This is your account of the handover, not proof of receipt.',
  },
};

export default function DeliveryCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const params = useLocalSearchParams<{ taskId: string }>();

  const [task, setTask] = useState<Task | null>(null);
  const [proof, setProof] = useState<ProofRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<JourneyError | null>(null);

  const load = useCallback(async () => {
    if (!params.taskId) return;
    setLoading(true);
    try {
      const [taskRes, proofRes] = await Promise.all([
        api.getTask(params.taskId),
        api.getProofOfDelivery(params.taskId),
      ]);

      if (taskRes.success && taskRes.data) {
        setTask(taskRes.data);
        setError(null);
      } else {
        setError(translateTaskError(taskRes.error, taskRes.status));
      }
      if (proofRes.success && proofRes.data) setProof(proofRes.data as ProofRecord);
    } catch {
      setError(translateTaskError('Network error'));
    } finally {
      setLoading(false);
    }
  }, [params.taskId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !task) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.mutedText}>Loading delivery…</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centered}>
        <JourneyBanner
          error={error}
          onAction={load}
          tone="error"
          title={error ? undefined : 'Delivery not found'}
          message={error ? undefined : 'This delivery could not be loaded.'}
          style={styles.stretch}
        />
        <GradientButton
          title="Back to dashboard"
          onPress={() => router.replace('/driver')}
          variant="outline"
          size="lg"
          fullWidth
        />
      </View>
    );
  }

  const isCash = task.paymentMethod === 'CASH';
  const net = Number(task.riderEarnings ?? 0);
  const commission = Number(task.platformCommission ?? 0);
  const proofType = proof?.proofType ?? task.proofType ?? null;
  const proofCopy = proofType ? PROOF_COPY[proofType] : null;
  const photoUrl = proof?.proofPhotoUrl ?? task.proofPhotoUrl ?? null;
  const recipient = proof?.proofRecipientName ?? task.proofRecipientName ?? null;

  const capturedAtRaw = proof?.proofCapturedAt ?? task.proofCapturedAt ?? null;
  const capturedAt = capturedAtRaw
    ? new Date(capturedAtRaw).toLocaleString([], {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const completedAt = task.completedAt
    ? new Date(task.completedAt).toLocaleString([], {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SuccessCheck
          size="lg"
          title="Delivered"
          subtitle={completedAt ?? undefined}
          style={styles.success}
        />

        {!!error && <JourneyBanner error={error} onAction={load} style={styles.card} />}

        {/* Proof — exactly what the backend recorded */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.lg} style={styles.card}>
          <SectionHeader title="Proof of delivery" />

          {proofCopy ? (
            <>
              <View style={styles.proofHeader}>
                <View style={styles.proofType}>
                  <Ionicons name={proofCopy.icon} size={ICON.md} color={COLORS.primary} />
                  <Text style={styles.proofLabel}>{proofCopy.label}</Text>
                </View>
                <StatusBadge
                  label="Recorded"
                  color={proofType === 'LEFT_WITH_NOTE' ? COLORS.warning : COLORS.success}
                />
              </View>

              <Text style={styles.proofNote}>{proofCopy.note}</Text>

              {!!photoUrl && (
                <Image source={{ uri: photoUrl }} style={styles.proofPhoto} resizeMode="cover" />
              )}

              {!!recipient && (
                <View style={styles.row}>
                  <Text style={styles.rowLabelMuted}>Received by</Text>
                  <Text style={styles.rowValueMuted}>{recipient}</Text>
                </View>
              )}

              {!!capturedAt && (
                <View style={styles.row}>
                  <Text style={styles.rowLabelMuted}>Captured</Text>
                  <Text style={styles.rowValueMuted}>{capturedAt}</Text>
                </View>
              )}
            </>
          ) : (
            // A delivery cannot normally reach here without proof — the server
            // gates DELIVERED on it. If it did, an admin override is the likely
            // reason, and saying so beats showing an empty card.
            <View style={styles.noteRow}>
              <Ionicons name="alert-circle-outline" size={ICON.md} color={COLORS.warning} />
              <Text style={styles.noteText}>
                No proof is recorded against this delivery. It was most likely closed by Smart Ride
                support.
              </Text>
            </View>
          )}
        </Card>

        {/* Earnings */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.lg} style={styles.card}>
          <SectionHeader title="Earnings" />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Delivery fare</Text>
            <Text style={styles.rowValue}>{ugx(task.totalAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Platform commission</Text>
            <Text style={[styles.rowValue, { color: COLORS.error }]}>-{ugx(commission)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.netLabel}>You earned</Text>
            <Text style={styles.netValue}>{ugx(net)}</Text>
          </View>
          <View style={styles.noteRow}>
            <Ionicons
              name={isCash ? 'cash-outline' : 'wallet-outline'}
              size={ICON.sm}
              color={COLORS.onSurfaceVariant}
            />
            <Text style={styles.noteText}>
              {isCash
                ? `You hold the fare in cash; ${ugx(commission)} commission is owed to Smart Ride.`
                : 'Added to your earnings.'}
            </Text>
          </View>
        </Card>

        {/* Reference */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.lg} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabelMuted}>Reference</Text>
            <Text style={styles.rowValueMuted}>{task.taskNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabelMuted}>Delivered to</Text>
            <Text style={styles.rowValueMuted} numberOfLines={2}>
              {task.dropoffAddress}
            </Text>
          </View>
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <GradientButton
          title="Full settlement"
          onPress={() => router.replace(`/driver/task-settlement?taskId=${task.id}` as any)}
          variant="outline"
          size="lg"
          fullWidth
          style={styles.footerButton}
          icon={<Ionicons name="receipt-outline" size={ICON.md} color={COLORS.primary} />}
        />
        <GradientButton
          title="Done"
          onPress={() => router.replace('/driver')}
          variant="primary"
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: COLORS.surface,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.md,
      padding: SPACING.lg,
      backgroundColor: COLORS.surface,
    },
    stretch: {
      alignSelf: 'stretch',
    },
    mutedText: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
    },
    content: {
      padding: SPACING.md,
      paddingBottom: SPACING.xxl,
    },
    success: {
      marginBottom: SPACING.lg,
    },
    card: {
      marginBottom: SPACING.md,
    },
    proofHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
      paddingVertical: SPACING.sm,
    },
    proofType: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      flex: 1,
    },
    proofLabel: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
      fontWeight: '700',
    },
    proofNote: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
      marginBottom: SPACING.sm,
    },
    proofPhoto: {
      width: '100%',
      height: 180,
      borderRadius: RADIUS.lg,
      backgroundColor: COLORS.surfaceContainerLow,
      marginBottom: SPACING.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    rowLabel: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurface,
    },
    rowValue: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
      fontWeight: '700',
    },
    rowLabelMuted: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
      flexShrink: 0,
    },
    rowValueMuted: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
      flexShrink: 1,
      textAlign: 'right',
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.outlineVariant,
      marginVertical: SPACING.sm,
    },
    netLabel: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
      fontWeight: '700',
    },
    netValue: {
      ...TYPOGRAPHY.headlineMd,
      color: COLORS.primary,
      fontWeight: '700',
    },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.sm,
      paddingTop: SPACING.sm,
    },
    noteText: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
      flex: 1,
    },
    footer: {
      padding: SPACING.md,
      gap: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.outlineVariant,
      backgroundColor: COLORS.surface,
    },
    footerButton: {
      marginBottom: 0,
    },
  });
