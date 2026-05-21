// ============================================
// SMART RIDE MOBILE - DELIVERY SCREEN
// ============================================
// Premium delivery service UI
// Vector icons instead of emojis
// Matches admin dashboard design
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
import { Icon, IconName } from '../components/Icon';

// Design system colors
const COLORS = {
  primary: '#00FF88',
  primaryDark: '#00CC6A',
  accent: '#00FFF3',
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  backgroundCard: '#15151F',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  boda: '#00FF88',
  car: '#3B82F6',
  truck: '#8B5CF6',
};

interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  color: string;
  basePrice: number;
  estimatedTime: string;
}

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'boda',
    name: 'Boda Boda',
    description: 'Quick delivery for small packages',
    icon: 'bike',
    color: COLORS.boda,
    basePrice: 5000,
    estimatedTime: '15-30 min',
  },
  {
    id: 'car',
    name: 'Car Delivery',
    description: 'Larger packages, multiple items',
    icon: 'car',
    color: COLORS.car,
    basePrice: 15000,
    estimatedTime: '30-45 min',
  },
  {
    id: 'truck',
    name: 'Truck Delivery',
    description: 'Bulk items, furniture, appliances',
    icon: 'truck',
    color: COLORS.truck,
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
      router.push('/orders/order-tracking?type=delivery');
    } catch (error) {
      console.error('Failed to create delivery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDelivery = DELIVERY_OPTIONS.find((o) => o.id === selectedOption);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
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
                  selectedOption === option.id && { backgroundColor: option.color },
                ]}
              >
                <View
                  style={[
                    styles.optionIconContainer,
                    {
                      backgroundColor:
                        selectedOption === option.id
                          ? 'rgba(255,255,255,0.2)'
                          : `${option.color}15`,
                    },
                  ]}
                >
                  <Icon
                    name={option.icon}
                    size="xl"
                    color={selectedOption === option.id ? '#FFFFFF' : option.color}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionName,
                      selectedOption === option.id && { color: '#FFFFFF' },
                    ]}
                  >
                    {option.name}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      selectedOption === option.id && { color: 'rgba(255,255,255,0.8)' },
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
                <View style={styles.optionPricing}>
                  <Text
                    style={[
                      styles.optionPrice,
                      selectedOption === option.id && { color: '#FFFFFF' },
                    ]}
                  >
                    UGX {option.basePrice.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.optionTime,
                      selectedOption === option.id && { color: 'rgba(255,255,255,0.7)' },
                    ]}
                  >
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
              >
                <Icon name="map-pin" size="sm" color={COLORS.primary} style={{ marginRight: 10 }} />
                <Text
                  style={[
                    styles.locationText,
                    !pickupLocation && { color: COLORS.textMuted },
                  ]}
                >
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
              >
                <Icon name="navigation" size="sm" color={COLORS.accent} style={{ marginRight: 10 }} />
                <Text
                  style={[
                    styles.locationText,
                    !dropoffLocation && { color: COLORS.textMuted },
                  ]}
                >
                  {dropoffLocation || 'Enter drop-off location'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Package Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Package Description</Text>
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
        </Animated.View>

        {/* Summary */}
        {selectedDelivery && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.summaryCard}>
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
              !(pickupLocation && dropoffLocation) && { backgroundColor: '#374151' },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Icon name="package" size="md" color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.requestButtonText}>Request Delivery</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  optionPricing: {
    alignItems: 'flex-end',
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  optionTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  locationSection: {
    marginTop: 8,
  },
  locationCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
    fontWeight: '500',
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: 14,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  textInput: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 60,
  },
  summaryCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 18,
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
    fontSize: 13,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
