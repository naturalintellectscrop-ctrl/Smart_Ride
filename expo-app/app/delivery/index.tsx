// ============================================
// SMART RIDE MOBILE - DELIVERY SCREEN
// ============================================
// Stitch Design System — Parcel Price Estimate layout
// AppHeader, RideTimeline progress, Route summary, Service type selection,
// Package size selector, Price estimate card, CTA button
// ============================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useLocationStore, useTaskStore } from '@/src/store';
import { api } from '@/src/services';
import { PAYMENT_METHODS, PAYMENT_METHOD_MAP, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { PaymentMethod } from '@/src/types';
import {
  AppHeader,
  Card,
  GradientButton,
  RideTimeline,
  SearchInput,
} from '@/src/components';

// ============================================
// TYPES
// ============================================

type DeliveryType = 'BODA' | 'CAR' | 'STANDARD';
type Step = 'type' | 'locations' | 'confirm';

/** Wizard step labels, shown on the shared RideTimeline. */
const STEP_LABELS: Record<Step, string> = {
  type: 'Package',
  locations: 'Route',
  confirm: 'Confirm',
};

interface DeliveryOption {
  id: DeliveryType;
  name: string;
  description: string;
  label: string;
  vehicleLabel: string;
  estimatedTime: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: 'primary' | 'primaryContainer' | 'secondary';
}

interface PlaceResult {
  id: string;
  place_name: string;
  center: [number, number];
  text?: string;
}

interface PackageSize {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  maxSize: string;
}

// ============================================
// CONSTANTS
// ============================================

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'BODA',
    name: 'Motorcycle',
    description: 'Small packages, documents',
    label: 'BODA',
    vehicleLabel: 'Motorcycle',
    estimatedTime: '15-30 min',
    icon: 'bicycle',
    colorKey: 'primary' as const,
  },
  {
    id: 'CAR',
    name: 'Car',
    description: 'Larger packages, multiple items',
    label: 'CAR',
    vehicleLabel: 'Car',
    estimatedTime: '30-45 min',
    icon: 'car',
    colorKey: 'primaryContainer' as const,
  },
  {
    id: 'STANDARD',
    name: 'Van / Truck',
    description: 'Scheduled delivery, bulk items',
    label: 'STANDARD',
    vehicleLabel: 'Van/Truck',
    estimatedTime: '1-3 hours',
    icon: 'bus',
    colorKey: 'secondary' as const,
  },
];

const PACKAGE_SIZES: PackageSize[] = [
  { id: 'small', label: 'Small', description: 'Envelope, documents', icon: 'mail', maxSize: '< 5 kg' },
  { id: 'medium', label: 'Medium', description: 'Box, groceries', icon: 'cube', maxSize: '< 20 kg' },
  { id: 'large', label: 'Large', description: 'Furniture, appliances', icon: 'cube-outline', maxSize: '< 50 kg' },
];

const DELIVERY_FARE = {
  BASE_FARE: 5000,
  PER_KM: 1200,
};

const DEBOUNCE_MS = 400;

