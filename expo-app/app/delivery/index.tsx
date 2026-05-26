// ============================================
// SMART RIDE MOBILE - DELIVERY SCREEN
// ============================================
// Rewritten to use REAL APIs for parcel delivery
// Step-based flow: Delivery Type → Locations → Confirm & Pay
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useLocationStore, useTaskStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, PAYMENT_METHODS } from '@/src/constants';
import { PaymentMethod } from '@/src/types';

// ============================================
// TYPES
// ============================================

type DeliveryType = 'BODA' | 'CAR' | 'STANDARD';
type Step = 'type' | 'locations' | 'confirm';

interface DeliveryOption {
  id: DeliveryType;
  name: string;
  description: string;
  label: string;
  vehicleLabel: string;
  estimatedTime: string;
}

interface PlaceResult {
  id: string;
  place_name: string;
  center: [number, number];
  text?: string;
}

// ============================================
// CONSTANTS
// ============================================

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'BODA',
    name: 'Boda Delivery',
    description: 'Small packages, documents, envelopes',
    label: 'BODA',
    vehicleLabel: 'Motorcycle',
    estimatedTime: '15-30 min',
  },
  {
    id: 'CAR',
    name: 'Car Delivery',
    description: 'Larger packages, multiple items',
    label: 'CAR',
    vehicleLabel: 'Car',
    estimatedTime: '30-45 min',
  },
  {
    id: 'STANDARD',
    name: 'Standard Delivery',
    description: 'Scheduled delivery, bulk items',
    label: 'STANDARD',
    vehicleLabel: 'Van/Truck',
    estimatedTime: '1-3 hours',
  },
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
  const R = 6371; // Earth radius in km
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
  const router = useRouter();
  const { user } = useAuthStore();
  const { latitude, longitude, address, getCurrentLocation } = useLocationStore();
  const { setPendingTask } = useTaskStore();

  // Step
  const [step, setStep] = useState<Step>('type');

  // Delivery type
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('BODA');

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

      // Debounce the search
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
  // CLEAR LOCATIONS (for Change button)
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

      // Calculate fare immediately if pickup is set
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

    // Calculate fare if not already done
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
        paymentMethod,
        packageDescription,
        deliveryType,
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Parcel Delivery</Text>
          <Text style={styles.headerSubtitle}>
            {step === 'type'
              ? 'Step 1: Choose delivery type'
              : step === 'locations'
              ? 'Step 2: Set locations'
              : 'Step 3: Confirm & pay'}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Step Indicators */}
      <View style={styles.stepIndicatorContainer}>
        {(['type', 'locations', 'confirm'] as Step[]).map((s, i) => (
          <View key={s} style={styles.stepRow}>
            <View
              style={[
                styles.stepDot,
                step === s && styles.stepDotActive,
                step === 'confirm' && s !== 'type' && s !== 'locations' && styles.stepDotActive,
                (step === 'locations' && (s === 'type')) && styles.stepDotCompleted,
                (step === 'confirm' && (s === 'type' || s === 'locations')) && styles.stepDotCompleted,
              ]}
            />
            {i < 2 && (
              <View
                style={[
                  styles.stepLine,
                  (step === 'locations' && i === 0) && styles.stepLineCompleted,
                  (step === 'confirm' && i < 2) && styles.stepLineCompleted,
                ]}
              />
            )}
          </View>
        ))}
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
            onSelectType={setDeliveryType}
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
// STEP 1: DELIVERY TYPE
// ============================================

