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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        className="bg-white pt-12 pb-4 px-4 border-b border-gray-100"
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-primary-500 text-lg">← Back</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            <Text className="text-primary-500 text-lg font-medium">
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Avatar */}
        <Animated.View 
          entering={ZoomIn.duration(400)}
          className="items-center mb-6"
        >
          <TouchableOpacity>
            <View className="w-24 h-24 bg-primary-100 rounded-full items-center justify-center">
              {profile.avatar ? (
                <Image source={{ uri: profile.avatar }} className="w-24 h-24 rounded-full" />
              ) : (
                <Text className="text-4xl">👤</Text>
              )}
            </View>
            <View className="absolute bottom-0 right-0 bg-primary-500 rounded-full p-2">
              <Text className="text-white text-sm">📷</Text>
            </View>
          </TouchableOpacity>
          <Text className="text-gray-500 text-sm mt-2">Tap to change photo</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          {/* Name */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="text-gray-500 text-sm mb-2">Full Name</Text>
            <TextInput
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
              className="text-gray-900 text-lg"
            />
          </View>

          {/* Email */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="text-gray-500 text-sm mb-2">Email Address</Text>
            <TextInput
              value={profile.email}
              onChangeText={(text) => setProfile({ ...profile, email: text })}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              className="text-gray-900 text-lg"
            />
          </View>

          {/* Phone */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="text-gray-500 text-sm mb-2">Phone Number</Text>
            <TextInput
              value={profile.phone}
              onChangeText={(text) => setProfile({ ...profile, phone: text })}
              placeholder="Enter your phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              className="text-gray-900 text-lg"
            />
          </View>

          {/* Address */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="text-gray-500 text-sm mb-2">Default Address</Text>
            <TextInput
              value={profile.address}
              onChangeText={(text) => setProfile({ ...profile, address: text })}
              placeholder="Enter your address"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              className="text-gray-900 text-lg"
            />
          </View>
        </Animated.View>

        {/* Save Button */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} className="mt-4 mb-8">
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            className="bg-primary-500 rounded-2xl p-4 items-center"
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Save Changes</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
