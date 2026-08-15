// ============================================
// SMART RIDE — DRIVER REPUTATION
// ============================================
// Archetype AR-5 (Detail + sections). The driver-facing view of the Driver
// Reputation engine.
//
//   AppHeader → trust score + tier → progress to next tier → the metrics that
//   move the score → streak → tier privileges → live incentive progress →
//   performance alerts
//
// ROLE BOUNDARY: this screen shows only what a driver can act on. It never
// renders fraud-risk internals — /api/rider/reputation does not return them.
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '@/src/services';
import { AppHeader, Card, EmptyState, ErrorState } from '@/src/components';
import { SPACING, RADIUS, TYPOGRAPHY, BORDER } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import type { RiderReputation, TrustTier } from '@/src/types';

/** A campaign the driver has not joined yet, as the marketplace API returns it. */
interface OpenIncentive {
  id: string;
  name: string;
  description?: string;
  rewardAmount: number | string;
  minRides?: number | null;
  endTime?: string | null;
}

// Tier presentation. Kept local to the screen — these are display concerns,
// not platform rules; the thresholds themselves live server-side.
const TIER_META: Record<TrustTier, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PLATINUM: { label: 'Platinum', color: '#9CA3AF', icon: 'diamond' },
  GOLD: { label: 'Gold', color: '#F59E0B', icon: 'trophy' },
  SILVER: { label: 'Silver', color: '#94A3B8', icon: 'medal' },
  WARNING: { label: 'Needs Attention', color: '#F97316', icon: 'warning' },
  SUSPENDED: { label: 'Suspended', color: '#EF4444', icon: 'close-circle' },
};