function StepType({
  deliveryType,
  onSelectType,
  onContinue,
}: {
  deliveryType: DeliveryType;
  onSelectType: (type: DeliveryType) => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Delivery Type</Text>
      <Text style={styles.stepDescription}>
        Choose the vehicle type based on your package size
      </Text>

      {DELIVERY_OPTIONS.map((option) => {
        const isSelected = deliveryType === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.typeCard, isSelected && styles.typeCardSelected]}
            onPress={() => onSelectType(option.id)}
            activeOpacity={0.7}
          >
            {/* Vehicle icon area */}
            <View
              style={[
                styles.typeIconContainer,
                isSelected && styles.typeIconContainerSelected,
              ]}
            >
              <Text style={styles.typeIconLabel}>{option.label}</Text>
            </View>

            {/* Info */}
            <View style={styles.typeInfo}>
              <Text style={[styles.typeName, isSelected && styles.typeNameSelected]}>
                {option.name}
              </Text>
              <Text style={styles.typeDescription}>{option.description}</Text>
              <Text style={styles.typeVehicle}>{option.vehicleLabel}</Text>
            </View>

            {/* Time & indicator */}
            <View style={styles.typeRight}>
              <Text style={styles.typeTime}>{option.estimatedTime}</Text>
              <View
                style={[
                  styles.typeRadio,
                  isSelected && styles.typeRadioSelected,
                ]}
              >
                {isSelected && <View style={styles.typeRadioInner} />}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Fare info */}
      <View style={styles.fareInfoCard}>
        <Text style={styles.fareInfoTitle}>Delivery Fare Structure</Text>
        <View style={styles.fareInfoRow}>
          <Text style={styles.fareInfoLabel}>Base fare</Text>
          <Text style={styles.fareInfoValue}>UGX {DELIVERY_FARE.BASE_FARE.toLocaleString()}</Text>
        </View>
        <View style={styles.fareInfoRow}>
          <Text style={styles.fareInfoLabel}>Per km</Text>
          <Text style={styles.fareInfoValue}>UGX {DELIVERY_FARE.PER_KM.toLocaleString()}</Text>
        </View>
      </View>

      {/* Continue */}
      <TouchableOpacity style={styles.primaryButton} onPress={onContinue} activeOpacity={0.8}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
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
  const canContinue = pickupAddress.length > 0 && dropoffAddress.length > 0;

  return (
    <View style={styles.stepContainer}>
      {/* Pickup Section */}
      <Text style={styles.sectionLabel}>PICKUP LOCATION</Text>
      <View style={styles.locationCard}>
        <View style={styles.locationDotGreen} />
        {pickupAddress ? (
          <TouchableOpacity
            style={styles.locationSetRow}
            onPress={onClearPickup}
          >
            <Text style={styles.locationSetText} numberOfLines={2}>
              {pickupAddress}
            </Text>
            <Text style={styles.locationChangeText}>Change</Text>
          </TouchableOpacity>
        ) : (
          <View>
            {/* Use current location */}
            <TouchableOpacity style={styles.currentLocationButton} onPress={onUseCurrentLocation}>
              <Text style={styles.currentLocationLabel}>Use Current Location</Text>
            </TouchableOpacity>

            {/* Or search */}
            <Text style={styles.orText}>or search for a pickup point</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search pickup location..."
              placeholderTextColor={COLORS.textMuted}
              value={pickupSearchQuery}
              onChangeText={onPickupSearchChange}
              onFocus={() => setActiveSearchField('pickup')}
            />
          </View>
        )}
      </View>

      {/* Pickup search results */}
      {activeSearchField === 'pickup' && !pickupAddress && (
        <View style={styles.searchResultsContainer}>
          {isSearching && <ActivityIndicator size="small" color={COLORS.primary} style={styles.searchLoader} />}
          {searchResults.map((place, index) => (
            <TouchableOpacity
              key={place.id || index}
              style={styles.searchResultItem}
              onPress={() => onSelectPickup(place)}
            >
              <View style={styles.searchResultDot} />
              <Text style={styles.searchResultText} numberOfLines={2}>
                {place.place_name}
              </Text>
            </TouchableOpacity>
          ))}
          {!isSearching && pickupSearchQuery.length >= 3 && searchResults.length === 0 && (
            <Text style={styles.noResultsText}>No results found</Text>
          )}
        </View>
      )}

      {/* Dropoff Section */}
      <Text style={[styles.sectionLabel, { marginTop: 16 }]}>DROP-OFF LOCATION</Text>
      <View style={styles.locationCard}>
        <View style={styles.locationDotPrimary} />
        {dropoffAddress ? (
          <TouchableOpacity
            style={styles.locationSetRow}
            onPress={onClearDropoff}
          >
            <Text style={styles.locationSetText} numberOfLines={2}>
              {dropoffAddress}
            </Text>
            <Text style={styles.locationChangeText}>Change</Text>
          </TouchableOpacity>
        ) : (
          <TextInput
            style={styles.searchInput}
            placeholder="Search drop-off location..."
            placeholderTextColor={COLORS.textMuted}
            value={dropoffSearchQuery}
            onChangeText={onDropoffSearchChange}
            onFocus={() => setActiveSearchField('dropoff')}
          />
        )}
      </View>

      {/* Dropoff search results */}
      {activeSearchField === 'dropoff' && !dropoffAddress && (
        <View style={styles.searchResultsContainer}>
          {isSearching && <ActivityIndicator size="small" color={COLORS.primary} style={styles.searchLoader} />}
          {searchResults.map((place, index) => (
            <TouchableOpacity
              key={place.id || index}
              style={styles.searchResultItem}
              onPress={() => onSelectDropoff(place)}
            >
              <View style={[styles.searchResultDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.searchResultText} numberOfLines={2}>
                {place.place_name}
              </Text>
            </TouchableOpacity>
          ))}
          {!isSearching && dropoffSearchQuery.length >= 3 && searchResults.length === 0 && (
            <Text style={styles.noResultsText}>No results found</Text>
          )}
        </View>
      )}

      {/* Package Description */}
      <Text style={[styles.sectionLabel, { marginTop: 16 }]}>PACKAGE DESCRIPTION</Text>
      <View style={styles.descriptionCard}>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe what you are sending (e.g. documents, small box, electronics)"
          placeholderTextColor={COLORS.textMuted}
          value={packageDescription}
          onChangeText={setPackageDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Continue */}
      <TouchableOpacity
        style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
        onPress={onContinue}
        disabled={!canContinue}
        activeOpacity={0.8}
      >
        <Text style={[styles.primaryButtonText, !canContinue && styles.primaryButtonTextDisabled]}>
          Continue
        </Text>
      </TouchableOpacity>
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
  return (
    <View style={styles.stepContainer}>
      {/* Delivery Summary */}
      <Text style={styles.stepTitle}>Delivery Summary</Text>

      <View style={styles.summaryCard}>
        {/* Delivery type */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Type</Text>
          <View style={styles.summaryValueRow}>
            <View style={[styles.summaryBadge, { backgroundColor: `${COLORS.primary}20` }]}>
              <Text style={styles.summaryBadgeText}>{deliveryOption.label}</Text>
            </View>
            <Text style={styles.summaryValue}>{deliveryOption.name}</Text>
          </View>
        </View>

        {/* Vehicle */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Vehicle</Text>
          <Text style={styles.summaryValue}>{deliveryOption.vehicleLabel}</Text>
        </View>

        {/* Estimated Time */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Est. Time</Text>
          <Text style={styles.summaryValue}>{deliveryOption.estimatedTime}</Text>
        </View>

        {/* Divider */}
        <View style={styles.summaryDivider} />

        {/* Route */}
        <View style={styles.routeSection}>
          <View style={styles.routeRow}>
            <View style={styles.routeDotGreen} />
            <View style={styles.routeLineVertical} />
          </View>
          <View style={styles.routeTexts}>
            <View style={styles.routeTextRow}>
              <Text style={styles.routeTextLabel}>Pickup</Text>
              <Text style={styles.routeTextValue} numberOfLines={2}>
                {pickupAddress}
              </Text>
            </View>
            <View style={styles.routeTextRow}>
              <Text style={styles.routeTextLabel}>Drop-off</Text>
              <Text style={styles.routeTextValue} numberOfLines={2}>
                {dropoffAddress}
              </Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.summaryDivider} />

        {/* Package */}
        {packageDescription ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Package</Text>
            <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
              {packageDescription}
            </Text>
          </View>
        ) : null}

        {/* Distance */}
        {distanceKm !== null && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>{distanceKm.toFixed(1)} km</Text>
          </View>
        )}

        {/* Fare Breakdown */}
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Base fare</Text>
          <Text style={styles.summaryValue}>UGX {DELIVERY_FARE.BASE_FARE.toLocaleString()}</Text>
        </View>
        {distanceKm !== null && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Distance fare</Text>
            <Text style={styles.summaryValue}>
              UGX {Math.round(distanceKm * DELIVERY_FARE.PER_KM).toLocaleString()}
            </Text>
          </View>
        )}
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total Estimate</Text>
          <Text style={styles.totalValue}>
            UGX {(estimatedFare ?? 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Payment Method */}
      <Text style={[styles.sectionLabel, { marginTop: 16 }]}>PAYMENT METHOD</Text>
      <View style={styles.paymentContainer}>
        {PAYMENT_METHODS.map((method) => {
          const isSelected = paymentMethod === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[styles.paymentCard, isSelected && styles.paymentCardSelected]}
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
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
        onPress={onSubmit}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={COLORS.background} />
        ) : (
          <Text style={styles.primaryButtonText}>Request Delivery</Text>
        )}
      </TouchableOpacity>

      {/* Bottom spacing */}
      <View style={{ height: 40 }} />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },

  // Step indicators
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.backgroundSurface,
    borderWidth: 1.5,
    borderColor: COLORS.textDisabled,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.backgroundSurface,
    marginHorizontal: 4,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.primary,
  },

  // Content
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stepDescription: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 20,
  },

  // Type cards
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  typeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  typeIconContainerSelected: {
    backgroundColor: `${COLORS.primary}20`,
  },
  typeIconLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  typeNameSelected: {
    color: COLORS.primary,
  },
  typeDescription: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  typeVehicle: {
    color: COLORS.textDisabled,
    fontSize: 11,
  },
  typeRight: {
    alignItems: 'flex-end',
  },
  typeTime: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 8,
  },
  typeRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.textDisabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeRadioSelected: {
    borderColor: COLORS.primary,
  },
  typeRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  // Fare info card
  fareInfoCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fareInfoTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  fareInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fareInfoLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  fareInfoValue: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Section label
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  // Location card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationDotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00FF88',
    marginRight: 12,
    marginTop: 4,
  },
  locationDotPrimary: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    marginRight: 12,
    marginTop: 14,
  },

  // Location set (already chosen)
  locationSetRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationSetText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    marginRight: 8,
  },
  locationChangeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Current location button
  currentLocationButton: {
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  currentLocationLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  orText: {
    color: COLORS.textDisabled,
    fontSize: 12,
    marginBottom: 8,
  },

  // Search input
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },

  // Search results
  searchResultsContainer: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
    overflow: 'hidden',
  },
  searchLoader: {
    marginVertical: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchResultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    marginRight: 10,
  },
  searchResultText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  noResultsText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },

  // Description
  descriptionCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  descriptionInput: {
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 80,
  },

  // Primary button
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButtonTextDisabled: {
    color: COLORS.backgroundSurface,
  },

  // Summary card
  summaryCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  summaryBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  // Route section
  routeSection: {
    flexDirection: 'row',
  },
  routeRow: {
    alignItems: 'center',
    marginRight: 12,
  },
  routeDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00FF88',
  },
  routeLineVertical: {
    width: 2,
    height: 30,
    backgroundColor: COLORS.textDisabled,
  },
  routeTexts: {
    flex: 1,
    justifyContent: 'space-between',
  },
  routeTextRow: {
    marginBottom: 6,
  },
  routeTextLabel: {
    color: COLORS.textDisabled,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  routeTextValue: {
    color: COLORS.text,
    fontSize: 13,
  },

  // Total
  totalLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  totalValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Payment
  paymentContainer: {
    gap: 10,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  paymentCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.textDisabled,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentRadioSelected: {
    borderColor: COLORS.primary,
  },
  paymentRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  paymentName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  paymentNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Error
  errorCard: {
    backgroundColor: `${COLORS.error}15`,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    textAlign: 'center',
  },
});
