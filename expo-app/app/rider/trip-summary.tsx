// ============================================
// SMART RIDE MOBILE - TRIP SUMMARY SCREEN
// ============================================
// Shown after a ride reaches COMPLETED: completion confirmation, route summary,
// the real payment state (and the way to settle it), rating, and the receipt.
//
// It fetches the task rather than trusting the params it was navigated with.
// The params are a snapshot taken the instant the trip ended; payment state
// changes AFTER that moment, and this screen's job is to tell the truth about
// it. Completing a trip does not pay for it — see TaskPaymentPanel.
// ============================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  Card,
  GradientButton,
  SectionHeader,
  SuccessCheck,
} from '@/src/components';
import { TaskPaymentPanel } from '@/src/components/journey';
import type { Task } from '@/src/types';

export default function TripSummaryScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    taskId: string;
    totalAmount: string;
    paymentMethod: string;
    pickupAddress: string;
    dropoffAddress: string;
    distanceKm: string;
    durationMin: string;
    waitingCharge: string;
    waitingMinutes: string;
    driverName: string;
  }>();

  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState<string | null>(null);
  // Optional detail. The rate endpoint has always accepted these three from a
  // client and stores them for the reputation engine; nothing ever sent them.
  const [subScores, setSubScores] = useState<{
    punctualityScore?: number;
    professionalismScore?: number;
    vehicleConditionScore?: number;
  }>({});

  const totalAmount  = parseInt(params.totalAmount  || '0', 10);
  const distanceKm   = parseFloat(params.distanceKm  || '0');
  const durationMin  = parseInt(params.durationMin   || '0', 10);
  const waitingCharge  = parseInt(params.waitingCharge  || '0', 10);
  const waitingMinutes = parseInt(params.waitingMinutes || '0', 10);
  const paymentMethod = params.paymentMethod || 'CASH';

  // The live task. Payment state moves after the trip ends, so the params
  // this screen was navigated with cannot be trusted to describe it.
  const [task, setTask] = useState<Task | null>(null);

  const loadTask = useCallback(async () => {
    if (!params.taskId) return;
    const res = await api.getTask(params.taskId);
    if (res.success && res.data) setTask(res.data);
  }, [params.taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleRating = (stars: number) => {
    if (ratingSubmitted) return;
    setSelectedRating(stars);
  };

  const submitRating = async () => {
    if (ratingSubmitted || !selectedRating || !params.taskId) return;
    setIsSubmitting(true);
    setRatingError(null);
    try {
      const res = await api.rateTask(
        params.taskId,
        selectedRating,
        comment.trim() || undefined,
        Object.keys(subScores).length > 0 ? subScores : undefined
      );
      if (res?.success === false) throw new Error(res.error || 'Could not submit');
      setRatingSubmitted(true);
    } catch {
      // A failure used to be swallowed entirely, so a rider who rated a bad
      // trip believed it was recorded when nothing had been sent.
      setRatingError('Could not submit your rating. Tap to try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* The one success mark, shared with top-up, withdrawal and payment. */}
        <SuccessCheck
          size="lg"
          title="Ride completed"
          subtitle={params.driverName ? `Thanks for riding with ${params.driverName}` : undefined}
          style={styles.success}
        />

        {/* Fare and payment.
            Payment STATE comes from the task, not from the fact that the trip
            finished. Until the task loads we show the fare only — never a
            payment status we have not actually read. */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.card}>
          {task ? (
            <TaskPaymentPanel task={task} onSettled={loadTask} />
          ) : (
            <>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Total fare</Text>
                <Text style={styles.fareAmount}>UGX {totalAmount.toLocaleString()}</Text>
              </View>
              {waitingCharge > 0 && (
                <View style={styles.waitingRow}>
                  <View style={styles.waitingLabelWrap}>
                    <Ionicons name="time-outline" size={ICON.xs} color={COLORS.onSurfaceVariant} />
                    <Text style={styles.waitingLabel}>
                      Includes waiting{waitingMinutes > 0 ? ` (${waitingMinutes} min)` : ''}
                    </Text>
                  </View>
                  <Text style={styles.waitingValue}>UGX {waitingCharge.toLocaleString()}</Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.metaRow}>
                <Ionicons name="hourglass-outline" size={ICON.sm} color={COLORS.onSurfaceVariant} />
                <Text style={styles.metaText}>Checking payment status…</Text>
              </View>
            </>
          )}
        </Card>

        {/* Trip details */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.card}>
          {params.pickupAddress ? (
            <View style={styles.routeRow}>
              <View style={styles.routeDots}>
                <View style={[styles.dot, { backgroundColor: COLORS.secondaryFixed }]} />
                <View style={styles.dotLine} />
                <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
              </View>
              <View style={styles.routeAddresses}>
                <View style={styles.addressBlock}>
                  <Text style={styles.addressLabel}>From</Text>
                  <Text style={styles.addressText} numberOfLines={2}>{params.pickupAddress}</Text>
                </View>
                <View style={styles.addressBlock}>
                  <Text style={styles.addressLabel}>To</Text>
                  <Text style={styles.addressText} numberOfLines={2}>{params.dropoffAddress}</Text>
                </View>
              </View>
            </View>
          ) : null}
          {(distanceKm > 0 || durationMin > 0) && (
            <>
              <View style={styles.divider} />
              <View style={styles.statsRow}>
                {distanceKm > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons name="navigate-outline" size={ICON.md} color={COLORS.primary} />
                    <Text style={styles.statValue}>{distanceKm.toFixed(1)} km</Text>
                    <Text style={styles.statLabel}>Distance</Text>
                  </View>
                )}
                {durationMin > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={ICON.md} color={COLORS.primary} />
                    <Text style={styles.statValue}>{durationMin} min</Text>
                    <Text style={styles.statLabel}>Duration</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </Card>

        {/* Rating.
            This is a rating *input*, not the read-only `Rating` display — the
            stars are the control, so they stay here rather than becoming a
            component that renders a fixed score. */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.card}>
          <SectionHeader title="Rate your trip" />
          <Text style={styles.ratingSubtitle}>How was your ride?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRating(star)}
                disabled={ratingSubmitted || isSubmitting}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                accessibilityState={{ selected: star <= selectedRating, disabled: ratingSubmitted || isSubmitting }}
              >
                <Ionicons
                  name={star <= selectedRating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= selectedRating ? COLORS.warning : COLORS.outlineVariant}
                />
              </TouchableOpacity>
            ))}
          </View>
          {/* Comment is optional and only worth asking for once a score is
              chosen — an empty box above an unrated trip is just noise. */}
          {selectedRating > 0 && !ratingSubmitted && (
            <>
              {/* Optional detail, in the three dimensions the reputation
                  engine actually scores on. */}
              <View style={styles.subScoreBlock}>
                {([
                  ['punctualityScore', 'Punctuality'],
                  ['professionalismScore', 'Professionalism'],
                  ['vehicleConditionScore', 'Vehicle'],
                ] as const).map(([key, label]) => (
                  <View key={key} style={styles.subScoreRow}>
                    <Text style={styles.subScoreLabel}>{label}</Text>
                    <View style={styles.subScoreStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => setSubScores((prev) => ({ ...prev, [key]: star }))}
                          disabled={isSubmitting}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                          accessibilityRole="button"
                          accessibilityLabel={`${label}: ${star} star${star > 1 ? 's' : ''}`}
                        >
                          <Ionicons
                            name={star <= (subScores[key] ?? 0) ? 'star' : 'star-outline'}
                            size={ICON.md}
                            color={star <= (subScores[key] ?? 0) ? COLORS.warning : COLORS.outlineVariant}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder={selectedRating <= 3 ? 'What went wrong? (optional)' : 'Add a comment (optional)'}
                placeholderTextColor={COLORS.onSurfaceVariant}
                multiline
                maxLength={500}
                editable={!isSubmitting}
                accessibilityLabel="Rating comment"
              />
              <GradientButton
                title="Submit rating"
                onPress={submitRating}
                variant="primary"
                size="md"
                fullWidth
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.ratingSubmit}
              />
            </>
          )}
          {ratingError && (
            <Text style={styles.ratingError} onPress={submitRating}>{ratingError}</Text>
          )}
          {ratingSubmitted && <Text style={styles.ratingThanks}>Thanks for your feedback!</Text>}
        </Card>

      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        {params.taskId ? (
          <GradientButton
            title="View Receipt"
            onPress={() => router.push(`/receipt/${params.taskId}?taskId=${params.taskId}` as any)}
            variant="outline"
            size="lg"
            fullWidth
            style={styles.footerButton}
            icon={<Ionicons name="receipt-outline" size={ICON.md} color={COLORS.primary} />}
          />
        ) : null}
        <GradientButton title="Done" onPress={handleDone} variant="primary" size="lg" fullWidth />
      </View>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  success: {
    marginBottom: SPACING.lg,
  },
  commentInput: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    marginTop: SPACING.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  subScoreBlock: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  subScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  subScoreLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  subScoreStars: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  ratingSubmit: {
    marginTop: SPACING.md,
  },
  ratingError: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  footerButton: {
    marginBottom: SPACING.sm,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  card: {
    // Surface, radius, padding and elevation come from Card; only the rhythm
    // between cards belongs to the screen.
    width: '100%',
    marginBottom: SPACING.md,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareLabel: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
  },
  fareAmount: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.primary,
    fontWeight: '700',
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  waitingLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  waitingLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  waitingValue: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
    marginVertical: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  metaText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  routeRow: {
    flexDirection: 'row',
  },
  routeDots: {
    width: 18,
    alignItems: 'center',
    marginRight: SPACING.sm,
    paddingTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.outlineVariant,
    marginVertical: 3,
  },
  routeAddresses: {
    flex: 1,
    gap: SPACING.sm,
  },
  addressBlock: {},
  addressLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  addressText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '500',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  statLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  ratingSubtitle: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
  },
  starsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  ratingThanks: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  footer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
});
