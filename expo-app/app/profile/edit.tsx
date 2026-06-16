// ============================================
// SMART RIDE MOBILE - PROFILE EDIT SCREEN
// ============================================
// VERSION: DEBUG-TRACE-001
// PURPOSE: Edit user profile information
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { api } from '@/src/services';
import { useAuthStore } from '@/src/store';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, API_CONFIG } from '@/src/constants';
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
        address: '',
        avatar: (user as any).avatarUrl,
      });
    }
  }, [user]);

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
    setIsSaving(true);
    try {
      const response = await api.updateProfile(profile);
      if (response.success) {
        Alert.alert('Success', 'Profile updated successfully');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
          <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveBtn}>
            <Text style={styles.saveText}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
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
