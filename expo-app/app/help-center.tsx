// ============================================
// SMART RIDE MOBILE - HELP CENTER
// ============================================
// Theme-aware (light + dark) support hub matching the Smart Ride design.
// No mock data: FAQ/category content is real help content; the "Recent
// Tickets" mock from the design is omitted until a tickets API exists.
// Actions deep-link to the live /help and /contact web pages.
// ============================================

import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Linking,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { TYPOGRAPHY, SPACING, RADIUS, ICON } from '@/src/constants';
import {
  AppHeader,
  Card,
  EmptyState,
  GradientButton,
  ListRow,
  SearchInput,
  SectionHeader,
} from '@/src/components';

const HELP_URL = 'https://smartrideug.vercel.app/help';
const CONTACT_URL = 'https://smartrideug.vercel.app/contact';
// Support line. Local format for the dialer; international (256…) for WhatsApp.
const SUPPORT_PHONE = '0785710818';
const SUPPORT_WHATSAPP = '256785710818';
const WHATSAPP_TEXT = 'Hello Smart Ride Support, I need help with';

const CATEGORIES = [
  { icon: 'car-outline', label: 'Rides', topic: 'rides' },
  { icon: 'bicycle-outline', label: 'Delivery', topic: 'delivery' },
  { icon: 'wallet-outline', label: 'Payments & Wallet', topic: 'payments' },
  { icon: 'lock-closed-outline', label: 'Account & Privacy', topic: 'account' },
] as const;

const ARTICLES = [
  { q: 'How do I cancel a ride?', topic: 'cancel-ride' },
  { q: 'Tracking my delivery', topic: 'track-delivery' },
  { q: 'MTN MoMo / Airtel Money issues', topic: 'mobile-money' },
  { q: 'How fares are calculated', topic: 'fares' },
  { q: 'Update my saved addresses', topic: 'addresses' },
  { q: 'Contacting your driver safely', topic: 'contact-driver' },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // This screen used `useTheme().colors` (the ThemeColors shape) while every
  // other screen uses makeThemedColors — two palettes with different key names
  // living in one app. Aligned here.
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [query, setQuery] = useState('');

  const filteredArticles = query.trim().length > 0
    ? ARTICLES.filter((a) => a.q.toLowerCase().includes(query.toLowerCase().trim()))
    : ARTICLES;

  const openHelp = (topic?: string) =>
    Linking.openURL(topic ? `${HELP_URL}?topic=${topic}` : HELP_URL).catch(() => {});
  void CONTACT_URL; // retained for reference; primary support is phone + WhatsApp

  // Call us → open the phone dialer with the support number.
  const callSupport = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {});
  };

  // Chat with Support → WhatsApp message to the support number. Falls back to
  // the WhatsApp web link (which the WhatsApp app intercepts) if the app's
  // custom scheme isn't available.
  const chatSupport = async () => {
    const text = encodeURIComponent(WHATSAPP_TEXT);
    const appUrl = `whatsapp://send?phone=${SUPPORT_WHATSAPP}&text=${text}`;
    const webUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`;
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpen ? appUrl : webUrl);
    } catch {
      Linking.openURL(webUrl).catch(() => {});
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Help Center" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for help topics"
          style={styles.search}
        />

        <View style={styles.shortcutRow}>
          <GradientButton
            title="Chat with support"
            onPress={chatSupport}
            variant="primary"
            size="lg"
            fullWidth
            icon={<Ionicons name="logo-whatsapp" size={ICON.md} color={COLORS.onPrimary} />}
          />
          <GradientButton
            title="Call us"
            onPress={callSupport}
            variant="outline"
            size="lg"
            fullWidth
            icon={<Ionicons name="call" size={ICON.md} color={COLORS.primary} />}
          />
        </View>

        <SectionHeader title="Browse categories" />
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => (
            <Card
              key={c.topic}
              variant="flat"
              padding={SPACING.md}
              radius={RADIUS.md}
              style={styles.categoryTile}
              onPress={() => openHelp(c.topic)}
              accessibilityLabel={c.label}
            >
              <Ionicons name={c.icon as any} size={ICON.xl} color={COLORS.primary} />
              <Text style={styles.categoryLabel} numberOfLines={2}>{c.label}</Text>
            </Card>
          ))}
        </View>

        <SectionHeader title="Popular articles" />
        {filteredArticles.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No articles match your search"
            subtitle="Try a different word, or contact support directly."
            actionLabel="Clear search"
            onAction={() => setQuery('')}
          />
        ) : (
          <Card variant="raised" padding={SPACING.sm} radius={RADIUS.lg} style={styles.articleCard}>
            {filteredArticles.map((a, i) => (
              <ListRow
                key={a.topic}
                title={a.q}
                divider={i < filteredArticles.length - 1}
                onPress={() => openHelp(a.topic)}
              />
            ))}
          </Card>
        )}

        <Card
          variant="accent"
          padding={SPACING.md}
          radius={RADIUS.lg}
          onPress={chatSupport}
          accessibilityLabel="Contact support"
        >
          <View style={styles.bannerRow}>
            <View style={styles.bannerIcon}>
              <Ionicons name="headset" size={ICON.xl} color={COLORS.onPrimary} />
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Still need help?</Text>
              <Text style={styles.bannerSubtitle}>Our team in Kampala is ready to assist you.</Text>
            </View>
            <Ionicons name="chevron-forward" size={ICON.md} color={COLORS.onSurfaceVariant} />
          </View>
        </Card>

        <View style={{ height: insets.bottom + SPACING.lg }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  search: {
    marginBottom: SPACING.lg,
  },
  shortcutRow: {
    // Stacked, not side by side. "Chat with support" cannot fit on one line in
    // half the width of a small phone, and a wrapped button label reads as a
    // layout bug rather than a deliberate two-line label.
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  categoryTile: {
    // `flexBasis` with a floor rather than a fixed `width: '47%'`: two tiles
    // plus the gap overflowed 100% on narrow screens, which is what pushed the
    // labels into a second line.
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 140,
    gap: SPACING.sm,
  },
  categoryLabel: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
    color: COLORS.onSurface,
    // Long category names get an ellipsis instead of reflowing the tile and
    // leaving the grid ragged.
    flexShrink: 1,
  },
  articleCard: {
    marginBottom: SPACING.lg,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.gutter,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    minWidth: 0,
  },
  bannerTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  bannerSubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
});
