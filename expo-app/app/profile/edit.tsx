// ============================================
// SMART RIDE MOBILE - PROFILE EDIT SCREEN
// ============================================
// Premium dark theme with vector icons
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
  StyleSheet
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
import { COLORS } from '@/src/constants';
import { Icon, IconColors } from '../../components/Icon';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address?: string;
  avatar?: string;
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: '',
      });
    }
  }, [user]);

  // Get user initials
  const getUserInitials = () => {
    if (profile.name) {
      const parts = profile.name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return profile.name.substring(0, 2).toUpperCase();
    }
    return 'U';
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
    <View style={styles.container}>
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.headerButton}
          activeOpacity={0.8}
        >
          <Icon name="arrow-left" size="md" color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={isSaving}
          style={styles.headerButton}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <Animated.View 
          entering={ZoomIn.duration(400)}
          style={styles.avatarSection}
        >
          <TouchableOpacity activeOpacity={0.8}>
            <View style={styles.avatarContainer}>
              {profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{getUserInitials()}</Text>
                </View>
              )}
              <View style={styles.cameraButton}>
                <Icon name="camera" size="sm" color={COLORS.background} />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          {/* Name */}
          <View style={styles.inputCard}>
            <View style={styles.inputIcon}>
              <Icon name="user" size="sm" color={COLORS.primary} />
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                value={profile.name}
                onChangeText={(text) => setProfile({ ...profile, name: text })}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textMuted}
                style={styles.inputText}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputCard}>
            <View style={styles.inputIcon}>
              <Icon name="mail" size="sm" color={COLORS.accent} />
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                value={profile.email}
                onChangeText={(text) => setProfile({ ...profile, email: text })}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.inputText}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputCard}>
            <View style={styles.inputIcon}>
              <Icon name="phone" size="sm" color="#8B5CF6" />
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                value={profile.phone}
                onChangeText={(text) => setProfile({ ...profile, phone: text })}
                placeholder="Enter your phone number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                style={styles.inputText}
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.inputCard}>
            <View style={styles.inputIcon}>
              <Icon name="map-pin" size="sm" color="#F59E0B" />
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>Default Address</Text>
              <TextInput
                value={profile.address}
                onChangeText={(text) => setProfile({ ...profile, address: text })}
                placeholder="Enter your address"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={2}
                style={styles.inputText}
              />
            </View>
          </View>
        </Animated.View>

        {/* Save Button */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.saveButtonContainer}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <>
                <Icon name="check" size="md" color={COLORS.background} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.backgroundElevated,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    minWidth: 60,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: 'bold',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 8,
  },
  avatarHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 12,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  inputText: {
    color: COLORS.text,
    fontSize: 16,
    padding: 0,
  },
  saveButtonContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
