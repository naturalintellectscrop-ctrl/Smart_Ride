// ============================================
// SMART RIDE MOBILE - SETTINGS (shared hub)
// ============================================
// One reusable Settings screen for every provider role (and clients). It only
// wires EXISTING functionality — nothing new is invented:
//   Account : Edit Profile, Change Password, Notifications, Theme
//   Activity: Trip History (riders/drivers/delivery only)
//   Support : Help Center, Terms, Privacy
//   Session : Logout, Delete Account
// Language is intentionally omitted (the app has no i18n yet).
// ============================================

import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '@/src/components/feedback';
import { useAuthStore } from '@/src/store/authStore';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';

const WEB = 'https://smartrideug.vercel.app';
const TERMS_URL = `${WEB}/terms`;
const PRIVACY_URL = `${WEB}/privacy`;

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  danger?: boolean;
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { user, logout } = useAuthStore();

  const isRiderish = user?.role === 'RIDER' || user?.role === 'DRIVER';
  const go = (path: string) => router.push(path as never);

  const openUrl = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Unavailable', 'Could not open the link.'));

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
    ]);
  };

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Account',
      rows: [
        { icon: 'person-outline', label: 'Edit Profile', onPress: () => go('/profile/edit') },
        { icon: 'lock-closed-outline', label: 'Change Password', onPress: () => go('/auth/change-password') },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => go('/notifications') },
        { icon: 'moon-outline', label: 'Dark Theme', toggle: { value: isDark, onChange: () => toggleTheme() } },
      ],
    },
    ...(isRiderish
      ? [{
          title: 'Activity',
          rows: [{ icon: 'time-outline' as const, label: 'Trip History', onPress: () => go('/rider/history') }],
        }]
      : []),
    {
      title: 'Support',
      rows: [
        { icon: 'help-circle-outline', label: 'Help Center', onPress: () => go('/help-center') },
        { icon: 'document-text-outline', label: 'Terms & Conditions', onPress: () => openUrl(TERMS_URL) },
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => openUrl(PRIVACY_URL) },
      ],
    },
    {
      title: 'Session',
      rows: [
        { icon: 'log-out-outline', label: 'Log Out', onPress: confirmLogout, danger: true },
        { icon: 'trash-outline', label: 'Delete Account', onPress: () => go('/profile/delete-account'), danger: true },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.appbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.appbarTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: insets.bottom + 24 }}>
        {user ? (
          <View style={styles.profileCard}>
            <View style={styles.avatar}><Ionicons name="person" size={24} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user.name || 'Smart Ride user'}</Text>
              <Text style={styles.role}>{String(user.role || '').replace(/_/g, ' ') || 'Account'}</Text>
            </View>
          </View>
        ) : null}

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, i) => (
                <TouchableOpacity
                  key={row.label}
                  style={[styles.row, i < section.rows.length - 1 && styles.rowBorder]}
                  onPress={row.onPress}
                  activeOpacity={row.toggle ? 1 : 0.7}
                  disabled={!!row.toggle}
                >
                  <Ionicons name={row.icon} size={20} color={row.danger ? COLORS.error : COLORS.onSurfaceVariant} />
                  <Text style={[styles.rowLabel, row.danger && { color: COLORS.error }]}>{row.label}</Text>
                  {row.toggle ? (
                    <Switch
                      value={row.toggle.value}
                      onValueChange={row.toggle.onChange}
                      trackColor={{ false: COLORS.surfaceContainerHigh, true: `${COLORS.primary}80` }}
                      thumbColor={row.toggle.value ? COLORS.primary : COLORS.surfaceContainerLowest}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={COLORS.onSurfaceVariant} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footer}>Smart Ride · Natural Intellects</Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  appbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  appbarTitle: { ...TYPOGRAPHY.headlineMd, color: COLORS.onSurface },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surfaceContainerLow, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.outlineVariant, marginBottom: SPACING.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  name: { ...TYPOGRAPHY.bodyLg, color: COLORS.onSurface, fontWeight: '700' },
  role: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant, marginTop: 2, textTransform: 'capitalize' },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.labelMd, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm, marginLeft: SPACING.xs },
  sectionCard: { backgroundColor: COLORS.surfaceContainerLow, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.outlineVariant, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  rowLabel: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurface, flex: 1 },
  footer: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: SPACING.md, opacity: 0.7 },
});
