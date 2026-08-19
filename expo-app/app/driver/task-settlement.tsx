// ============================================
// SMART RIDE MOBILE — PROVIDER SETTLEMENT
// ============================================
// What the provider earned on a job that just finished, and what happens to it.
//
// Every figure here is READ from the server, never computed. `platformCommission`
// and `riderEarnings` are written onto the task by the pricing engine and the
// waiting-charge settlement hook; recomputing them on the phone would produce a
// second, quietly different answer to "what am I owed".
//
// The screen is careful about three distinctions the backend genuinely makes:
//
//   1. CASH settles at the handover. The provider already holds the fare and now
//      OWES the platform its commission, recorded as a COD_PAYMENT receivable.
//      Nothing is credited, so "added to your balance" would be false.
//   2. Lifetime earnings (rider.totalEarnings) ARE moved by the completion
//      ledger. The withdrawable Wallet balance is a separate store the
//      task-completion path does not touch, so the two are shown apart rather
//      than implied to be one number.
//   3. An incentive has three states — progressing, qualified, paid — and they
//      are never collapsed. Money is described as received only once the reward
//      itself says PAID.
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, GradientButton, SuccessCheck, SectionHeader, StatusBadge } from '@/src/components';
import { JourneyBanner, translateTaskError, isRideType, JourneyError } from '@/src/components/journey';
import { api } from '@/src/services';
import { SPACING, RADIUS, TYPOGRAPHY, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import type { Task } from '@/src/types';

const ugx = (n?: number | null) => `UGX ${Math.round(Number(n ?? 0)).toLocaleString()}`;

/** An incentive the provider has joined, as the marketplace API reports it. */
interface IncentiveProgress {
  id: string;
  title?: string;
  name?: string;
  targetValue?: number;
  currentProgress?: number;
  status?: string;
  rewardAmount?: number;
  rewardStatus?: string;
}

export default function TaskSettlementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const params = useLocalSearchParams<{ taskId: string }>();

  const [task, setTask] = useState<Task | null>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [incentives, setIncentives] = useState<IncentiveProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<JourneyError | null>(null);

  const load = useCallback(async () => {
    if (!params.taskId) return;
    setLoading(true);
    try {
      const [taskRes, earnRes, incRes] = await Promise.all([
        api.getTask(params.taskId),
        api.getRiderEarnings('today'),
        api.getAvailableIncentives(),
      ]);

      if (taskRes.success && taskRes.data) {
        setTask(taskRes.data);
        setError(null);
      } else {
        setError(translateTaskError(taskRes.error, taskRes.status));
      }

      // Earnings and incentives are context, not the point of the screen. If
      // either fails, the settlement figures still stand on the task itself.
      if (earnRes.success) setEarnings(earnRes.data);
      if (incRes.success) {
        const list = (incRes.data as any)?.incentives ?? (incRes.data as any)?.data ?? incRes.data;
        setIncentives(Array.isArray(list) ? list : []);
      }
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
        <Text style={styles.mutedText}>Working out your earnings…</Text>
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
          title={error ? undefined : 'Job not found'}
          message={error ? undefined : 'This job could not be loaded.'}
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

  const ride = isRideType(task.taskType);
  const isCash = task.paymentMethod === 'CASH';

  const gross = Number(task.totalAmount ?? 0);
  const commission = Number(task.platformCommission ?? 0);
  const net = Number(task.riderEarnings ?? 0);
  const waiting = Number(task.waitingCharge ?? 0);

  // Finishing a job and being paid for it are separate events. On a gateway
  // method the customer may not have paid even though the trip is over, and the
  // provider is entitled to know which of the two has happened.
  const paymentSettled = task.paymentStatus === 'COMPLETED';

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
          title={ride ? 'Trip completed' : 'Delivery completed'}
          subtitle={completedAt ?? undefined}
          style={styles.success}
        />

        {!!error && <JourneyBanner error={error} onAction={load} style={styles.card} />}

        {/* What you earned */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.card}>
          <SectionHeader title="Your earnings" />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Gross fare</Text>
            <Text style={styles.rowValue}>{ugx(gross)}</Text>
          </View>

          {waiting > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabelMuted}>
                Includes waiting{task.waitingMinutes ? ` (${task.waitingMinutes} min)` : ''}
              </Text>
              <Text style={styles.rowValueMuted}>{ugx(waiting)}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Platform commission</Text>
            <Text style={[styles.rowValue, styles.negative]}>-{ugx(commission)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.netLabel}>You earned</Text>
            <Text style={styles.netValue}>{ugx(net)}</Text>
          </View>
        </Card>

        {/* How it settles */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.card}>
          <SectionHeader title="Settlement" />

          {isCash ? (
            <>
              <View style={styles.noteRow}>
                <Ionicons name="cash-outline" size={ICON.md} color={COLORS.primary} />
                <Text style={styles.noteText}>
                  You collected {ugx(gross)} in cash and keep {ugx(net)}.
                </Text>
              </View>
              <View style={styles.noteRow}>
                <Ionicons name="alert-circle-outline" size={ICON.md} color={COLORS.warning} />
                <Text style={styles.noteText}>
                  {ugx(commission)} commission is owed to Smart Ride and clears on your next
                  deposit. Nothing was added to your balance for this job.
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.noteRow}>
                <Ionicons name="wallet-outline" size={ICON.md} color={COLORS.primary} />
                <Text style={styles.noteText}>
                  {ugx(net)} was added to your earnings for this job.
                </Text>
              </View>
              <View style={styles.noteRow}>
                <Ionicons
                  name={paymentSettled ? 'checkmark-circle-outline' : 'time-outline'}
                  size={ICON.md}
                  color={paymentSettled ? COLORS.success : COLORS.warning}
                />
                <Text style={styles.noteText}>
                  {paymentSettled
                    ? `The customer has paid by ${task.paymentMethod}.`
                    : `The customer has not settled their ${task.paymentMethod} payment yet. Your earnings are recorded either way.`}
                </Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Lifetime earnings</Text>
            <Text style={styles.rowValue}>{ugx(earnings?.rider?.totalEarnings)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Withdrawable balance</Text>
            <Text style={styles.rowValue}>{ugx(earnings?.wallet?.balance)}</Text>
          </View>
        </Card>

        {/* Incentives */}
        {incentives.length > 0 && (
          <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.card}>
            <SectionHeader title="Bonus progress" />
            {incentives.slice(0, 3).map((inc) => (
              <IncentiveRow key={inc.id} incentive={inc} styles={styles} COLORS={COLORS} />
            ))}
          </Card>
        )}

        {/* Reference */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabelMuted}>Job reference</Text>
            <Text style={styles.rowValueMuted}>{task.taskNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabelMuted}>Route</Text>
            <Text style={styles.rowValueMuted} numberOfLines={1}>
              {task.pickupAddress} to {task.dropoffAddress}
            </Text>
          </View>
          {task.distanceKm != null && (
            <View style={styles.row}>
              <Text style={styles.rowLabelMuted}>Distance</Text>
              <Text style={styles.rowValueMuted}>{Number(task.distanceKm).toFixed(1)} km</Text>
            </View>
          )}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <GradientButton
          title="View earnings"
          onPress={() => router.push('/rider/earnings' as any)}
          variant="outline"
          size="lg"
          fullWidth
          style={styles.footerButton}
          icon={<Ionicons name="stats-chart-outline" size={ICON.md} color={COLORS.primary} />}
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

/**
 * One incentive, rendered as the state it is actually in.
 *
 * Progressing, qualified and paid are three different facts. Collapsing them
 * into one "you earned a bonus" line would tell a provider money had arrived
 * before the ledger says it has.
 */
function IncentiveRow({
  incentive,
  styles,
  COLORS,
}: {
  incentive: IncentiveProgress;
  styles: ReturnType<typeof createStyles>;
  COLORS: ThemedColors;
}) {
  const label = incentive.title ?? incentive.name ?? 'Bonus';
  const target = Number(incentive.targetValue ?? 0);
  const current = Number(incentive.currentProgress ?? 0);
  const reward = Number(incentive.rewardAmount ?? 0);

  const paid = incentive.rewardStatus === 'PAID';
  const qualified = !paid && (incentive.status === 'QUALIFIED' || incentive.status === 'COMPLETED');

  const pct = target > 0 ? Math.min(1, current / target) : 0;

  return (
    <View style={styles.incentiveRow}>
      <View style={styles.incentiveHeader}>
        <Text style={styles.incentiveTitle} numberOfLines={1}>
          {label}
        </Text>
        {paid ? (
          <StatusBadge label="Credited" color={COLORS.success} />
        ) : qualified ? (
          <StatusBadge label="Qualified" color={COLORS.info} />
        ) : (
          <StatusBadge label={`${current} / ${target}`} color={COLORS.onSurfaceVariant} />
        )}
      </View>

      {!paid && !qualified && target > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
        </View>
      )}

      <Text style={styles.incentiveNote}>
        {paid
          ? `${ugx(reward)} has been credited.`
          : qualified
            ? `You have qualified. ${ugx(reward)} will be credited once it is paid out.`
            : `${Math.max(0, target - current)} more to qualify for ${ugx(reward)}.`}
      </Text>
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
    negative: {
      color: COLORS.error,
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
      paddingVertical: SPACING.sm,
    },
    noteText: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurface,
      flex: 1,
    },
    incentiveRow: {
      gap: SPACING.sm,
      paddingVertical: SPACING.sm,
    },
    incentiveHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    incentiveTitle: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
      fontWeight: '600',
      flex: 1,
    },
    progressTrack: {
      height: 6,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceContainerLow,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
    },
    incentiveNote: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
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
