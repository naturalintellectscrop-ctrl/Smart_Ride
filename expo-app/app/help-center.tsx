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
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '@/src/context/theme-context';

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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
      {/* Top app bar */}
      <View style={[styles.appBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.appBarBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Help Center</Text>
        <View style={styles.appBarBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help topics..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Support shortcuts */}
        <View style={styles.shortcutRow}>
          <TouchableOpacity style={[styles.shortcut, styles.shortcutPrimary]} onPress={chatSupport} activeOpacity={0.85}>
            <Ionicons name="logo-whatsapp" size={28} color={colors.white} />
            <Text style={styles.shortcutPrimaryText}>Chat with Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcut, styles.shortcutOutline]} onPress={callSupport} activeOpacity={0.85}>
            <Ionicons name="call" size={28} color={colors.primary} />
            <Text style={styles.shortcutOutlineText}>Call us</Text>
          </TouchableOpacity>
        </View>

        {/* Browse categories */}
        <Text style={styles.sectionTitle}>Browse Categories</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c.topic} style={styles.categoryTile} onPress={() => openHelp(c.topic)} activeOpacity={0.7}>
              <Ionicons name={c.icon as any} size={26} color={colors.primary} />
              <Text style={styles.categoryLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Popular articles */}
        <Text style={styles.sectionTitle}>Popular Articles</Text>
        <View style={styles.articleCard}>
          {filteredArticles.length === 0 ? (
            <Text style={styles.noResults}>No articles match “{query}”.</Text>
          ) : (
            filteredArticles.map((a, i) => (
              <TouchableOpacity
                key={a.topic}
                style={[styles.articleRow, i < filteredArticles.length - 1 && styles.articleDivider]}
                onPress={() => openHelp(a.topic)}
                activeOpacity={0.7}
              >
                <Text style={styles.articleText}>{a.q}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Still need help banner */}
        <TouchableOpacity style={styles.banner} onPress={chatSupport} activeOpacity={0.9}>
          <View style={styles.bannerIcon}>
            <Ionicons name="headset" size={26} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Still need help?</Text>
            <Text style={styles.bannerSubtitle}>Our 24/7 team in Kampala is ready to assist you anytime.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    appBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingBottom: 8,
      backgroundColor: colors.background,
    },
    appBarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    appBarTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: Platform.select({ default: undefined }),
      fontSize: 22,
      fontWeight: '700',
      color: colors.primary,
    },
    content: { paddingHorizontal: 16, paddingBottom: 24 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 52,
      marginBottom: 24,
    },
    searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 0 },
    shortcutRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    shortcut: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 22,
      borderRadius: 12,
      gap: 8,
    },
    shortcutPrimary: {
      backgroundColor: colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    shortcutPrimaryText: { color: colors.white, fontSize: 14, fontWeight: '600' },
    shortcutOutline: {
      backgroundColor: colors.backgroundElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shortcutOutlineText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    sectionTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 16 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
    categoryTile: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      gap: 8,
    },
    categoryLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    articleCard: {
      backgroundColor: colors.backgroundElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 24,
    },
    articleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    articleDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
    articleText: { flex: 1, fontSize: 16, color: colors.text, marginRight: 12 },
    noResults: { padding: 16, color: colors.textMuted, fontSize: 14 },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 20,
    },
    bannerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
    bannerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  });
}
