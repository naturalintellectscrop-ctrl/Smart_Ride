// ============================================
// SMART RIDE MOBILE - MERCHANT ORDERS
// ============================================
// The order book, on the same storefront kit as the pharmacy's. Each card
// answers, without being opened: what state is this in, who is it for, what is
// it worth, and — the thing a shop most needs and could not see — has it been
// paid for.
//
// Tabs are PHASES, not single statuses. They were one-status-per-tab, so an
// order that had been accepted vanished from "New" and appeared in "Accepted",
// then vanished again at "Preparing" — a merchant chasing an order had to guess
// which tab it had moved to. Statuses, groupings and the legal action from each
// state come from src/components/storefront/merchantOrder.ts, shared with the
// dashboard so the two cannot disagree.
// ============================================

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMerchantStore } from '@/src/store';
import { SPACING, RADIUS } from '@/src/constants';
import { AppHeader, EmptyState, ErrorState, ListSkeleton, SearchInput } from '@/src/components';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  Panel,
  TonePill,
  toneColors,
  merchantStatusMeta,
  paymentMeta,
  MERCHANT_TAB_STATUSES,
  MERCHANT_TAB_LABELS,
} from '@/src/components/storefront';
import { Ionicons } from '@expo/vector-icons';

const TAB_ORDER = ['ALL', 'NEW', 'ACTIVE', 'DELIVERED', 'CLOSED'] as const;
type OrderTab = (typeof TAB_ORDER)[number];

