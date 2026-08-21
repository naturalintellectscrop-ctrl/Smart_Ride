// ============================================
// SMART RIDE MOBILE - MERCHANT DASHBOARD
// ============================================
// The shop's home screen, built on the same storefront kit as the pharmacy's:
// colour says what a number MEANS — amber for work waiting, blue for work in
// flight, green for work done — and money always sits on the one dark green
// field so it is never read as an ordinary statistic.
//
// Built around the one question a merchant opens the app to answer: what needs
// me right now? The orders that do are on the dashboard with their actions
// attached, because walking to another screen to accept an order that arrived
// thirty seconds ago is the wrong shape for a kitchen.
// ============================================

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useMerchantStore } from '@/src/store';
import { useProviderApprovalGate } from '@/src/hooks/useProviderApprovalGate';
import { useStorefrontLive } from '@/src/hooks/useStorefrontLive';
import { SPACING } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { AppHeader, DetailSkeleton, ErrorState, OnlinePill } from '@/src/components';
import {
  ActionTile,
  MoneyHero,
  OverviewRow,
  Panel,
  SectionTitle,
  Sparkline,
  StatTile,
  TonePill,
  merchantStatusMeta,
  MERCHANT_TAB_STATUSES,
} from '@/src/components/storefront';

const UGX = (n: unknown) => `UGX ${Number(n || 0).toLocaleString()}`;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MerchantDashboardScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const { user } = useAuthStore();
  const approvalGate = useProviderApprovalGate('MERCHANT');

  const {
    merchant,
    orders,
    analytics,
    fetchProfile,
    fetchOrders,
    fetchAnalytics,
    toggleAvailability,
    updateOrderStatus,
    isTogglingAvailability,
    isLoadingProfile,
    isUpdatingOrder,
    profileError,
    ordersError,
  } = useMerchantStore();

  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await fetchProfile();
    const state = useMerchantStore.getState();
    if (state.merchant?.id) {
      // Every order, once. The dashboard groups them by what the merchant has
      // to DO, and each group is a set of statuses — fetching per tab meant a
      // count could not be shown for a tab you were not looking at.
      fetchOrders(state.merchant.id, undefined, 1);
      fetchAnalytics(state.merchant.id);
    }
  }, [fetchProfile, fetchOrders, fetchAnalytics]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleToggleAvailability = async () => {
    if (!merchant?.id) return;
    await toggleAvailability(merchant.id);
  };

  /**
   * A shop can be open on two devices at once — the till and the manager's
   * phone — and an admin can suspend it from the panel. Whoever changes it, the
   * pill in front of everyone else has to follow, or one of them thinks they
   * are trading when they are not.
   */
  useStorefrontLive({
    onMerchantAvailability: ({ merchantId }) => {
      if (!merchant?.id || merchantId !== merchant.id) return;
      fetchProfile();
    },
  });

  const act = async (orderId: string, status: string, label: string) => {
    try {
      await updateOrderStatus(orderId, status);
      if (merchant?.id) fetchOrders(merchant.id, undefined, 1);
    } catch {
      Alert.alert('Could not update this order', `${label} failed. Please try again.`);
    }
  };

  const declineOrder = (orderId: string) => {
    Alert.alert('Decline this order?', 'The customer will be told you cannot fill it.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => act(orderId, 'REJECTED', 'Declining the order'),
      },
    ]);
  };

  // ── Grouped by what the merchant has to do ──────────────────────────────
  const groups = useMemo(() => {
    const inSet = (o: any, key: string) => (MERCHANT_TAB_STATUSES[key] ?? []).includes(o.status);
    return {
      needsAction: orders.filter((o) => inSet(o, 'NEW')),
      inProgress: orders.filter((o) => inSet(o, 'ACTIVE')),
      delivered: orders.filter((o) => inSet(o, 'DELIVERED')),
    };
  }, [orders]);

  // Today's takings and the week behind them, from the same order list.
  const money = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const days = [0, 0, 0, 0, 0, 0, 0];
    let today = 0;
    let todayCount = 0;

    for (const o of groups.delivered) {
      const when = new Date((o as any).deliveredAt || (o as any).updatedAt || o.createdAt).getTime();
      if (Number.isNaN(when)) continue;
      const earned = Number((o as any).merchantEarnings ?? (o as any).subtotal ?? o.totalAmount ?? 0);
      if (when >= startOfToday.getTime()) {
        today += earned;
        todayCount += 1;
      }
      const daysAgo = Math.floor((startOfToday.getTime() - when) / 86_400_000);
      if (daysAgo >= 0 && daysAgo < 7) days[6 - daysAgo] += earned;
      else if (daysAgo < 0) days[6] += earned;
    }
    return { today, todayCount, days, weekTotal: days.reduce((a, b) => a + b, 0) };
  }, [groups.delivered]);

  if (approvalGate) return approvalGate;
  if (isLoadingProfile && !merchant) return <DetailSkeleton />;

  if (profileError && !merchant) {
    return (
      <View style={styles.container}>
        <AppHeader title="" />
        <ErrorState title="We could not load your shop" subtitle={profileError} onRetry={loadData} />
      </View>
    );
  }

  const isOpen = merchant?.isOpen ?? false;
  const shopName = merchant?.name || user?.name || 'Your shop';

  return (
    <View style={styles.container}>
      {/* The shop names itself in the greeting below, so the header carries
          only the controls. */}
      <AppHeader
        title=""
        rightSlot={
          <OnlinePill
            isOnline={isOpen}
            onToggle={handleToggleAvailability}
            labels={{ on: 'OPEN', off: 'CLOSED' }}
            disabled={isTogglingAvailability || !merchant}
          />
        }
        rightActions={[
          {
            icon: 'notifications-outline',
            onPress: () => router.push('/notifications' as never),
            label: 'Notifications',
          },
          {
            icon: 'settings-outline',
            onPress: () => router.push('/settings' as never),
            label: 'Settings',
          },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.greeting}>
          <Text style={styles.greetingSmall}>Welcome back,</Text>
          <Text style={styles.greetingName} numberOfLines={2}>
            {shopName}
          </Text>
          <View style={styles.greetingMeta}>
            {merchant?.status === 'APPROVED' ? (
              <TonePill label="VERIFIED" tone="green" icon="shield-checkmark" />
            ) : null}
            <TonePill
              label={isOpen ? 'OPEN FOR ORDERS' : 'CLOSED'}
              tone={isOpen ? 'green' : 'amber'}
              icon={isOpen ? 'ellipse' : 'moon'}
            />
          </View>
        </View>

        <View style={styles.statRow}>
          <StatTile
            tone="amber"
            icon="bag-handle"
            value={groups.needsAction.length}
            label="Needs action"
            actionLabel="Open"
            onPress={() => router.push(`/merchant/orders?tab=NEW` as never)}
          />
          <StatTile
            tone="blue"
            icon="time"
            value={groups.inProgress.length}
            label="In progress"
            actionLabel="Open"
            onPress={() => router.push(`/merchant/orders?tab=ACTIVE` as never)}
          />
          <StatTile
            tone="green"
            icon="checkmark-circle"
            value={groups.delivered.length}
            label="Delivered"
            actionLabel="Open"
            onPress={() => router.push(`/merchant/orders?tab=DELIVERED` as never)}
          />
        </View>

        <View style={styles.moneyWrap}>
          <MoneyHero
            caption="Today's earnings"
            amount={UGX(money.today || analytics?.todayRevenue || 0)}
            meta={`${money.todayCount} order${money.todayCount === 1 ? '' : 's'} today · ${UGX(
              money.weekTotal
            )} this week`}
            primaryLabel="View earnings"
            onPrimary={() =>
              merchant?.id
                ? router.push(`/merchant/earnings?merchantId=${merchant.id}` as never)
                : undefined
            }
            trailing={<Text style={styles.moneyPeriod}>Last 7 days</Text>}
          />
          <View style={styles.sparkOverlay} pointerEvents="none">
            <Sparkline values={money.days} labels={DAY_LABELS} />
          </View>
        </View>

        {/* The orders that need a decision, with the decision attached. A
            kitchen should not have to navigate to answer an order that arrived
            thirty seconds ago. */}
        {groups.needsAction.length > 0 ? (
          <>
            <SectionTitle
              title={`Waiting on you (${groups.needsAction.length})`}
              actionLabel="See all"
              onAction={() => router.push('/merchant/orders?tab=NEW' as never)}
            />
            {groups.needsAction.slice(0, 3).map((order) => {
              const meta = merchantStatusMeta(order.status);
              return (
                <Panel key={order.id} style={styles.orderCard} padding={SPACING.md}>
                  <TouchableOpacity
                    onPress={() =>
                      merchant?.id
                        ? router.push(
                            `/merchant/orders/${order.id}?merchantId=${merchant.id}` as never
                          )
                        : undefined
                    }
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Order ${order.orderNumber}, ${meta.label}`}
                  >
                    <View style={styles.orderTop}>
                      <Text style={styles.orderNumber} numberOfLines={1}>
                        {order.orderNumber || `#${order.id?.slice(-6)}`}
                      </Text>
                      <TonePill label={meta.label} tone={meta.tone} />
                    </View>
                    <Text style={styles.orderCustomer} numberOfLines={1}>
                      {(order as any).client?.name || (order as any).recipientName || 'Customer'}
                      {(order as any).items?.length
                        ? ` · ${(order as any).items.length} item${
                            (order as any).items.length === 1 ? '' : 's'
                          }`
                        : ''}
                    </Text>
                    <Text style={styles.orderAmount}>{UGX(order.totalAmount)}</Text>
                  </TouchableOpacity>

                  <View style={styles.orderActions}>
                    <TouchableOpacity
                      style={styles.declineButton}
                      onPress={() => declineOrder(order.id)}
                      disabled={isUpdatingOrder}
                      accessibilityRole="button"
                      accessibilityLabel={`Decline order ${order.orderNumber}`}
                    >
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => act(order.id, 'CONFIRMED', 'Accepting the order')}
                      disabled={isUpdatingOrder}
                      accessibilityRole="button"
                      accessibilityLabel={`Accept order ${order.orderNumber}`}
                    >
                      <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                      <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </Panel>
              );
            })}
          </>
        ) : null}

        <SectionTitle title="Quick actions" />
        <View style={styles.actionGrid}>
          <ActionTile
            icon="bag-handle-outline"
            tone="green"
            title="Orders"
            subtitle={`${orders.length} total`}
            badge={groups.needsAction.length}
            onPress={() => router.push('/merchant/orders' as never)}
          />
          <ActionTile
            icon="restaurant-outline"
            tone="violet"
            title="Menu"
            subtitle="Manage items"
            onPress={() =>
              merchant?.id
                ? router.push(`/merchant/menu?merchantId=${merchant.id}` as never)
                : undefined
            }
          />
        </View>
        <View style={styles.actionGrid}>
          <ActionTile
            icon="wallet-outline"
            tone="amber"
            title="Earnings"
            subtitle="View & withdraw"
            onPress={() =>
              merchant?.id
                ? router.push(`/merchant/earnings?merchantId=${merchant.id}` as never)
                : undefined
            }
          />
          <ActionTile
            icon="stats-chart-outline"
            tone="blue"
            title="Performance"
            subtitle={`${analytics?.totalOrders ?? 0} orders all time`}
            onPress={() => router.push('/merchant/orders?tab=DELIVERED' as never)}
          />
        </View>

        <SectionTitle title="Status overview" />
        <Panel>
          <OverviewRow
            first
            icon="storefront"
            tone={isOpen ? 'green' : 'amber'}
            title="Store status"
            subtitle={
              isOpen
                ? 'Customers can place orders with you now.'
                : 'You are closed. New orders are being turned away.'
            }
            right={
              <TouchableOpacity
                onPress={handleToggleAvailability}
                disabled={isTogglingAvailability}
                accessibilityRole="button"
                accessibilityLabel={isOpen ? 'Close the shop' : 'Open the shop'}
              >
                <TonePill
                  label={isTogglingAvailability ? '…' : isOpen ? 'OPEN' : 'CLOSED'}
                  tone={isOpen ? 'green' : 'amber'}
                />
              </TouchableOpacity>
            }
          />
          <OverviewRow
            icon="cart"
            tone="amber"
            title="Orders waiting"
            subtitle="New orders you have not answered yet"
            value={groups.needsAction.length}
            valueTone="amber"
            onPress={() => router.push('/merchant/orders?tab=NEW' as never)}
          />
          <OverviewRow
            icon="bicycle"
            tone="blue"
            title="With a courier"
            subtitle="Collected or on the way to the customer"
            value={groups.inProgress.length}
            valueTone="blue"
            onPress={() => router.push('/merchant/orders?tab=ACTIVE' as never)}
          />
        </Panel>

        {ordersError ? (
          <TouchableOpacity style={styles.errorBox} onPress={onRefresh} activeOpacity={0.85}>
            <Ionicons name="cloud-offline-outline" size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{ordersError}</Text>
            <Text style={styles.errorRetry}>Retry</Text>
          </TouchableOpacity>
        ) : null}

        {!isOpen ? (
          <TouchableOpacity
            style={styles.closedNote}
            onPress={handleToggleAvailability}
            disabled={isTogglingAvailability}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Open the shop for orders"
          >
            <Ionicons name="moon" size={17} color={COLORS.onSurfaceVariant} />
            <Text style={styles.closedNoteText}>
              Your shop is closed. Customers cannot place new orders until you open.
            </Text>
            <Text style={styles.closedNoteAction}>Open</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },

    greeting: { marginBottom: SPACING.md },
    greetingSmall: { fontSize: 14, color: COLORS.onSurfaceVariant },
    greetingName: {
      fontSize: 26,
      fontWeight: '800',
      color: COLORS.onSurface,
      letterSpacing: -0.7,
      marginTop: 2,
      lineHeight: 31,
    },
    greetingMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },

    statRow: { flexDirection: 'row', gap: SPACING.sm },

    moneyWrap: { marginTop: SPACING.md, position: 'relative' },
    moneyPeriod: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: 11,
      fontWeight: '700',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.28)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    sparkOverlay: { position: 'absolute', right: SPACING.md, top: 52, width: '50%' },

    orderCard: { marginBottom: SPACING.gutter },
    orderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    orderNumber: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.onSurface },
    orderCustomer: { fontSize: 12.5, color: COLORS.onSurfaceVariant, marginTop: 6 },
    orderAmount: {
      fontSize: 19,
      fontWeight: '800',
      color: COLORS.onSurface,
      marginTop: 6,
      letterSpacing: -0.4,
    },
    orderActions: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING.gutter,
      paddingTop: SPACING.gutter,
      borderTopWidth: 1,
      borderTopColor: COLORS.outlineVariant,
    },
    declineButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
    },
    declineText: { fontSize: 13.5, fontWeight: '700', color: COLORS.error },
    acceptButton: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: COLORS.primary,
    },
    acceptText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

    actionGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: SPACING.md,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.error,
    },
    errorText: { flex: 1, fontSize: 12.5, color: COLORS.onSurface, lineHeight: 17 },
    errorRetry: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

    closedNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: SPACING.md,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: COLORS.outlineVariant,
    },
    closedNoteText: { flex: 1, fontSize: 12.5, lineHeight: 17, color: COLORS.onSurfaceVariant },
    closedNoteAction: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  });
