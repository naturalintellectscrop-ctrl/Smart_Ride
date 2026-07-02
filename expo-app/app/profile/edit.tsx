// ============================================
// SMART RIDE MOBILE - PROFILE EDIT SCREEN
// ============================================
// VERSION: DEBUG-TRACE-001
// PURPOSE: Edit user profile information
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { api } from '@/src/services';
import { useAuthStore } from '@/src/store';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, API_CONFIG } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Ionicons } from '@expo/vector-icons';
import { pickImage } from '@/src/utils/imagePicker';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address?: string;
  avatar?: string;
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: (user as any).address || '',
        avatar: (user as any).avatarUrl,
      });
    }
  }, [user]);

  // Fetch the latest profile (incl. address) from the backend so the
  // editor doesn't show stale data when the auth store hasn't been
  // refreshed yet. This also backfills fields like `address` that the
  // auth store's `User` interface may not include.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const res = await api.getProfile();
        if (cancelled) return;
        if (res.success && res.data) {
          const p = res.data as any;
          setProfile({
            name: p.name || user?.name || '',
            email: p.email || user?.email || '',
            phone: p.phone || user?.phone || '',
            address: p.address || '',
            avatar: p.avatarUrl || (user as any)?.avatarUrl,
          });
        }
      } catch (e) {
        // Non-fatal — fall back to auth store values already set above.
        console.warn('Failed to load profile for editor:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarPress = async () => {
    try {
      const image = await pickImage({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!image) return;

      setIsUploadingAvatar(true);

      const formData = new FormData();
      formData.append('avatar', {
        uri: image.uri,
        type: image.type,
        name: image.name,
      } as any);

      const token = await (await import('@/src/utils/secureStorage')).secureStorage.getAccessToken();
      const response = await fetch(`${API_CONFIG.baseUrl}/uploads/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      if (result.success && result.data?.avatarUrl) {
        setProfile(prev => ({ ...prev, avatar: result.data.avatarUrl }));
        setUser({ ...user!, avatarUrl: result.data.avatarUrl } as any);
        Alert.alert('Success', 'Avatar updated!');
      } else {
        Alert.alert('Error', result.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      Alert.alert('Error', 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    // Basic client-side validation
    if (!profile.name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.updateProfile({
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        address: profile.address?.trim() || '',
        avatarUrl: profile.avatar,
      });
      if (response.success) {
        // Merge updated fields into the auth store so other screens
        // (e.g. profile tab) immediately reflect the change.
        if (user) {
          setUser({
            ...user,
            name: profile.name.trim(),
            email: profile.email.trim(),
            phone: profile.phone.trim(),
            avatarUrl: profile.avatar,
            address: profile.address?.trim() || '',
          } as any);
        }
        Alert.alert('Success', 'Profile updated successfully');
        router.back();
      } else {
        Alert.alert('Error', response.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to update profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <View style={[styles.screen, { backgroundColor: COLORS.surface }]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400).springify()}
        style={[styles.header, { paddingTop: 48 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving || isLoading} style={styles.saveBtn}>
            <Text style={styles.saveText}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <Animated.View
          entering={ZoomIn.duration(400)}
          style={styles.avatarSection}
        >
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7} disabled={isUploadingAvatar}>
            <View style={styles.avatarContainer}>
              {isUploadingAvatar ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={40} color={COLORS.primary} />
              )}
            </View>
            <View style={styles.avatarBadge}>
              <Ionicons name="camera-outline" size={14} color={COLORS.onPrimary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          {/* Name */}
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Full Name</Text>
            <TextInput
              value={profile.name}
              onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.outline}
              style={styles.formInput}
            />
          </View>

          {/* Email */}
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Email Address</Text>
            <TextInput
              value={profile.email}
              onChangeText={(text) => setProfile(prev => ({ ...prev, email: text }))}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.outline}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.formInput}
            />
          </View>

          {/* Phone */}
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Phone Number</Text>
            <TextInput
              value={profile.phone}
              onChangeText={(text) => setProfile(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              placeholderTextColor={COLORS.outline}
              keyboardType="phone-pad"
              style={styles.formInput}
            />
          </View>

          {/* Address */}
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Default Address</Text>
            <TextInput
              value={profile.address}
              onChangeText={(text) => setProfile(prev => ({ ...prev, address: text }))}
              placeholder="Enter your address"
              placeholderTextColor={COLORS.outline}
              multiline
              numberOfLines={2}
              style={styles.formInput}
            />
          </View>
        </Animated.View>

        {/* Save Button */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.saveButtonContainer}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
      )}
    </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    color: COLORS.outline,
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
  },
  header: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingVertical: SPACING.sm,
  },
  backText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.bodyLg.fontSize,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  saveBtn: {
    paddingVertical: SPACING.sm,
  },
  saveText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.full,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    padding: SPACING.sm,
  },
  avatarBadgeIcon: {
    color: COLORS.onPrimary,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
  },
  avatarHint: {
    color: COLORS.outline,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    marginTop: SPACING.sm,
  },
  formCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  formLabel: {
    color: COLORS.outline,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    marginBottom: SPACING.sm,
  },
  formInput: {
    color: COLORS.onSurface,
    fontSize: TYPOGRAPHY.bodyLg.fontSize,
  },
  saveButtonContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.onPrimary,
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.bodyLg.fontSize,
  },
});
