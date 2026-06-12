/* eslint-disable react-hooks/immutability */
// ============================================
// SMART RIDE MOBILE - PROFILE SCREEN
// ============================================

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await api.logout();
              await logout();
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
              await logout();
              router.replace('/');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      section: 'Account',
      items: [
        { icon: '👤', label: 'Edit Profile', onPress: () => {} },
        { icon: '📍', label: 'Saved Addresses', onPress: () => {} },
        { icon: '💳', label: 'Payment Methods', onPress: () => {} },
        { icon: '👥', label: 'Emergency Contacts', onPress: () => {} },
      ],
    },
    {
      section: 'Preferences',
      items: [
        { 
          icon: '🔔', 
          label: 'Notifications', 
          type: 'toggle',
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        { 
          icon: '🌙', 
          label: 'Dark Mode', 
          type: 'toggle',
          value: darkMode,
          onToggle: setDarkMode,
        },
        { icon: '🌍', label: 'Language', value: 'English', onPress: () => {} },
      ],
    },
    {
      section: 'Support',
      items: [
        { icon: '❓', label: 'Help Center', onPress: () => {} },
        { icon: '💬', label: 'Contact Support', onPress: () => {} },
        { icon: '📜', label: 'Terms of Service', onPress: () => {} },
        { icon: '🔒', label: 'Privacy Policy', onPress: () => {} },
      ],
    },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        className="bg-primary-500 pt-12 pb-8 px-4"
      >
        <Text className="text-2xl font-bold text-white mb-6">Profile</Text>
        
        {/* User Info */}
        <View className="flex-row items-center">
          <Animated.View 
            entering={ZoomIn.delay(200).duration(300)}
            className="w-20 h-20 bg-white rounded-full items-center justify-center mr-4"
          >
            <Text className="text-4xl">👤</Text>
          </Animated.View>
          <Animated.View entering={FadeInRight.delay(300).duration(400)}>
            <Text className="text-white text-xl font-bold">{user?.name || 'Guest'}</Text>
            <Text className="text-white/80">{user?.email || ''}</Text>
            <Text className="text-white/80">{user?.phone || ''}</Text>
          </Animated.View>
          <AnimatedPressable>
            <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
              <Text>✏️</Text>
            </View>
          </AnimatedPressable>
        </View>
      </Animated.View>

      {/* Stats */}
      <Animated.View 
        entering={FadeInUp.duration(400).delay(200).springify()}
        className="flex-row bg-white mx-4 -mt-4 rounded-2xl p-4 shadow-sm"
      >
        <StatItem label="Total Rides" value="24" delay={300} />
        <View className="w-px bg-gray-200" />
        <StatItem label="Orders" value="12" delay={350} />
        <View className="w-px bg-gray-200" />
        <StatItem label="Rating" value="4.8 ⭐" delay={400} />
      </Animated.View>

      {/* Menu Items */}
      {menuItems.map((section, sectionIndex) => (
        <Animated.View 
          key={sectionIndex} 
          entering={FadeInUp.duration(400).delay(300 + sectionIndex * 100).springify()}
          className="mt-6 px-4"
        >
          <Text className="text-gray-500 text-sm font-medium mb-2">{section.section}</Text>
          <View className="bg-white rounded-2xl overflow-hidden">
            {section.items.map((item, itemIndex) => (
              <Animated.View
                key={itemIndex}
                entering={SlideInRight.duration(300).delay(350 + sectionIndex * 100 + itemIndex * 50).springify()}
              >
                <MenuItem 
                  item={item} 
                  isLast={itemIndex === section.items.length - 1} 
                />
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      ))}

      {/* App Version */}
      <Animated.Text 
        entering={FadeIn.duration(400).delay(800)}
        className="text-center text-gray-400 text-sm mt-6"
      >
        Smart Ride v1.0.0
      </Animated.Text>

      {/* Logout Button */}
      <Animated.View entering={FadeInUp.duration(400).delay(900).springify()} className="px-4 mt-6 mb-8">
        <AnimatedPressable
          className="bg-red-50 rounded-2xl py-4"
          onPress={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.warning} />
          ) : (
            <Text className="text-red-500 text-center font-semibold">Sign Out</Text>
          )}
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

// Animated Stat Item
function StatItem({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <Animated.View 
      entering={FadeIn.duration(400).delay(delay).springify()}
      className="flex-1 items-center py-2"
    >
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-gray-500 text-sm">{label}</Text>
    </Animated.View>
  );
}

// Menu Item Component
function MenuItem({ item, isLast }: { item: any; isLast: boolean }) {
  return (
    <>
      <AnimatedPressable
        className="flex-row items-center px-4 py-4"
        onPress={item.type === 'toggle' ? undefined : item.onPress}
      >
        <Text className="text-xl mr-3">{item.icon}</Text>
        <Text className="flex-1 text-gray-900 font-medium">{item.label}</Text>
        {item.type === 'toggle' ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
            thumbColor={item.value ? COLORS.secondary : '#F4F4F5'}
          />
        ) : item.value ? (
          <Text className="text-gray-500">{item.value}</Text>
        ) : (
          <Text className="text-gray-400">›</Text>
        )}
      </AnimatedPressable>
      {!isLast && <View className="h-px bg-gray-100 ml-14" />}
    </>
  );
}

// Animated Pressable Component
function AnimatedPressable({ children, onPress, disabled, className }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; className?: string }) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      className={className}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.95}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// FadeInRight animation helper
const FadeInRight = SlideInRight.duration(300);
