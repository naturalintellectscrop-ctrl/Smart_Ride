// ============================================
// SMART RIDE MOBILE - PHARMACIST ORDERS
// ============================================
// The order book. Each card answers, without being opened: what state is this
// in, who is it for, what is in it, what is it worth, and — the thing a
// pharmacy most needs and could not see anywhere — has it been paid for.
//
// Statuses, tab groupings, payment wording and the legal action from each state
// all come from src/components/pharmacy/pharmacyOrder.ts, so this screen and
// the detail screen can no longer disagree about what an order is doing.
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { api } from '@/src/services';
import { SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { AppHeader, EmptyState, ListSkeleton, SearchInput } from '@/src/components';
import {
  Panel,
  TonePill,
  toneColors,
  statusMeta,
  paymentMeta,
  parseItems,
  TAB_STATUSES,
  TAB_LABELS,
} from '@/src/components/pharmacy';
import { Ionicons } from '@expo/vector-icons';

const TAB_ORDER = ['ALL', 'NEW', 'ACTIVE', 'DELIVERED', 'CLOSED'] as const;
type OrderTab = (typeof TAB_ORDER)[number];

const UGX = (n: unknown) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function PharmacistOrdersScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();

  // The dashboard tiles deep-link straight into the tab they count, so tapping
  // "3 need action" lands on those three rather than on everything.
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = (TAB_ORDER as readonly string[]).includes(params.tab ?? '')
    ? (params.tab as OrderTab)
    : 'ALL';

  const [activeTab, setActiveTab] = useState<OrderTab>(initialTab);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      // One fetch, filtered on the client. A tab is a PHASE and covers several
      // statuses while the endpoint takes one, so narrowing here avoids either
      // changing that contract or firing five requests.
      const response = await api.getHealthOrders();
      if (response.success && response.data) {
        const payload: any = response.data;
        const orderData = payload.orders || payload.data || payload;
        setAllOrders(Array.isArray(orderData) ? orderData : []);
      } else {
        setAllOrders([]);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      setAllOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadOrders();
  }, [loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: allOrders.length };
    for (const tab of TAB_ORDER) {
      if (tab === 'ALL') continue;
      const wanted = TAB_STATUSES[tab];
      c[tab] = wanted ? allOrders.filter((o) => wanted.includes(o.status)).length : 0;
    }
    return c;
  }, [allOrders]);

  const orders = useMemo(() => {
    const wanted = TAB_STATUSES[activeTab];
    let list = wanted ? allOrders.filter((o) => wanted.includes(o.status)) : allOrders;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        const items = parseItems(o.items)
          .map((i) => i.name)
          .join(' ');
        return [o.orderNumber, o.customerName, o.customerPhone, o.deliveryAddress, items]
          .filter(Boolean)
          .some((f: string) => String(f).toLowerCase().includes(q));
      });
    }
    return list;
  }, [allOrders, activeTab, query]);

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
      subtitle: 'Orders appear here as soon as a customer places one with your pharmacy.',
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
      <AppHeader title="Orders" subtitle={`${allOrders.length} total`} onBack={() => router.back()} />

      <View style={styles.searchWrap}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by order, customer or medicine"
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
              accessibilityLabel={`${TAB_LABELS[tab]}, ${counts[tab] ?? 0} orders`}
            >
              <Text
                style={[styles.tabText, active && styles.activeTabText]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {TAB_LABELS[tab]}
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

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={orders}
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
                  ? `No order matches "${query.trim()}". Try an order number, a customer name or a medicine.`
                  : emptyCopy[activeTab].subtitle
              }
            />
          }
          renderItem={({ item: order }) => {
            const meta = statusMeta(order.status);
            const pay = paymentMeta(order.paymentMethod, order.paymentStatus);
            const items = parseItems(order.items);
            const tone = toneColors(meta.tone, isDark);
            const itemLine = items.length
              ? items
                  .map((i) => `${i.quantity && i.quantity > 1 ? `${i.quantity}× ` : ''}${i.name}`)
                  .join(', ')
              : 'No items listed';

            return (
              <TouchableOpacity
                onPress={() => router.push(`/pharmacist/orders/${order.id}`)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Order ${order.orderNumber}, ${meta.label}, ${UGX(order.totalAmount)}`}
              >
                <Panel style={styles.orderCard} padding={0}>
                  {/* A colour rail rather than another badge — the state is
                      readable while scrolling, without adding a fourth chip. */}
                  <View style={[styles.rail, { backgroundColor: tone.ink }]} />
                  <View style={styles.orderBody}>
                    <View style={styles.orderTop}>
                      <Text style={styles.orderNumber} numberOfLines={1}>
                        {order.orderNumber || `#${order.id?.slice(-6)}`}
                      </Text>
                      <TonePill label={meta.label} tone={meta.tone} />
                    </View>

                    <Text style={styles.customer} numberOfLines={1}>
                      {order.customerName || 'Customer'}
                      {order.customerPhone ? ` · ${order.customerPhone}` : ''}
                    </Text>
                    <Text style={styles.items} numberOfLines={2}>
                      {itemLine}
                    </Text>

                    {order.orderType === 'PRESCRIPTION_MEDICINE' ? (
                      <View style={styles.rxRow}>
                        <Ionicons
                          name={order.prescriptionVerified ? 'shield-checkmark' : 'alert-circle'}
                          size={13}
                          color={order.prescriptionVerified ? COLORS.success : COLORS.warning}
                        />
                        <Text
                          style={[
                            styles.rxText,
                            { color: order.prescriptionVerified ? COLORS.success : COLORS.warning },
                          ]}
                        >
                          {order.prescriptionVerified
                            ? 'Prescription verified'
                            : 'Prescription not yet verified'}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.orderFooter}>
                      <View style={styles.moneyBlock}>
                        <Text style={styles.amount}>{UGX(order.totalAmount)}</Text>
                        <Text style={styles.earn}>You earn {UGX(order.providerEarnings)}</Text>
                      </View>
                      <View style={styles.payBlock}>
                        <TonePill label={pay.statusLabel} tone={pay.tone} icon="card" />
                        <Text style={styles.payMethod} numberOfLines={1}>
                          {pay.method}
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
    activeTabText: { color: COLORS.onPrimary ?? '#FFFFFF' },
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
    activeTabCountText: { color: COLORS.onPrimary ?? '#FFFFFF' },

    list: { flex: 1 },
    listContent: { padding: SPACING.md, paddingTop: SPACING.xs, paddingBottom: SPACING.xxl, gap: SPACING.gutter },

    orderCard: { flexDirection: 'row', overflow: 'hidden' },
    rail: { width: 4 },
    orderBody: { flex: 1, padding: SPACING.md, minWidth: 0 },

    orderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
    orderNumber: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.2 },

    customer: { fontSize: 13, color: COLORS.onSurface, marginTop: 8, fontWeight: '600' },
    items: { fontSize: 12.5, color: COLORS.onSurfaceVariant, marginTop: 3, lineHeight: 17 },

    rxRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
    rxText: { fontSize: 11.5, fontWeight: '700' },

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
    earn: { fontSize: 11.5, color: COLORS.onSurfaceVariant, marginTop: 1 },
    payBlock: { alignItems: 'flex-end', flexShrink: 1, minWidth: 0, gap: 4 },
    payMethod: { fontSize: 11, color: COLORS.onSurfaceVariant, textAlign: 'right' },

    date: { fontSize: 11, color: COLORS.outline, marginTop: 8 },
  });
