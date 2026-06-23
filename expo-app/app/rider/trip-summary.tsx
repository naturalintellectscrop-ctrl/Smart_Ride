// ============================================
// SMART RIDE MOBILE - TRIP SUMMARY SCREEN
// ============================================
// Shown after ride COMPLETED.
// Displays fare breakdown, route info, and star rating.
// ============================================

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';

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
    driverName: string;
  }>();

  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const totalAmount  = parseInt(params.totalAmount  || '0', 10);
  const distanceKm   = parseFloat(params.distanceKm  || '0');
  const durationMin  = parseInt(params.durationMin   || '0', 10);
  const paymentMethod = params.paymentMethod || 'CASH';

  const paymentLabel: Record<string, string> = {
    CASH: 'Cash',
    MTN_MOMO: 'MTN Mobile Money',
    AIRTEL_MONEY: 'Airtel Money',
    WALLET: 'Wallet',
    NYLON_PAY: 'NylonPay',
  };

  const isCash = paymentMethod === 'CASH';

  const handleRating = async (stars: number) => {
    if (ratingSubmitted) return;
    setSelectedRating(stars);
    if (!params.taskId) return;
    setIsSubmitting(true);
    try {
      await api.rateTask(params.taskId, stars);
      setRatingSubmitted(true);
    } catch {
      // silently fail — rating is not critical
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

        {/* Success indicator */}
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={48} color={COLORS.onPrimary} />
        </View>
        <Text style={styles.heading}>Ride Completed</Text>
        {params.driverName ? (
          <Text style={styles.subheading}>Thanks for riding with {params.driverName}</Text>
        ) : null}

        {/* Fare card */}
        <View style={styles.card}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Total Fare</Text>
            <Text style={styles.fareAmount}>UGX {totalAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metaRow}>
            <Ionicons name="card-outline" size={16} color={COLORS.onSurfaceVariant} />
            <Text style={styles.metaText}>{paymentLabel[paymentMethod] ?? paymentMethod}</Text>
          </View>
          {isCash && (
            <View style={[styles.metaRow, { marginTop: 4 }]}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={[styles.metaText, { color: COLORS.primary }]}>Please pay the driver in cash</Text>
            </View>
          )}
        </View>

        {/* Trip details card */}
        <View style={styles.card}>
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
                    <Ionicons name="navigate-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.statValue}>{distanceKm.toFixed(1)} km</Text>
                    <Text style={styles.statLabel}>Distance</Text>
                  </View>
                )}
                {durationMin > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.statValue}>{durationMin} min</Text>
                    <Text style={styles.statLabel}>Duration</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Rating */}
        <View style={styles.card}>
          <Text style={styles.ratingTitle}>Rate your trip</Text>
          <Text style={styles.ratingSubtitle}>How was your ride?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRating(star)}
                disabled={ratingSubmitted || isSubmitting}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={star <= selectedRating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= selectedRating ? '#FFC107' : COLORS.outlineVariant}
                />
              </TouchableOpacity>
            ))}
          </View>
          {isSubmitting && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 8 }} />}
          {ratingSubmitted && (
            <Text style={styles.ratingThanks}>Thanks for your feedback!</Text>
          )}
        </View>

      </ScrollView>

      {/* Done button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.active,
  },
  heading: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
    fontWeight: '700',
    textAlign: 'center',
  },
  subheading: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
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
  ratingTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
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
  doneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  doneButtonText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },
});
