// ============================================
// SMART RIDE MOBILE - TRIP / DELIVERY DETAILS (historical)
// ============================================
// Opens from the History screen. Reuses GET /api/tasks/[id] — first-name
// redacted, no phone numbers (privacy is enforced server-side). Shows the
// route, distance/duration, fare breakdown, commission, net earnings, payment
// method and status. Read-only.
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { statusColor, statusLabel } from '@/src/theme/statusColors';
import {
  AppHeader,
  Card,
  DetailSkeleton,
  ErrorState,
  SectionHeader,
  StatusBadge,
} from '@/src/components';

const SERVICE_LABEL: Record<string, string> = {
  SMART_BODA_RIDE: 'Boda Ride',
  SMART_CAR_RIDE: 'Car Ride',
  FOOD_DELIVERY: 'Food Delivery',
  SHOPPING: 'Shopping',
  ITEM_DELIVERY: 'Item Delivery',
  SMART_HEALTH_DELIVERY: 'Pharmacy Delivery',
};
const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Cash', MTN_MOMO: 'MTN Mobile Money', AIRTEL_MONEY: 'Airtel Money',
  CARD: 'Card', VISA: 'Visa / Card', WALLET: 'Smart Ride Wallet', NYLON_PAY: 'Mobile Money',
};
const num = (v: unknown) => Number(v) || 0;
const money = (v: unknown) => `UGX ${Math.round(num(v)).toLocaleString()}`;
const fmtDateTime = (d?: string) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export default function TripDetailsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!taskId) { setError('Missing trip reference.'); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.getTask(taskId);
      if (res.success && res.data) setTask(res.data);
      else setError((res as any).error || 'Trip not found.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );

  const body = () => {
    if (loading) return <DetailSkeleton />;
    if (error || !task) {
      return (
        <View style={styles.stateWrap}>
          <ErrorState title="Trip not found" subtitle={error ?? undefined} onRetry={load} />
        </View>
      );
    }
    const fare = num(task.totalAmount);
    const commission = num(task.platformCommission);
    const net = task.riderEarnings != null ? num(task.riderEarnings) : Math.max(0, fare - commission);
    const duration = task.actualDuration ?? task.estimatedDuration;
    const breakdown = ([
      ['Base Fare', task.baseFare],
      ['Distance Charge', task.distanceFare],
      ['Time Charge', task.timeFare],
      ['Delivery Fee', task.deliveryFee],
      ['Waiting Charge', task.waitingCharge],
      ['Service Fee', task.serviceFee],
    ] as Array<[string, unknown]>).filter(([, v]) => num(v) > 0);

    return (
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.service}>{SERVICE_LABEL[task.taskType] || task.taskType}</Text>
            <Text style={styles.taskNumber}>{task.taskNumber}</Text>
          </View>
          <Text style={styles.date}>{fmtDateTime(task.completedAt || task.createdAt)}</Text>
          {/* The pill was hardcoded to the brand green regardless of status, so
              a cancelled trip read as if it had gone fine. */}
          <StatusBadge
            label={statusLabel(task.status)}
            color={statusColor(task.status, COLORS)}
            size="sm"
            style={styles.statusBadge}
          />
        </Card>

        {/* Route */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.card}>
          <SectionHeader title="Route" />
          <View style={styles.routeRow}>
            <View style={styles.dots}>
              <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
              <View style={styles.dotLine} />
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>PICKUP</Text>
              <Text style={styles.addr}>{task.pickupAddress || '—'}</Text>
              <Text style={[styles.miniLabel, { marginTop: 10 }]}>DROPOFF</Text>
              <Text style={styles.addr}>{task.dropoffAddress || '—'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          {task.distanceKm ? <Row label="Distance" value={`${Number(task.distanceKm).toFixed(1)} km`} /> : null}
          {duration ? <Row label="Duration" value={`${duration} min`} /> : null}
        </Card>

        {/* Fare / earnings */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.card}>
          <SectionHeader title="Fare & Earnings" />
          {breakdown.map(([label, v]) => <Row key={label} label={label} value={money(v)} />)}
          <View style={styles.divider} />
          <Row label="Total Fare" value={money(fare)} strong />
          {commission > 0 ? <Row label="Platform Commission" value={`- ${money(commission)}`} /> : null}
          <Row label="Your Net Earnings" value={money(net)} strong />
        </Card>

        {/* Payment */}
        <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.card}>
          <SectionHeader title="Payment" />
          <Row label="Method" value={PAYMENT_LABEL[task.paymentMethod] || task.paymentMethod || '—'} />
          <Row label="Status" value={String(task.paymentStatus || '—').replace(/_/g, ' ')} />
        </Card>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Trip details" onBack={() => router.back()} />
      {body()}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  stateWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: SPACING.md },
  statusBadge: { alignSelf: 'flex-start', marginTop: SPACING.sm },
  container: { flex: 1, backgroundColor: COLORS.surface },
  card: { backgroundColor: COLORS.surfaceContainerLow, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.outlineVariant },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  service: { ...TYPOGRAPHY.headlineMd, color: COLORS.onSurface, fontWeight: '700' },
  taskNumber: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant },
  date: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant, marginTop: 2 },
  routeRow: { flexDirection: 'row', gap: SPACING.sm },
  dots: { alignItems: 'center', paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLine: { width: 2, flex: 1, minHeight: 24, backgroundColor: COLORS.outlineVariant, marginVertical: 2 },
  miniLabel: { ...TYPOGRAPHY.labelMd, color: COLORS.onSurfaceVariant },
  addr: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurface, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.outlineVariant, marginVertical: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurfaceVariant },
  rowValue: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurface },
  rowValueStrong: { fontWeight: '700' },
});