export default function DriverReputationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const COLORS = React.useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  const [data, setData] = useState<RiderReputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Campaigns this driver could join but has not.
   *
   * The incentive system was complete except for this one link. The backend
   * enrols drivers, tracks progress on every completed task, calculates the
   * reward and credits the wallet on a schedule — and `api.getIncentives` /
   * `api.joinIncentive` existed with NO caller anywhere in the app. So a
   * driver could watch progress on campaigns they had no way to enter, and in
   * practice nobody was ever enrolled.
   */
  const [openIncentives, setOpenIncentives] = useState<OpenIncentive[]>([]);
  const [joining, setJoining] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.getMyReputation();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Could not load your reputation.');
      }

      // Campaigns already joined show under "Active bonuses" below; this list
      // is what is still open to them.
      const enrolledIds = new Set((res.data?.incentives ?? []).map(i => i.id));
      const camp = await api.getAvailableIncentives();
      const all = (camp?.data?.incentives ?? camp?.data ?? []) as OpenIncentive[];
      setOpenIncentives(
        Array.isArray(all) ? all.filter(i => i?.id && !enrolledIds.has(i.id)) : []
      );
    } catch {
      setError('Could not load your reputation.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const join = useCallback(async (incentiveId: string) => {
    setJoining(incentiveId);
    try {
      const res = await api.joinIncentive(incentiveId);
      if (res?.success) {
        // Re-read rather than patch locally: enrolment moves the campaign from
        // "open" to "active bonus", and the server owns which is which.
        await load();
      } else {
        setError(res?.error || 'Could not join that bonus. Try again.');
      }
    } catch {
      setError('Could not join that bonus. Try again.');
    } finally {
      setJoining(null);
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="My Reputation" onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <AppHeader title="My Reputation" onBack={() => router.back()} />
        <ErrorState subtitle={error} onRetry={load} />
      </View>
    );
  }

  /**
   * No completed work yet — an empty state, not an error.
   *
   * This used to `return` the empty state for the WHOLE screen, which put the
   * campaigns below it out of reach. A driver with no trips is precisely the
   * one a first-rides bonus is aimed at, so the one person who most needed to
   * join a campaign was the one person who could not see it — the same
   * unreachability the Join button was added to fix, one level up.
   *
   * The empty state now covers only the reputation half; open campaigns still
   * render underneath it.
   */
  const hasReputation = !!data?.hasReputation;

  // `data` is no longer guaranteed past this point — the screen now renders
  // with an empty reputation so the campaigns below stay reachable.
  const tier = (data?.trustTier ?? 'SILVER') as TrustTier;
  const meta = TIER_META[tier];
  const score = data?.trustScore ?? 0;
  const m = data?.metrics;

  return (
    <View style={styles.container}>
      <AppHeader title="My Reputation" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + SPACING.xl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Nothing to score yet. Shown in place of the reputation cards, not
            in place of the screen — the campaigns below still render. */}
        {!hasReputation && (
          <EmptyState
            icon="star-outline"
            title="No reputation yet"
            subtitle={data?.message || 'Complete your first trips to start building your reputation.'}
          />
        )}

        {/* Everything that describes an existing reputation. Wrapped in a
            fragment because several sibling sections share the condition. */}
        {hasReputation && (
        <>
        {/* Trust score + tier */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card style={styles.scoreCard}>
            <View style={[styles.tierBadge, { backgroundColor: `${meta.color}22`, borderColor: meta.color }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
              <Text style={[styles.tierText, { color: meta.color }]}>{meta.label}</Text>
            </View>

            <Text style={styles.scoreValue}>{score.toFixed(1)}</Text>
            <Text style={styles.scoreLabel}>Trust Score</Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(0, Math.min(100, score))}%`, backgroundColor: meta.color },
                ]}
              />
            </View>

            {data?.nextTier && data?.pointsToNextTier != null ? (
              <Text style={styles.nextTier}>
                {data?.pointsToNextTier} points to {TIER_META[data?.nextTier as TrustTier]?.label ?? data?.nextTier}
              </Text>
            ) : (
              <Text style={styles.nextTier}>You are at the highest tier</Text>
            )}
          </Card>
        </Animated.View>

        {/* Suspension notice — the most consequential thing on this screen */}
        {data?.accountHealth?.isSuspended && (
          <Animated.View entering={FadeInDown.delay(50).duration(300)}>
            <Card style={[styles.card, styles.suspendedCard]}>
              <View style={styles.rowStart}>
                <Ionicons name="alert-circle" size={22} color={COLORS.error} />
                <View style={styles.flex1}>
                  <Text style={styles.suspendedTitle}>Account suspended</Text>
                  <Text style={styles.suspendedBody}>
                    {data?.accountHealth.suspensionReason || 'Your account is under review.'}
                    {data?.accountHealth.suspensionEndsAt
                      ? ` Ends ${new Date(data?.accountHealth.suspensionEndsAt).toLocaleDateString()}.`
                      : ''}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Metrics that move the score */}
        {m && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <Text style={styles.sectionTitle}>What moves your score</Text>
            <Card style={styles.card}>
              <MetricRow label="Average rating" value={`${m.averageRating.toFixed(2)} ★`} sub={`${m.totalRatings} ratings`} styles={styles} />
              <MetricRow label="Completion rate" value={`${m.completionRate}%`} styles={styles} />
              <MetricRow label="Acceptance rate" value={`${m.acceptanceRate}%`} styles={styles} />
              <MetricRow label="On-time arrivals" value={`${m.onTimeRate}%`} styles={styles} />
              <MetricRow label="Cancellation rate" value={`${m.cancellationRate}%`} styles={styles} />
              <MetricRow label="Safety score" value={`${m.safetyScore.toFixed(0)}/100`} styles={styles} />
              <MetricRow label="Trips completed" value={`${m.tripsCompleted}`} styles={styles} />
              <MetricRow label="Compliments" value={`${m.compliments}`} sub={`${m.complaints} complaints`} styles={styles} last />
            </Card>
          </Animated.View>
        )}

        {/* Streak */}
        {data.streak && (
          <Animated.View entering={FadeInDown.delay(150).duration(300)}>
            <Card style={styles.card}>
              <View style={styles.streakRow}>
                <Ionicons name="flame" size={22} color="#F97316" />
                <Text style={styles.streakValue}>{data.streak.current}</Text>
                <Text style={styles.streakLabel}>ride streak</Text>
                <Text style={styles.streakBest}>best {data.streak.longest}</Text>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Tier privileges — what the score actually buys */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <Text style={styles.sectionTitle}>Your benefits</Text>
          <Card style={styles.card}>
            <PrivilegeRow
              enabled={data.privileges.priorityDispatch}
              label="Priority dispatch"
              hint="You are offered trips ahead of lower-rated drivers"
              styles={styles}
              COLORS={COLORS}
            />
            <PrivilegeRow
              enabled={data.privileges.bonusEligible}
              label="Bonus eligible"
              hint="You can earn incentive and streak bonuses"
              styles={styles}
              COLORS={COLORS}
            />
            <PrivilegeRow
              enabled={data.privileges.premiumAccess}
              label="Premium trips"
              hint="Access to higher-value premium requests"
              styles={styles}
              COLORS={COLORS}
              last
            />
          </Card>
        </Animated.View>
        </>
        )}

        {/* Campaigns open to join. Without this the driver can only ever
            watch bonuses they had no way to enter. */}
        {openIncentives.length > 0 && (
          <Animated.View entering={FadeInDown.delay(225).duration(300)}>
            <Text style={styles.sectionTitle}>Bonuses you can join</Text>
            {openIncentives.map((inc) => (
              <Card key={inc.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.incentiveName}>{inc.name}</Text>
                  <Text style={styles.incentiveReward}>
                    UGX {Number(inc.rewardAmount).toLocaleString()}
                  </Text>
                </View>
                {inc.description ? (
                  <Text style={styles.incentiveProgress}>{inc.description}</Text>
                ) : null}
                {inc.minRides ? (
                  <Text style={styles.incentiveProgress}>
                    {inc.minRides} rides to qualify
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => join(inc.id)}
                  disabled={joining === inc.id}
                  style={({ pressed }) => [
                    styles.joinButton,
                    { opacity: pressed || joining === inc.id ? 0.6 : 1 },
                  ]}
                >
                  {joining === inc.id ? (
                    <ActivityIndicator size="small" color={COLORS.onPrimary} />
                  ) : (
                    <Text style={styles.joinButtonText}>Join this bonus</Text>
                  )}
                </Pressable>
              </Card>
            ))}
          </Animated.View>
        )}

        {/* Live incentive progress */}
        {data?.incentives && data?.incentives.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(300)}>
            <Text style={styles.sectionTitle}>Active bonuses</Text>
            {data?.incentives.map((inc) => {
              const pct = Math.max(0, Math.min(100, inc.progressPercent));
              return (
                <Card key={inc.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.incentiveName}>{inc.name}</Text>
                    <Text style={styles.incentiveReward}>
                      UGX {Number(inc.rewardAmount).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.progressTrackSm}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: COLORS.primary }]} />
                  </View>
                  <Text style={styles.incentiveProgress}>
                    {inc.ridesRequired
                      ? `${inc.ridesCompleted} of ${inc.ridesRequired} rides`
                      : `${inc.ridesCompleted} rides`}
                    {'  ·  '}
                    {pct.toFixed(0)}%
                  </Text>
                </Card>
              );
            })}
          </Animated.View>
        )}

        {/* Performance alerts */}
        {data?.alerts && data?.alerts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <Text style={styles.sectionTitle}>Updates</Text>
            {data?.alerts.map((a) => (
              <Card key={a.id} style={styles.card}>
                <Text style={styles.alertTitle}>{a.title}</Text>
                <Text style={styles.alertBody}>{a.message}</Text>
                {a.suggestedAction ? (
                  <Text style={styles.alertAction}>{a.suggestedAction}</Text>
                ) : null}
              </Card>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function MetricRow({
  label,
  value,
  sub,
  styles,
  last,
}: {
  label: string;
  value: string;
  sub?: string;
  styles: ReturnType<typeof createStyles>;
  last?: boolean;
}) {
  return (
    <View style={[styles.metricRow, last && styles.noBorder]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricRight}>
        <Text style={styles.metricValue}>{value}</Text>
        {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function PrivilegeRow({
  enabled,
  label,
  hint,
  styles,
  COLORS,
  last,
}: {
  enabled: boolean;
  label: string;
  hint: string;
  styles: ReturnType<typeof createStyles>;
  COLORS: ThemedColors;
  last?: boolean;
}) {
  return (
    <View style={[styles.metricRow, last && styles.noBorder]}>
      <Ionicons
        name={enabled ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={enabled ? COLORS.success : COLORS.outlineVariant}
      />
      <View style={styles.privilegeText}>
        <Text style={[styles.metricLabel, !enabled && styles.dimmed]}>{label}</Text>
        <Text style={styles.metricSub}>{hint}</Text>
      </View>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
    flex1: { flex: 1 },
    noBorder: { borderBottomWidth: 0 },
    dimmed: { color: COLORS.outline },

    scoreCard: { alignItems: 'center', paddingVertical: SPACING.lg },
    tierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      borderWidth: BORDER.hairline,
      marginBottom: SPACING.md,
    },
    tierText: { ...TYPOGRAPHY.labelLg },
    scoreValue: { ...TYPOGRAPHY.displayLg, color: COLORS.onSurface },
    scoreLabel: { ...TYPOGRAPHY.bodySm, color: COLORS.outline, marginBottom: SPACING.md },
    progressTrack: {
      width: '100%',
      height: 8,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceContainerHigh,
      overflow: 'hidden',
    },
    progressTrackSm: {
      width: '100%',
      height: 6,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceContainerHigh,
      overflow: 'hidden',
      marginTop: SPACING.sm,
    },
    progressFill: { height: '100%', borderRadius: RADIUS.full },
    nextTier: { ...TYPOGRAPHY.bodySm, color: COLORS.outline, marginTop: SPACING.sm },

    sectionTitle: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurfaceVariant,
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    card: { marginBottom: SPACING.sm },

    suspendedCard: { borderColor: COLORS.error, borderWidth: BORDER.hairline },
    suspendedTitle: { ...TYPOGRAPHY.labelLg, color: COLORS.error },
    suspendedBody: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant, marginTop: 2 },

    rowStart: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    metricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACING.sm,
      borderBottomWidth: BORDER.hairline,
      borderBottomColor: COLORS.outlineVariant,
      gap: SPACING.sm,
    },
    metricLabel: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurface },
    metricRight: { alignItems: 'flex-end' },
    metricValue: { ...TYPOGRAPHY.labelLg, color: COLORS.onSurface },
    metricSub: { ...TYPOGRAPHY.labelMd, color: COLORS.outline },
    privilegeText: { flex: 1 },

    streakRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    streakValue: { ...TYPOGRAPHY.headlineMd, color: COLORS.onSurface },
    streakLabel: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurfaceVariant, flex: 1 },
    streakBest: { ...TYPOGRAPHY.labelMd, color: COLORS.outline },

    incentiveName: { ...TYPOGRAPHY.labelLg, color: COLORS.onSurface, flex: 1 },
    incentiveReward: { ...TYPOGRAPHY.labelLg, color: COLORS.primary },
    incentiveProgress: { ...TYPOGRAPHY.labelMd, color: COLORS.outline, marginTop: SPACING.xs },
    joinButton: {
      marginTop: SPACING.sm,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    joinButtonText: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onPrimary,
      fontWeight: '700',
    },

    alertTitle: { ...TYPOGRAPHY.labelLg, color: COLORS.onSurface },
    alertBody: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant, marginTop: 2 },
    alertAction: { ...TYPOGRAPHY.labelMd, color: COLORS.primary, marginTop: SPACING.xs },
  });
