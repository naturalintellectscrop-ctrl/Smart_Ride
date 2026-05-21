// ============================================
// SMART RIDE MOBILE - DELIVERY SCREEN
// ============================================
// Premium dark theme with vector icons
// Package/item delivery service
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { COLORS } from '@/src/constants';
import { Icon, IconColors } from '../../components/Icon';

interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  iconName: 'navigation' | 'car' | 'truck';
  iconColor: string;
  basePrice: number;
  estimatedTime: string;
}

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'boda',
    name: 'Boda Boda',
    description: 'Quick delivery for small packages',
    iconName: 'navigation',
    iconColor: '#00FF88',
    basePrice: 5000,
    estimatedTime: '15-30 min',
  },
  {
    id: 'car',
    name: 'Car Delivery',
    description: 'Larger packages, multiple items',
    iconName: 'car',
    iconColor: '#00FFF3',
    basePrice: 15000,
    estimatedTime: '30-45 min',
  },
  {
    id: 'truck',
    name: 'Truck Delivery',
    description: 'Bulk items, furniture, appliances',
    iconName: 'truck',
    iconColor: '#F59E0B',
    basePrice: 30000,
    estimatedTime: '1-2 hours',
  },
];

export default function DeliveryScreen() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<string>('boda');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestDelivery = async () => {
    if (!pickupLocation || !dropoffLocation) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Create delivery request
      router.push('/orders/order-tracking?type=delivery');
    } catch (error) {
      console.error('Failed to create delivery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDelivery = DELIVERY_OPTIONS.find(o => o.id === selectedOption);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Delivery</Text>
        <Text style={styles.headerSubtitle}>Send packages anywhere</Text>
      </Animated.View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Delivery Options */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Text style={styles.sectionTitle}>Select Delivery Type</Text>
          {DELIVERY_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.id}
              entering={ZoomIn.delay(150 + index * 80).duration(300)}
            >
              <TouchableOpacity
                onPress={() => setSelectedOption(option.id)}
                style={[
                  styles.optionCard,
                  selectedOption === option.id && styles.optionCardSelected
                ]}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.optionIconContainer,
                  { backgroundColor: `${option.iconColor}15` }
                ]}>
                  <Icon name={option.iconName} size="xl" color={option.iconColor} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionName,
                    selectedOption === option.id && styles.optionNameSelected
                  ]}>
                    {option.name}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    selectedOption === option.id && styles.optionDescriptionSelected
                  ]}>
                    {option.description}
                  </Text>
                </View>
                <View style={styles.optionPriceContainer}>
                  <Text style={[
                    styles.optionPrice,
                    selectedOption === option.id && styles.optionPriceSelected
                  ]}>
                    UGX {option.basePrice.toLocaleString()}
                  </Text>
                  <Text style={[
                    styles.optionTime,
                    selectedOption === option.id && styles.optionTimeSelected
                  ]}>
                    {option.estimatedTime}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Location Inputs */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          
          <View style={styles.locationCard}>
            {/* Pickup */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pickup Location</Text>
              <TouchableOpacity 
                onPress={() => router.push('/location-picker?type=pickup')}
                style={styles.locationInput}
                activeOpacity={0.8}
              >
                <View style={styles.locationIconContainer}>
                  <Icon name="map-pin" size="sm" color={COLORS.primary} />
                </View>
                <Text style={[
                  styles.locationInputText,
                  pickupLocation ? styles.locationInputTextActive : {}
                ]}>
                  {pickupLocation || 'Enter pickup location'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dropoff */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Drop-off Location</Text>
              <TouchableOpacity 
                onPress={() => router.push('/location-picker?type=dropoff')}
                style={styles.locationInput}
                activeOpacity={0.8}
              >
                <View style={styles.locationIconContainer}>
                  <Icon name="navigation" size="sm" color={COLORS.secondary} />
                </View>
                <Text style={[
                  styles.locationInputText,
                  dropoffLocation ? styles.locationInputTextActive : {}
                ]}>
                  {dropoffLocation || 'Enter drop-off location'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Package Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Package Description</Text>
              <View style={styles.textInputContainer}>
                <TextInput
                  value={packageDescription}
                  onChangeText={setPackageDescription}
                  placeholder="What are you sending?"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.textInput}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Summary */}
        {selectedDelivery && (
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={styles.summaryCard}
          >
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Type</Text>
              <Text style={styles.summaryValue}>{selectedDelivery.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Time</Text>
              <Text style={styles.summaryValue}>{selectedDelivery.estimatedTime}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Estimated Cost</Text>
              <Text style={styles.summaryTotalValue}>
                UGX {selectedDelivery.basePrice.toLocaleString()}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Request Button */}
        <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleRequestDelivery}
            disabled={!pickupLocation || !dropoffLocation || isLoading}
            style={[
              styles.requestButton,
              pickupLocation && dropoffLocation ? styles.requestButtonActive : {}
            ]}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <>
                <Icon name="package" size="md" color={COLORS.background} />
                <Text style={styles.requestButtonText}>
                  Request Delivery
                </Text>
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
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: COLORS.background,
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(13, 13, 18, 0.7)',
    fontSize: 16,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionNameSelected: {
    color: COLORS.background,
  },
  optionDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  optionDescriptionSelected: {
    color: 'rgba(13, 13, 18, 0.7)',
  },
  optionPriceContainer: {
    alignItems: 'flex-end',
  },
  optionPrice: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionPriceSelected: {
    color: COLORS.background,
  },
  optionTime: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  optionTimeSelected: {
    color: 'rgba(13, 13, 18, 0.6)',
  },
  locationSection: {
    marginTop: 8,
  },
  locationCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
  },
  locationIconContainer: {
    marginRight: 10,
  },
  locationInputText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  locationInputTextActive: {
    color: COLORS.text,
  },
  textInputContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
  },
  textInput: {
    color: COLORS.text,
    fontSize: 14,
    minHeight: 48,
  },
  summaryCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  summaryTotalLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryTotalValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  requestButton: {
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtonActive: {
    backgroundColor: COLORS.primary,
  },
  requestButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