// ============================================
// HAVERSINE DISTANCE
// ============================================

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateFare(distanceKm: number): number {
  return Math.round(DELIVERY_FARE.BASE_FARE + distanceKm * DELIVERY_FARE.PER_KM);
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DeliveryScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const { user } = useAuthStore();
  const { latitude, longitude, address, getCurrentLocation } = useLocationStore();
  const { setPendingTask } = useTaskStore();

  // Step
  const [step, setStep] = useState<Step>('type');

  // Delivery type
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('BODA');

  // Package size
  const [packageSize, setPackageSize] = useState('small');

  // Locations
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLatitude, setPickupLatitude] = useState<number | null>(null);
  const [pickupLongitude, setPickupLongitude] = useState<number | null>(null);

  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffLatitude, setDropoffLatitude] = useState<number | null>(null);
  const [dropoffLongitude, setDropoffLongitude] = useState<number | null>(null);

  // Search state
  const [activeSearchField, setActiveSearchField] = useState<'pickup' | 'dropoff' | null>(null);
  const [pickupSearchQuery, setPickupSearchQuery] = useState('');
  const [dropoffSearchQuery, setDropoffSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Package
  const [packageDescription, setPackageDescription] = useState('');

  // Fare
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // ============================================
  // SEARCH WITH DEBOUNCE
  // ============================================

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.searchPlaces(query);
      if (response.success && response.data) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('[Delivery] Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (text: string, field: 'pickup' | 'dropoff') => {
      if (field === 'pickup') {
        setPickupSearchQuery(text);
      } else {
        setDropoffSearchQuery(text);
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        searchPlaces(text);
      }, DEBOUNCE_MS);
    },
    [searchPlaces]
  );

  // ============================================
  // CLEAR LOCATIONS
  // ============================================

  const clearPickup = useCallback(() => {
    setPickupAddress('');
    setPickupLatitude(null);
    setPickupLongitude(null);
    setPickupSearchQuery('');
    setSearchResults([]);
    setActiveSearchField('pickup');
    setDistanceKm(null);
    setEstimatedFare(null);
  }, []);

  const clearDropoff = useCallback(() => {
    setDropoffAddress('');
    setDropoffLatitude(null);
    setDropoffLongitude(null);
    setDropoffSearchQuery('');
    setSearchResults([]);
    setActiveSearchField('dropoff');
    setDistanceKm(null);
    setEstimatedFare(null);
  }, []);

  // ============================================
  // SELECT PLACE
  // ============================================

  const selectPickupPlace = useCallback((place: PlaceResult) => {
    setPickupAddress(place.place_name);
    setPickupLatitude(place.center[1]);
    setPickupLongitude(place.center[0]);
    setPickupSearchQuery('');
    setSearchResults([]);
    setActiveSearchField(null);
    Keyboard.dismiss();
  }, []);

  const selectDropoffPlace = useCallback(
    (place: PlaceResult) => {
      setDropoffAddress(place.place_name);
      setDropoffLatitude(place.center[1]);
      setDropoffLongitude(place.center[0]);
      setDropoffSearchQuery('');
      setSearchResults([]);
      setActiveSearchField(null);
      Keyboard.dismiss();

      if (pickupLatitude !== null && pickupLongitude !== null) {
        const dist = haversineDistance(
          pickupLatitude,
          pickupLongitude,
          place.center[1],
          place.center[0]
        );
        setDistanceKm(dist);
        setEstimatedFare(calculateFare(dist));
      }
    },
    [pickupLatitude, pickupLongitude]
  );

  // ============================================
  // USE CURRENT LOCATION AS PICKUP
  // ============================================

  const useCurrentLocation = useCallback(() => {
    setPickupAddress(address || 'Current Location');
    setPickupLatitude(latitude);
    setPickupLongitude(longitude);
    setPickupSearchQuery('');
    setSearchResults([]);
    setActiveSearchField(null);
    Keyboard.dismiss();
  }, [latitude, longitude, address]);

  // ============================================
  // NAVIGATE STEPS
  // ============================================

  const goToLocations = useCallback(() => {
    setStep('locations');
  }, []);

  const goToConfirm = useCallback(() => {
    if (!pickupAddress || !dropoffAddress || !pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude) {
      Alert.alert('Missing Info', 'Please set both pickup and drop-off locations.');
      return;
    }

    if (distanceKm === null) {
      const dist = haversineDistance(pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude);
      setDistanceKm(dist);
      setEstimatedFare(calculateFare(dist));
    }

    setStep('confirm');
  }, [pickupAddress, dropoffAddress, pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude, distanceKm]);

  const goBack = useCallback(() => {
    if (step === 'locations') setStep('type');
    else if (step === 'confirm') setStep('locations');
    else router.back();
  }, [step, router]);

  // ============================================
  // SUBMIT DELIVERY REQUEST
  // ============================================

  const handleSubmit = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please login to request a delivery');
      return;
    }

    if (!pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude) {
      Alert.alert('Error', 'Location data is missing');
      return;
    }

    const dist = distanceKm ?? haversineDistance(pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude);

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.requestRide({
        taskType: 'ITEM_DELIVERY',
        clientId: user.id,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        dropoffAddress,
        dropoffLatitude,
        dropoffLongitude,
        distanceKm: dist,
        paymentMethod: PAYMENT_METHOD_MAP[paymentMethod] || paymentMethod,
        packageDescription,
        deliveryType,
        packageSize,
      });

      if (response.success && response.data) {
        setPendingTask(response.data);
        router.replace(`/rider/ride-tracking?taskId=${response.data.id}`);
      } else {
        setError(response.error || 'Failed to create delivery request');
        Alert.alert('Delivery Failed', response.error || 'Could not create delivery request. Please try again.');
      }
    } catch (err: any) {
      const message = err?.message || 'An unexpected error occurred';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user,
    pickupAddress,
    pickupLatitude,
    pickupLongitude,
    dropoffAddress,
    dropoffLatitude,
    dropoffLongitude,
    distanceKm,
    paymentMethod,
    packageDescription,
    deliveryType,
    packageSize,
    setPendingTask,
    router,
  ]);

  // ============================================
  // SELECTED DELIVERY OPTION
  // ============================================

  const selectedOption = DELIVERY_OPTIONS.find((o) => o.id === deliveryType)!;

  // ============================================
  // RENDER
  // ============================================

  const stepSubtitle = step === 'type'
    ? 'Choose delivery type'
    : step === 'locations'
    ? 'Set pickup & drop-off'
    : 'Confirm & pay';

  return (
    <View style={styles.container}>
      <AppHeader title="Send a parcel" subtitle={stepSubtitle} onBack={goBack} />

      {/* Progress. The three-step wizard drew its own dots and connector lines;
          RideTimeline already renders exactly this and is used by ride tracking
          and order tracking. */}
      <View style={styles.progressWrap}>
        <RideTimeline
          steps={(['type', 'locations', 'confirm'] as Step[]).map((sKey, i) => ({
            id: sKey,
            label: STEP_LABELS[sKey],
            status:
              step === sKey ? 'active'
              : i < (['type', 'locations', 'confirm'] as Step[]).indexOf(step) ? 'completed'
              : 'pending',
          }))}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'type' && (
          <StepType
            deliveryType={deliveryType}
            packageSize={packageSize}
            onSelectType={setDeliveryType}
            onSelectPackageSize={setPackageSize}
            onContinue={goToLocations}
          />
        )}

        {step === 'locations' && (
          <StepLocations
            pickupAddress={pickupAddress}
            dropoffAddress={dropoffAddress}
            packageDescription={packageDescription}
            setPackageDescription={setPackageDescription}
            activeSearchField={activeSearchField}
            setActiveSearchField={setActiveSearchField}
            pickupSearchQuery={pickupSearchQuery}
            dropoffSearchQuery={dropoffSearchQuery}
            onPickupSearchChange={(text) => handleSearchChange(text, 'pickup')}
            onDropoffSearchChange={(text) => handleSearchChange(text, 'dropoff')}
            searchResults={searchResults}
            isSearching={isSearching}
            onSelectPickup={selectPickupPlace}
            onSelectDropoff={selectDropoffPlace}
            onUseCurrentLocation={useCurrentLocation}
            onClearPickup={clearPickup}
            onClearDropoff={clearDropoff}
            onContinue={goToConfirm}
          />
        )}

        {step === 'confirm' && (
          <StepConfirm
            deliveryOption={selectedOption}
            pickupAddress={pickupAddress}
            dropoffAddress={dropoffAddress}
            packageDescription={packageDescription}
            distanceKm={distanceKm}
            estimatedFare={estimatedFare}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            isSubmitting={isSubmitting}
            error={error}
            onSubmit={handleSubmit}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ============================================
// STEP 1: DELIVERY TYPE + PACKAGE SIZE
// ============================================

function StepType({
  deliveryType,
  packageSize,
  onSelectType,
  onSelectPackageSize,
  onContinue,
}: {
  deliveryType: DeliveryType;
  packageSize: string;
  onSelectType: (type: DeliveryType) => void;
  onSelectPackageSize: (size: string) => void;
  onContinue: () => void;
}) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.stepContainer}>
      {/* Service Type Selection */}
      <Text style={styles.sectionTitle}>Service Type</Text>
      <Text style={styles.sectionDescription}>
        Choose vehicle based on your package
      </Text>

      {DELIVERY_OPTIONS.map((option, index) => {
          const isSelected = deliveryType === option.id;
          const isRecommended = option.id === 'BODA';
          const fareEstimate = option.id === 'BODA'
            ? `UGX ${DELIVERY_FARE.BASE_FARE.toLocaleString()}`
            : option.id === 'CAR'
            ? `UGX ${(DELIVERY_FARE.BASE_FARE + 7000).toLocaleString()}`
            : `UGX ${(DELIVERY_FARE.BASE_FARE + 15000).toLocaleString()}`;
          return (
            <Animated.View
              key={option.id}
              entering={FadeInUp.delay(index * 80).duration(300)}
            >
              <TouchableOpacity
                onPress={() => onSelectType(option.id)}
                activeOpacity={0.75}
                style={[
                  styles.serviceListCard,
                  isSelected && styles.serviceListCardSelected,
                ]}
              >
                <View style={[
                  styles.serviceListIcon,
                  { backgroundColor: isSelected ? COLORS.primary : COLORS.primaryFixed },
                ]}>
                  <Ionicons name={option.icon} size={22} color={isSelected ? COLORS.onPrimary : COLORS.primary} />
                </View>
                <View style={styles.serviceListContent}>
                  <View style={styles.serviceListNameRow}>
                    <Text style={[styles.serviceListName, isSelected && styles.serviceListNameActive]}>
                      {option.name === 'Motorcycle' ? 'Smart Boda' : option.name === 'Car' ? 'Smart Car' : 'Van / Truck'}
                    </Text>
                    {isRecommended && (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>RECOMMENDED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.serviceListDesc}>{option.description}</Text>
                </View>
                <Text style={[styles.serviceListFare, isSelected && styles.serviceListFareActive]}>
                  {fareEstimate}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

      {/* Package Size Selector */}
      <Text style={styles.sectionTitle}>Package Size</Text>

      <View style={styles.packageSizeRow}>
        {PACKAGE_SIZES.map((pkg) => {
          const isSelected = packageSize === pkg.id;
          return (
            <TouchableOpacity
              key={pkg.id}
              onPress={() => onSelectPackageSize(pkg.id)}
              activeOpacity={0.7}
              style={[
                styles.packageSizeCard,
                isSelected && styles.packageSizeCardSelected,
              ]}
            >
              <View
                style={[
                  styles.packageSizeIconCircle,
                  isSelected && styles.packageSizeIconCircleSelected,
                ]}
              >
                <Ionicons
                  name={pkg.icon}
                  size={18}
                  color={isSelected ? COLORS.primary : COLORS.onSurfaceVariant}
                />
              </View>
              <Text
                style={[
                  styles.packageSizeLabel,
                  isSelected && styles.packageSizeLabelSelected,
                ]}
              >
                {pkg.label}
              </Text>
              <Text style={styles.packageSizeMax}>{pkg.maxSize}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Price Estimate Card */}
      <Card variant="elevated" radius={RADIUS.lg} style={styles.priceEstimateCard}>
        <View style={styles.priceEstimateHeader}>
          <Ionicons name="calculator" size={20} color={COLORS.primary} />
          <Text style={styles.priceEstimateTitle}>Price Estimate</Text>
        </View>
        <View style={styles.priceEstimateRow}>
          <Text style={styles.priceEstimateLabel}>Base fare</Text>
          <Text style={styles.priceEstimateValue}>UGX {DELIVERY_FARE.BASE_FARE.toLocaleString()}</Text>
        </View>
        <View style={styles.priceEstimateRow}>
          <Text style={styles.priceEstimateLabel}>Per km</Text>
          <Text style={styles.priceEstimateValue}>UGX {DELIVERY_FARE.PER_KM.toLocaleString()}</Text>
        </View>
        <View style={styles.priceEstimateDivider} />
        <Text style={styles.priceEstimateNote}>
          Final price calculated after setting locations
        </Text>
      </Card>

      {/* Continue CTA */}
      <Animated.View entering={FadeInUp.delay(300).duration(400)}>
        <GradientButton
          title="Continue"
          onPress={onContinue}
          variant="primary"
          size="lg"
          fullWidth
          icon={<Ionicons name="arrow-forward" size={18} color={COLORS.onPrimary} />}
        />
      </Animated.View>

      <View style={{ height: SPACING.xl }} />
    </View>
  );
}

// ============================================
// STEP 2: LOCATIONS
// ============================================

function StepLocations({
  pickupAddress,
  dropoffAddress,
  packageDescription,
  setPackageDescription,
  activeSearchField,
  setActiveSearchField,
  pickupSearchQuery,
  dropoffSearchQuery,
  onPickupSearchChange,
  onDropoffSearchChange,
  searchResults,
  isSearching,
  onSelectPickup,
  onSelectDropoff,
  onUseCurrentLocation,
  onClearPickup,
  onClearDropoff,
  onContinue,
}: {
  pickupAddress: string;
  dropoffAddress: string;
  packageDescription: string;
  setPackageDescription: (desc: string) => void;
  activeSearchField: 'pickup' | 'dropoff' | null;
  setActiveSearchField: (field: 'pickup' | 'dropoff' | null) => void;
  pickupSearchQuery: string;
  dropoffSearchQuery: string;
  onPickupSearchChange: (text: string) => void;
  onDropoffSearchChange: (text: string) => void;
  searchResults: PlaceResult[];
  isSearching: boolean;
  onSelectPickup: (place: PlaceResult) => void;
  onSelectDropoff: (place: PlaceResult) => void;
  onUseCurrentLocation: () => void;
  onClearPickup: () => void;
  onClearDropoff: () => void;
  onContinue: () => void;
}) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const canContinue = pickupAddress.length > 0 && dropoffAddress.length > 0;

  return (
    <View style={styles.stepContainer}>
      {/* Route Summary Card */}
      <Card variant="elevated" radius={RADIUS.lg} style={styles.routeCard}>
        {/* Pickup */}
        <View style={styles.routeRow}>
          <View style={styles.routeDotGreen} />
          <View style={styles.routeLineDashed} />
          <View style={styles.routeInputArea}>
            <Text style={styles.routeLabel}>PICKUP</Text>
            {pickupAddress ? (
              <TouchableOpacity onPress={onClearPickup} style={styles.routeSetRow}>
                <Text style={styles.routeSetText} numberOfLines={2}>{pickupAddress}</Text>
                <Text style={styles.routeChangeText}>Change</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <TouchableOpacity style={styles.currentLocationButton} onPress={onUseCurrentLocation}>
                  <Ionicons name="locate" size={14} color={COLORS.primary} />
                  <Text style={styles.currentLocationLabel}>Use Current Location</Text>
                </TouchableOpacity>
                <Text style={styles.orText}>or search for a pickup point</Text>
                <SearchInput
                  placeholder="Search pickup location"
                  value={pickupSearchQuery}
                  onChangeText={(t) => { setActiveSearchField('pickup'); onPickupSearchChange(t); }}
                />
              </View>
            )}
          </View>
        </View>

        {/* Dropoff */}
        <View style={styles.routeRow}>
          <View style={styles.routeDotPrimary} />
          <View style={{ width: 0 }} />
          <View style={styles.routeInputArea}>
            <Text style={styles.routeLabel}>DROP-OFF</Text>
            {dropoffAddress ? (
              <TouchableOpacity onPress={onClearDropoff} style={styles.routeSetRow}>
                <Text style={styles.routeSetText} numberOfLines={2}>{dropoffAddress}</Text>
                <Text style={styles.routeChangeText}>Change</Text>
              </TouchableOpacity>
            ) : (
              <SearchInput
                placeholder="Search drop-off location"
                value={dropoffSearchQuery}
                onChangeText={(t) => { setActiveSearchField('dropoff'); onDropoffSearchChange(t); }}
              />
            )}
          </View>
        </View>
      </Card>

      {/* Search Results */}
      {(activeSearchField === 'pickup' && !pickupAddress) || (activeSearchField === 'dropoff' && !dropoffAddress) ? (
        <View style={styles.searchResultsContainer}>
          {isSearching && <ActivityIndicator size="small" color={COLORS.primary} style={styles.searchLoader} />}
          {searchResults.map((place, index) => (
            <TouchableOpacity
              key={place.id || index}
              style={styles.searchResultItem}
              onPress={() => {
                if (activeSearchField === 'pickup') onSelectPickup(place);
                else onSelectDropoff(place);
              }}
            >
              <View style={[styles.searchResultDot, { backgroundColor: activeSearchField === 'pickup' ? COLORS.secondaryFixedDim : COLORS.primary }]} />
              <Text style={styles.searchResultText} numberOfLines={2}>
                {place.place_name}
              </Text>
            </TouchableOpacity>
          ))}
          {!isSearching && ((activeSearchField === 'pickup' ? pickupSearchQuery : dropoffSearchQuery).length >= 3) && searchResults.length === 0 && (
            <Text style={styles.noResultsText}>No results found</Text>
          )}
        </View>
      ) : null}

      {/* Package Description */}
      <Text style={styles.sectionTitle}>Package Description</Text>
      <Card variant="raised" radius={RADIUS.lg} style={styles.descriptionCard}>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe what you are sending (e.g. documents, small box, electronics)"
          placeholderTextColor={COLORS.outlineVariant}
          value={packageDescription}
          onChangeText={setPackageDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </Card>

      {/* Continue CTA */}
      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={{ marginTop: SPACING.lg }}>
        <GradientButton
          title="Continue"
          onPress={onContinue}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canContinue}
          icon={<Ionicons name="arrow-forward" size={18} color={canContinue ? COLORS.onPrimary : COLORS.outline} />}
        />
      </Animated.View>

      <View style={{ height: SPACING.xl }} />
    </View>
  );
}

// ============================================
// STEP 3: CONFIRM & PAY
// ============================================

function StepConfirm({
  deliveryOption,
  pickupAddress,
  dropoffAddress,
  packageDescription,
  distanceKm,
  estimatedFare,
  paymentMethod,
  setPaymentMethod,
  isSubmitting,
  error,
  onSubmit,
}: {
  deliveryOption: DeliveryOption;
  pickupAddress: string;
  dropoffAddress: string;
  packageDescription: string;
  distanceKm: number | null;
  estimatedFare: number | null;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.stepContainer}>
      {/* Route Summary (compact) */}
      <Card variant="elevated" radius={RADIUS.lg} style={styles.summaryRouteCard}>
        <View style={styles.summaryRouteRow}>
          <View style={styles.summaryRouteDots}>
            <View style={styles.summaryDotGreen} />
            <View style={styles.summaryDashedLine} />
            <View style={styles.summaryDotPrimary} />
          </View>
          <View style={styles.summaryRouteTexts}>
            <View style={styles.summaryRouteTextBlock}>
              <Text style={styles.summaryRouteLabel}>Pickup</Text>
              <Text style={styles.summaryRouteValue} numberOfLines={1}>{pickupAddress}</Text>
            </View>
            <View style={styles.summaryRouteTextBlock}>
              <Text style={styles.summaryRouteLabel}>Drop-off</Text>
              <Text style={styles.summaryRouteValue} numberOfLines={1}>{dropoffAddress}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Delivery Details Card */}
      <Card variant="raised" radius={RADIUS.lg} style={styles.detailsCard}>
        {/* Service type row */}
        <View style={styles.detailRow}>
          <View style={styles.detailIconCircle}>
            <Ionicons name={deliveryOption.icon} size={18} color={COLORS[deliveryOption.colorKey]} />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailLabel}>Delivery Type</Text>
            <Text style={styles.detailValue}>{deliveryOption.name}</Text>
          </View>
          <View style={[styles.detailBadge, { backgroundColor: `${COLORS[deliveryOption.colorKey]}15` }]}>
            <Text style={[styles.detailBadgeText, { color: COLORS[deliveryOption.colorKey] }]}>{deliveryOption.label}</Text>
          </View>
        </View>

        {packageDescription ? (
          <View style={styles.detailRow}>
            <View style={styles.detailIconCircle}>
              <Ionicons name="cube" size={18} color={COLORS.tertiary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Package</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{packageDescription}</Text>
            </View>
          </View>
        ) : null}

        {distanceKm !== null && (
          <View style={styles.detailRow}>
            <View style={styles.detailIconCircle}>
              <Ionicons name="map" size={18} color={COLORS.secondary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Distance</Text>
              <Text style={styles.detailValue}>{distanceKm.toFixed(1)} km</Text>
            </View>
          </View>
        )}

        <View style={styles.detailRow}>
          <View style={styles.detailIconCircle}>
            <Ionicons name="time" size={18} color={COLORS.warning} />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailLabel}>Est. Time</Text>
            <Text style={styles.detailValue}>{deliveryOption.estimatedTime}</Text>
          </View>
        </View>
      </Card>

      {/* Price Estimate Card */}
      <Card variant="elevated" radius={RADIUS.lg} style={styles.priceCard}>
        <View style={styles.priceHeader}>
          <Ionicons name="wallet" size={20} color={COLORS.primary} />
          <Text style={styles.priceTitle}>Price Estimate</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Base fare</Text>
          <Text style={styles.priceValue}>UGX {DELIVERY_FARE.BASE_FARE.toLocaleString()}</Text>
        </View>
        {distanceKm !== null && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Distance fare ({distanceKm.toFixed(1)} km)</Text>
            <Text style={styles.priceValue}>UGX {Math.round(distanceKm * DELIVERY_FARE.PER_KM).toLocaleString()}</Text>
          </View>
        )}
        <View style={styles.priceDivider} />
        <View style={styles.priceRow}>
          <Text style={styles.totalLabel}>Total Estimate</Text>
          <Text style={styles.totalValue}>UGX {(estimatedFare ?? 0).toLocaleString()}</Text>
        </View>
      </Card>

      {/* Payment Method */}
      <Text style={styles.sectionTitle}>Payment Method</Text>
      <View style={styles.paymentContainer}>
        {PAYMENT_METHODS.map((method) => {
          const isSelected = paymentMethod === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentCard,
                isSelected && styles.paymentCardSelected,
              ]}
              onPress={() => setPaymentMethod(method.id as PaymentMethod)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.paymentRadio,
                  isSelected && styles.paymentRadioSelected,
                ]}
              >
                {isSelected && <View style={styles.paymentRadioInner} />}
              </View>
              <Text style={[styles.paymentName, isSelected && styles.paymentNameSelected]}>
                {method.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={16} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Request Delivery CTA */}
      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={{ marginTop: SPACING.lg }}>
        <GradientButton
          title="Request Delivery"
          onPress={onSubmit}
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          disabled={isSubmitting}
          icon={!isSubmitting ? <Ionicons name="send" size={18} color={COLORS.onPrimary} /> : undefined}
        />
      </Animated.View>

      <View style={{ height: SPACING.xl }} />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  progressWrap: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.gutter,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Step indicators

  // Content
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: SPACING.containerMargin,
  },

  // Section title
  sectionTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  sectionDescription: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
  },

  // ==========================================
  // STEP 1: Service Type
  // ==========================================
  // Service list cards (Stitch vertical layout)
  serviceListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  serviceListCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  serviceListIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceListContent: {
    flex: 1,
  },
  serviceListNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  serviceListName: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  serviceListNameActive: {
    color: COLORS.primary,
  },
  serviceListDesc: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  serviceListFare: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onSurface,
    textAlign: 'right',
  },
  serviceListFareActive: {
    color: COLORS.primary,
  },
  recommendedBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  recommendedText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onPrimary,
    fontWeight: '700',
    fontSize: 9,
  },

  // Package Size
  packageSizeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  packageSizeCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
  },
  packageSizeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  packageSizeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  packageSizeIconCircleSelected: {
    backgroundColor: `${COLORS.primary}20`,
  },
  packageSizeLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurfaceVariant,
  },
  packageSizeLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  packageSizeMax: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginTop: 1,
  },

  // Price Estimate Card
  priceEstimateCard: {
    marginBottom: SPACING.lg,
  },
  priceEstimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  priceEstimateTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  priceEstimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  priceEstimateLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  priceEstimateValue: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  priceEstimateDivider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
    marginVertical: SPACING.sm,
  },
  priceEstimateNote: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    fontStyle: 'italic',
  },

  // ==========================================
  // STEP 2: Route Card
  // ==========================================
  routeCard: {
    marginBottom: SPACING.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeDotGreen: {
    width: 14,
    height: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondaryFixedDim,
    marginRight: SPACING.md,
    marginTop: 4,
  },
  routeDotPrimary: {
    width: 14,
    height: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.md,
    marginTop: 14,
  },
  routeLineDashed: {
    position: 'absolute',
    left: 6,
    top: 20,
    width: 2,
    height: 28,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.outlineVariant,
    borderStyle: 'dashed',
  },
  routeInputArea: {
    flex: 1,
  },
  routeLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  routeSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeSetText: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    marginRight: SPACING.sm,
  },
  routeChangeText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '600',
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}12`,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
    gap: SPACING.xs,
  },
  currentLocationLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  orText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outlineVariant,
    marginBottom: SPACING.xs,
  },

  // Search Results
  searchResultsContainer: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.containerMargin,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    maxHeight: 200,
    overflow: 'hidden',
  },
  searchLoader: {
    marginVertical: SPACING.sm,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  searchResultDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    marginRight: SPACING.md,
  },
  searchResultText: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
  },
  noResultsText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },

  // Description Card
  descriptionCard: {
    marginBottom: SPACING.sm,
  },
  descriptionInput: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    minHeight: 80,
    paddingVertical: SPACING.sm,
  },

  // ==========================================
  // STEP 3: Confirm
  // ==========================================

  // Summary Route Card
  summaryRouteCard: {
    marginBottom: SPACING.md,
  },
  summaryRouteRow: {
    flexDirection: 'row',
  },
  summaryRouteDots: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  summaryDotGreen: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondaryFixedDim,
  },
  summaryDashedLine: {
    width: 2,
    height: 28,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.outlineVariant,
    marginVertical: SPACING.xs,
  },
  summaryDotPrimary: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  summaryRouteTexts: {
    flex: 1,
  },
  summaryRouteTextBlock: {
    marginBottom: SPACING.sm,
  },
  summaryRouteLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outlineVariant,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  summaryRouteValue: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
  },

  // Details Card
  detailsCard: {
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailIconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  detailValue: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  detailBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  detailBadgeText: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '700',
  },

  // Price Card
  priceCard: {
    marginBottom: SPACING.sm,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  priceTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs + 2,
  },
  priceLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  priceValue: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  priceDivider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  totalValue: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },

  // Payment
  paymentContainer: {
    gap: SPACING.sm,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
  },
  paymentCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  paymentRadio: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  paymentRadioSelected: {
    borderColor: COLORS.primary,
  },
  paymentRadioInner: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  paymentName: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  paymentNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Error
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}12`,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.error}25`,
    gap: SPACING.sm,
  },
  errorText: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.error,
  },
});