const UGX = (n: unknown) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function MerchantOrdersScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const params = useLocalSearchParams<{ merchantId?: string; tab?: string }>();

  const merchant = useMerchantStore((s) => s.merchant);
  const orders = useMerchantStore((s) => s.orders);
  const isLoadingOrders = useMerchantStore((s) => s.isLoadingOrders);
  const ordersError = useMerchantStore((s) => s.ordersError);
  const fetchOrders = useMerchantStore((s) => s.fetchOrders);

  const merchantId = params.merchantId || merchant?.id;

  // The dashboard tiles deep-link straight into the group they count.
  const initialTab = (TAB_ORDER as readonly string[]).includes(params.tab ?? '')
    ? (params.tab as OrderTab)
    : 'ALL';

  const [activeTab, setActiveTab] = useState<OrderTab>(initialTab);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (merchantId) fetchOrders(merchantId, undefined, 1);
  }, [merchantId, fetchOrders]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: orders.length };
    for (const tab of TAB_ORDER) {
      if (tab === 'ALL') continue;
      const wanted = MERCHANT_TAB_STATUSES[tab];
      c[tab] = wanted ? orders.filter((o) => wanted.includes(o.status)).length : 0;
    }
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const wanted = MERCHANT_TAB_STATUSES[activeTab];
    let list = wanted ? orders.filter((o) => wanted.includes(o.status)) : orders;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((o) =>
        [
          o.orderNumber,
          (o as any).client?.name,
          (o as any).recipientName,
          (o as any).deliveryAddress,
        ]
          .filter(Boolean)
          .some((f: string) => String(f).toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, activeTab, query]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const emptyCopy: Record<OrderTab, { title: string; subtitle: string }> = {
    ALL: {
      title: 'No orders yet',
      subtitle: 'Orders appear here as soon as a customer places one with your shop.',
    },
    NEW: {
      title: 'Nothing waiting on you',
      subtitle: 'New orders land here first, so you can accept or decline them.',
    },
    ACTIVE: {
      title: 'Nothing in progress',
      subtitle: 'Orders you have accepted show here until the courier delivers them.',
    },
    DELIVERED: {
      title: 'No completed orders yet',
      subtitle: 'Once a courier hands an order to the customer, it moves here.',
    },
    CLOSED: {
      title: 'Nothing cancelled',
      subtitle: 'Orders you decline, or that get cancelled, are kept here.',
    },
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Orders" subtitle={`${orders.length} total`} onBack={() => router.back()} />

      {/* UI-3: the placeholder used to run off the field and arrive as
          "Search by order, customer or". A hint cut mid-phrase reads as a bug,
          and it is worse than a shorter hint. The empty state below still
          spells out all three things you can search by. */}
      <View style={styles.searchWrap}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Order, customer or address"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {TAB_ORDER.map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, active && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${MERCHANT_TAB_LABELS[tab]}, ${counts[tab] ?? 0} orders`}
            >
              <Text
                style={[styles.tabText, active && styles.activeTabText]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {MERCHANT_TAB_LABELS[tab]}
              </Text>
              {(counts[tab] ?? 0) > 0 ? (
                <View style={[styles.tabCount, active && styles.activeTabCount]}>
                  <Text style={[styles.tabCountText, active && styles.activeTabCountText]}>
                    {counts[tab]}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoadingOrders && orders.length === 0 ? (
        <ListSkeleton />
      ) : ordersError && orders.length === 0 ? (
        <ErrorState title="We could not load your orders" subtitle={ordersError} onRetry={load} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(o) => o.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={query ? 'search-outline' : 'bag-handle-outline'}
              title={query ? 'Nothing matched that' : emptyCopy[activeTab].title}
              subtitle={
                query
                  ? `No order matches "${query.trim()}". Try an order number, a customer or an address.`
                  : emptyCopy[activeTab].subtitle
              }
            />
          }
          renderItem={({ item: order }) => {
            const meta = merchantStatusMeta(order.status);
            const pay = paymentMeta((order as any).paymentMethod, (order as any).paymentStatus);
            const tone = toneColors(meta.tone, isDark);
            const itemCount = (order as any).items?.length ?? 0;

            return (
              <TouchableOpacity
                onPress={() =>
                  merchantId
                    ? router.push(`/merchant/orders/${order.id}?merchantId=${merchantId}` as never)
                    : undefined
                }
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Order ${order.orderNumber}, ${meta.label}, ${UGX(
                  order.totalAmount
                )}`}
              >
                <Panel style={styles.orderCard} padding={0}>
                  {/* A colour rail rather than another badge — the state stays
                      readable while scrolling. */}
                  <View style={[styles.rail, { backgroundColor: tone.ink }]} />
                  <View style={styles.orderBody}>
                    <View style={styles.orderTop}>
                      <Text style={styles.orderNumber} numberOfLines={1}>
                        {order.orderNumber || `#${order.id?.slice(-6)}`}
                      </Text>
                      <TonePill label={meta.label} tone={meta.tone} />
                    </View>

                    <Text style={styles.customer} numberOfLines={1}>
                      {(order as any).client?.name || (order as any).recipientName || 'Customer'}
                      {itemCount ? ` · ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}
                    </Text>
                    {(order as any).deliveryAddress ? (
                      <Text style={styles.address} numberOfLines={1}>
                        {(order as any).deliveryAddress}
                      </Text>
                    ) : null}

                    <View style={styles.orderFooter}>
                      <View style={styles.moneyBlock}>
                        <Text style={styles.amount}>{UGX(order.totalAmount)}</Text>
                        <Text style={styles.hint} numberOfLines={1}>
                          {meta.hint}
                        </Text>
                      </View>
                      <View style={styles.payBlock}>
                        <TonePill label={pay.statusLabel} tone={pay.tone} icon="card" />
                        <Text style={styles.payMethod} numberOfLines={1}>
                          {pay.methodShort}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
                  </View>
                </Panel>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    searchWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },

    tabsContainer: { flexGrow: 0, maxHeight: 56 },
    tabsContent: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
      alignItems: 'center',
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
      backgroundColor: COLORS.backgroundElevated,
    },
    activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
    activeTabText: { color: '#FFFFFF' },
    tabCount: {
      minWidth: 20,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 999,
      backgroundColor: COLORS.surfaceContainerHigh,
      alignItems: 'center',
    },
    activeTabCount: { backgroundColor: 'rgba(255,255,255,0.28)' },
    tabCountText: { fontSize: 11, fontWeight: '800', color: COLORS.onSurfaceVariant },
    activeTabCountText: { color: '#FFFFFF' },

    list: { flex: 1 },
    listContent: {
      padding: SPACING.md,
      paddingTop: SPACING.xs,
      paddingBottom: SPACING.xxl,
      gap: SPACING.gutter,
    },

    orderCard: { flexDirection: 'row', overflow: 'hidden' },
    rail: { width: 4 },
    orderBody: { flex: 1, padding: SPACING.md, minWidth: 0 },

    orderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    orderNumber: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.onSurface },

    customer: { fontSize: 13, color: COLORS.onSurface, marginTop: 8, fontWeight: '600' },
    address: { fontSize: 12.5, color: COLORS.onSurfaceVariant, marginTop: 3 },

    orderFooter: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: SPACING.sm,
      marginTop: SPACING.gutter,
      paddingTop: SPACING.gutter,
      borderTopWidth: 1,
      borderTopColor: COLORS.outlineVariant,
    },
    moneyBlock: { flexShrink: 1, minWidth: 0 },
    amount: { fontSize: 18, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.4 },
    hint: { fontSize: 11.5, color: COLORS.onSurfaceVariant, marginTop: 1 },
    payBlock: { alignItems: 'flex-end', flexShrink: 1, minWidth: 0, gap: 4 },
    payMethod: { fontSize: 11, color: COLORS.onSurfaceVariant, textAlign: 'right' },

    date: { fontSize: 11, color: COLORS.outline, marginTop: 8 },
  });
