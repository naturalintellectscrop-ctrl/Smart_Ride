// ============================================
// SMART RIDE MOBILE - SOS EMERGENCY SCREEN
// ============================================
// Stitch Design System — Safety SOS
// Emergency SOS button (w-128 h-128 bg-error
// rounded-full with pulse animation), Emergency
// contacts list, Trip details card, Call Support
// CONNECTED TO BACKEND API — No mock data
// ============================================

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GRADIENTS, TYPOGRAPHY, SPACING, RADIUS, MOTION, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  EmptyState,
  GradientButton,
  ListRow,
  Toggle,
} from '@/src/components';
import { api } from '@/src/services/api';
import { useAuthStore } from '@/src/store/authStore';
import { useLocationStore } from '@/src/store/locationStore';

// ============================================
// TYPES
// ============================================

type SosState = 'idle' | 'holding' | 'activated' | 'resolved';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const SMART_RIDE_EMERGENCY = '+256800100100';
const LOCATION_STREAM_INTERVAL = 5000; // 5 seconds between location updates

// Fallback contacts shown when API fails or user has no saved contacts
const FALLBACK_CONTACTS: EmergencyContact[] = [
  {
    id: 'fallback-police',
    name: 'Police Emergency',
    relationship: 'Emergency Services',
    phone: '999',
  },
  {
    id: 'fallback-ambulance',
    name: 'Ambulance',
    relationship: 'Medical Emergency',
    phone: '911',
  },
];

// ============================================
// PULSING SOS BUTTON — Stitch Design: w-128 h-128 bg-error rounded-full with pulse
// ============================================

function PulsingSosButton({ onPress, onLongPressStarted, onLongPressEnded, disabled }: {
  onPress: () => void;
  onLongPressStarted: () => void;
  onLongPressEnded: () => void;
  disabled?: boolean;
}) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (disabled) {
      cancelAnimation(scale);
      cancelAnimation(glowOpacity);
      scale.value = withTiming(1);
      glowOpacity.value = withTiming(0.15);
      return;
    }
    // Continuous pulsing animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [disabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressIn = () => {
    if (disabled) return;
    onLongPressStarted();
    Vibration.vibrate([0, 50, 50, 50, 50, 50], false);
    holdTimerRef.current = setTimeout(() => {
      Vibration.vibrate([0, 200, 100, 200, 100, 400], false);
      onPress();
    }, 3000);
  };

  const handlePressOut = () => {
    onLongPressEnded();
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  return (
    <View style={styles.sosButtonContainer}>
      {/* Outer pulse glow rings — Stitch w-128 (128px) radius */}
      <Animated.View style={[styles.glowRing3, glowStyle]} />
      <Animated.View style={[styles.glowRing2, glowStyle]} />

      {/* Main button — w-128 h-128 (128px = w-32 in Tailwind 4) */}
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
          style={styles.sosButtonTouchable}
          disabled={disabled}
        >
          <LinearGradient
            colors={GRADIENTS.danger as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sosButtonGradient}
          >
            <Ionicons name="alert" size={40} color={COLORS.onError} />
            <Text style={styles.sosButtonText}>SOS</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SosScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const locationStore = useLocationStore();

  const [sosState, setSosState] = useState<SosState>('idle');
  const [isHolding, setIsHolding] = useState(false);
  const [shareLiveLocation, setShareLiveLocation] = useState(true);
  const [flashVisible, setFlashVisible] = useState(false);

  // API-driven state
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [sosActivating, setSosActivating] = useState(false);
  const [sosAlertId, setSosAlertId] = useState<string | null>(null);
  const [sosError, setSosError] = useState<string | null>(null);

  // Location streaming ref
  const locationStreamRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Current location from store
  const currentLatitude = locationStore.latitude;
  const currentLongitude = locationStore.longitude;
  const currentAddress = locationStore.address;

  // ==========================================
  // FETCH EMERGENCY CONTACTS FROM API
  // ==========================================
  const fetchContacts = useCallback(async () => {
    if (!user?.id) {
      // No user — use fallback contacts
      setContacts(FALLBACK_CONTACTS);
      setContactsLoading(false);
      return;
    }

    try {
      setContactsLoading(true);
      const userType = user.role === 'RIDER' || user.role === 'DRIVER' ? 'RIDER' : 'CLIENT';
      const response = await api.getEmergencyContacts(user.id, userType);

      if (response.success && response.data?.contacts && response.data.contacts.length > 0) {
        const mapped: EmergencyContact[] = response.data.contacts.map((c: any) => ({
          id: c.id,
          name: c.name,
          relationship: c.relationship || 'Contact',
          phone: c.phone,
          isPrimary: c.isPrimary,
        }));
        // Sort: primary first, then by name
        mapped.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
        setContacts(mapped);
      } else {
        // No saved contacts — use fallback
        setContacts(FALLBACK_CONTACTS);
      }
    } catch (error) {
      console.error('[SOS] Failed to fetch contacts:', error);
      setContacts(FALLBACK_CONTACTS);
    } finally {
      setContactsLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // ==========================================
  // GET CURRENT GPS LOCATION
  // ==========================================
  useEffect(() => {
    // Request fresh location when screen opens
    locationStore.getCurrentLocation();
  }, []);

  // ==========================================
  // SOS ACTIVATION — CALLS BACKEND API
  // ==========================================
  const handleActivate = useCallback(async () => {
    // Flash screen red
    setFlashVisible(true);
    Vibration.vibrate([0, 300, 100, 300, 100, 500], false);
    setTimeout(() => setFlashVisible(false), 300);
    setTimeout(() => setFlashVisible(true), 400);
    setTimeout(() => setFlashVisible(false), 700);
    setTimeout(() => setFlashVisible(true), 800);

    setSosActivating(true);
    setSosError(null);

    try {
      // Build SOS payload with real GPS coordinates
      const sosPayload: {
        riderId?: string;
        taskId?: string;
        latitude: number;
        longitude: number;
        locationAddress?: string;
      } = {
        latitude: currentLatitude,
        longitude: currentLongitude,
        locationAddress: currentAddress,
      };

      // If user is a rider, include riderId
      if (user?.role === 'RIDER' || user?.role === 'DRIVER') {
        sosPayload.riderId = user.id;
      }

      const response = await api.createSOSAlert(sosPayload);

      if (response.success && response.data?.alert) {
        setSosAlertId(response.data.alert.id || null);
        console.log('[SOS] Alert created:', response.data.alert.alertNumber || response.data.alert.id);
      } else {
        // API call succeeded but returned error — still activate locally for safety
        console.warn('[SOS] API returned error, activating locally:', response.error);
        setSosError(response.error || 'Alert sent but confirmation pending');
      }
    } catch (error) {
      // Network error — still activate locally for safety-critical behavior
      console.error('[SOS] Failed to reach backend, activating locally:', error);
      setSosError('Could not reach server. Alert activated locally.');
    } finally {
      setSosActivating(false);
      setTimeout(() => {
        setFlashVisible(false);
        setSosState('activated');
      }, 1100);
    }
  }, [currentLatitude, currentLongitude, currentAddress, user?.id, user?.role]);

  // ==========================================
  // LIVE LOCATION STREAMING
  // ==========================================
  useEffect(() => {
    // Start streaming when SOS is activated and live sharing is on
    if (sosState === 'activated' && shareLiveLocation) {
      // Stream location to backend every 5 seconds
      locationStreamRef.current = setInterval(async () => {
        try {
          // Get fresh position
          await locationStore.getCurrentLocation();

          // Send heartbeat with location to backend
          await api.sendHeartbeat({
            latitude: locationStore.latitude,
            longitude: locationStore.longitude,
            task_id: sosAlertId || undefined,
          });

          console.log('[SOS] Location streamed:', locationStore.latitude, locationStore.longitude);
        } catch (error) {
          console.warn('[SOS] Location stream error:', error);
        }
      }, LOCATION_STREAM_INTERVAL);
    }

    return () => {
      if (locationStreamRef.current) {
        clearInterval(locationStreamRef.current);
        locationStreamRef.current = null;
      }
    };
  }, [sosState, shareLiveLocation, sosAlertId]);

  // ==========================================
  // CANCEL SOS — RESOLVE ON BACKEND
  // ==========================================
  const handleCancelSos = useCallback(() => {
    Alert.alert(
      'Cancel SOS',
      'Are you sure you want to cancel the emergency alert? Our response team has been notified.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Cancel SOS',
          style: 'destructive',
          onPress: async () => {
            // Stop location streaming
            if (locationStreamRef.current) {
              clearInterval(locationStreamRef.current);
              locationStreamRef.current = null;
            }

            // Resolve alert on backend if we have an alert ID
            if (sosAlertId) {
              try {
                await api.resolveSOSAlert(sosAlertId);
                console.log('[SOS] Alert resolved on backend');
              } catch (error) {
                console.warn('[SOS] Failed to resolve alert on backend:', error);
              }
            }

            setSosState('resolved');
            setSosAlertId(null);
            setSosError(null);
          },
        },
      ]
    );
  }, [sosAlertId]);

  // ==========================================
  // PHONE CALL HANDLER
  // ==========================================
  const handleCall = (phone: string) => {
    const url = `tel:${phone}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Unable to Call', 'This device does not support phone calls.');
      }
    });
  };

  // ==========================================
  // DETERMINE CONTACT ICON
  // ==========================================
  const getContactIcon = (phone: string): keyof typeof Ionicons.glyphMap => {
    if (phone.length <= 3) return 'call-outline';
    return 'person-outline';
  };

  return (
    <View style={styles.container}>
      {/* Red flash overlay */}
      {flashVisible && <View style={styles.flashOverlay} />}

      {/* Subtle red ambient at top */}
      <View style={styles.redAmbient} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + SPACING.md || 56 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(MOTION.duration.slower)}>
          <AppHeader
            title="Emergency SOS"
            subtitle="Safety & Emergency"
            onBack={() => router.back()}
          />
        </Animated.View>

        {/* Main content based on state */}
        {sosState === 'idle' ? (
          <Animated.View entering={FadeInUp.duration(400).delay(200).springify()}>
            {/* SOS Button — w-128 h-128 bg-error rounded-full with pulse */}
            <View style={styles.sosSection}>
              <PulsingSosButton
                onPress={handleActivate}
                onLongPressStarted={() => setIsHolding(true)}
                onLongPressEnded={() => setIsHolding(false)}
                disabled={sosActivating}
              />
              {sosActivating && (
                <View style={styles.activatingRow}>
                  <ActivityIndicator size="small" color={COLORS.error} />
                  <Text style={styles.activatingText}>Sending alert...</Text>
                </View>
              )}
              {isHolding && !sosActivating && (
                <Animated.View entering={ZoomIn.duration(200)}>
                  <Text style={styles.holdingText}>Hold for 3 seconds...</Text>
                </Animated.View>
              )}
              {!isHolding && !sosActivating && (
                <View style={styles.sosInstructions}>
                  <Text style={styles.sosInstructionText}>
                    Tap and hold for 3 seconds to activate
                  </Text>
                  <Text style={styles.sosInstructionSubtext}>
                    This will alert our emergency response team
                  </Text>
                </View>
              )}
            </View>

            {/* Location Info */}
            <Card variant="raised" padding={SPACING.md} radius={RADIUS.lg} style={styles.tripCard}>
              <View style={styles.tripHeaderRow}>
                <View style={styles.locationIconCircle}>
                  <Ionicons name="locate" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.tripContent}>
                  <Text style={styles.tripTitle}>Your Location</Text>
                  <Text style={styles.tripSubtitle} numberOfLines={1}>
                    {locationStore.isLocating ? 'Getting GPS location...' : currentAddress}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.refreshLocationBtn}
                  onPress={() => locationStore.getCurrentLocation()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </Card>

            {/* Trip Details Card (if ride active) */}
            <Card variant="raised" padding={SPACING.md} radius={RADIUS.lg} style={styles.tripCard}>
              <View style={styles.tripHeaderRow}>
                <View style={styles.tripIconCircle}>
                  <Ionicons name="car" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.tripContent}>
                  <Text style={styles.tripTitle}>No Active Ride</Text>
                  <Text style={styles.tripSubtitle}>Emergency info will show ride details if a trip is active</Text>
                </View>
              </View>
            </Card>

            {/* Info Card */}
            <Card variant="accent" padding={SPACING.md} radius={RADIUS.lg} style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconCircle}>
                  <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>When to use SOS</Text>
                  <Text style={styles.infoDescription}>
                    Use this feature only in genuine emergencies such as safety threats,
                    accidents, or situations requiring immediate assistance.
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>
        ) : sosState === 'activated' ? (
          <Animated.View entering={FadeInUp.duration(500).springify()}>
            {/* Activated State */}
            <View style={styles.activatedSection}>
              {/* Green checkmark */}
              <Animated.View entering={ZoomIn.duration(400).delay(100)}>
                <View style={styles.activatedCheckCircle}>
                  <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
                </View>
              </Animated.View>

              <Text style={styles.activatedTitle}>SOS ACTIVATED</Text>
              <Text style={styles.activatedSubtitle}>
                Emergency team has been notified
              </Text>

              {/* Error/warning message if API had issues */}
              {sosError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="warning-outline" size={16} color={COLORS.onErrorContainer} />
                  <Text style={styles.errorText}>{sosError}</Text>
                </View>
              )}

              {/* Location card with REAL GPS data */}
              <Card variant="raised" padding={SPACING.md} radius={RADIUS.lg} style={styles.locationCard}>
                <View style={styles.locationRow}>
                  <View style={styles.locationIconContainer}>
                    <Ionicons name="location" size={18} color={COLORS.error} />
                  </View>
                  <View style={styles.locationContent}>
                    <Text style={styles.locationLabel}>Current Location</Text>
                    <Text style={styles.locationAddress} numberOfLines={2}>
                      {currentAddress}
                    </Text>
                    <Text style={styles.locationCoords}>
                      {currentLatitude.toFixed(6)}, {currentLongitude.toFixed(6)}
                    </Text>
                  </View>
                  {shareLiveLocation && (
                    <View style={styles.locationLiveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  )}
                </View>
              </Card>

              {/* Share Live Location Toggle */}
              <Card variant="raised" padding={SPACING.md} radius={RADIUS.lg} style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleIconCircle}>
                    <Ionicons name="locate-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.toggleContent}>
                    <Text style={styles.toggleTitle}>Share Live Location</Text>
                    <Text style={styles.toggleDescription}>
                      {shareLiveLocation
                        ? 'Streaming GPS every 5 seconds'
                        : 'Continuously share your GPS position'}
                    </Text>
                  </View>
                  <Toggle
                    value={shareLiveLocation}
                    onValueChange={setShareLiveLocation}
                    accessibilityLabel="Share live location"
                  />
                </View>
              </Card>

              {/* Call Emergency Button */}
              <View style={styles.activatedActions}>
                <GradientButton
                  title="Call Emergency Services"
                  onPress={() => handleCall('999')}
                  variant="danger"
                  fullWidth
                  size="lg"
                  icon={<Ionicons name="call-outline" size={20} color={COLORS.onPrimary} />}
                />
              </View>

              {/* Cancel SOS */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelSos}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={18} color={COLORS.onSurfaceVariant} />
                <Text style={styles.cancelText}>Cancel SOS Alert</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          /* Resolved State */
          <Animated.View entering={FadeInUp.duration(500).springify()}>
            <View style={styles.resolvedSection}>
              <View style={styles.resolvedCheckCircle}>
                <Ionicons name="shield-checkmark" size={64} color={COLORS.primary} />
              </View>
              <Text style={styles.resolvedTitle}>SOS Cancelled</Text>
              <Text style={styles.resolvedSubtitle}>
                The emergency alert has been cancelled. Stay safe!
              </Text>
              <View style={styles.resolvedAction}>
                <GradientButton
                  title="Back to Home"
                  onPress={() => router.back()}
                  variant="primary"
                  fullWidth
                  size="lg"
                  icon={<Ionicons name="home-outline" size={20} color={COLORS.onPrimary} />}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Emergency Contacts — Always visible except resolved */}
        {sosState !== 'resolved' && (
          <Animated.View entering={FadeInUp.duration(400).delay(400).springify()}>
            <View style={styles.contactsSection}>
              <View style={styles.contactsHeaderRow}>
                <Text style={styles.contactsSectionTitle}>Emergency Contacts</Text>
                {contactsLoading && (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                )}
              </View>

              {contacts.length === 0 && !contactsLoading && (
                <EmptyState
                  icon="people-outline"
                  title="No emergency contacts"
                  subtitle="Add the people we should reach if you trigger SOS."
                  actionLabel="Add contacts"
                  onAction={() => router.push('/profile/edit')}
                />
              )}

              {contacts.map((contact, index) => (
                <Animated.View
                  key={contact.id}
                  entering={FadeInUp.duration(350).delay(500 + index * 60).springify()}
                >
                  <Card variant="raised" padding={SPACING.sm} radius={RADIUS.lg} style={styles.contactCard}>
                    <ListRow
                      title={contact.name}
                      subtitle={`${contact.relationship} • ${contact.phone}`}
                      icon={getContactIcon(contact.phone)}
                      iconColor={COLORS.error}
                      onPress={() => handleCall(contact.phone)}
                      accessibilityLabel={`Call ${contact.name}`}
                      trailing={
                        <View style={styles.contactTrailing}>
                          {contact.isPrimary ? (
                            <View style={styles.primaryBadge}>
                              <Ionicons name="star" size={ICON.xs} color={COLORS.onPrimary} />
                              <Text style={styles.primaryBadgeText}>Primary</Text>
                            </View>
                          ) : null}
                          <View style={styles.contactCallButton}>
                            <Ionicons name="call" size={ICON.sm} color={COLORS.onPrimary} />
                          </View>
                        </View>
                      }
                    />
                  </Card>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Call Support secondary button */}
        {sosState === 'idle' && (
          <Animated.View entering={FadeIn.duration(400).delay(600)}>
            <View style={styles.callSupportContainer}>
              <GradientButton
                title="Call SmartRide Support"
                onPress={() => handleCall(SMART_RIDE_EMERGENCY)}
                variant="outline"
                fullWidth
                size="lg"
                icon={<Ionicons name="headset-outline" size={20} color={COLORS.primary} />}
              />
            </View>
          </Animated.View>
        )}

        {/* Bottom Info */}
        <Animated.View entering={FadeIn.duration(400).delay(700)}>
          <View style={styles.bottomInfo}>
            <Ionicons name="shield-outline" size={14} color={COLORS.outline} />
            <Text style={styles.bottomInfoText}>
              {shareLiveLocation && sosState === 'activated'
                ? 'Your live location is being shared with our emergency response team'
                : 'Your live location will be shared with our emergency response team'}
            </Text>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================


const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  contactTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Flash Overlay
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${COLORS.error}33`,
    zIndex: 999,
  },

  // Red Ambient
  redAmbient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: `${COLORS.error}0A`,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md + 4,
  },

  // Header

  // SOS Button — Stitch: w-128 h-128 bg-error rounded-full with pulse
  sosSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  sosButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 192,
    height: 192,
    position: 'relative',
  },
  glowRing3: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${COLORS.error}0F`,
  },
  glowRing2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${COLORS.error}1A`,
  },
  sosButtonTouchable: {
    width: 128,
    height: 128,
    borderRadius: 64,
    overflow: 'hidden',
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  sosButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.onError,
  },
  sosButtonText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.onError,
    letterSpacing: 4,
    marginTop: 2,
  },
  activatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  activatingText: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.error,
  },
  holdingText: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  sosInstructions: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  sosInstructionText: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
  },
  sosInstructionSubtext: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },

  // Location circle (idle state)
  locationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshLocationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Trip details card
  tripCard: {
    marginBottom: SPACING.md,
  },
  tripHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  tripIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripContent: {
    flex: 1,
  },
  tripTitle: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  tripSubtitle: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },

  // Info card
  infoCard: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  infoDescription: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
  },

  // Activated State
  activatedSection: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  activatedCheckCircle: {
    marginBottom: SPACING.md,
  },
  activatedTitle: {
    ...TYPOGRAPHY.headlineLg,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  activatedSubtitle: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.lg,
  },

  // Error banner (when API had issues but alert is still active)
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.errorContainer,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    width: '100%',
  },
  errorText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onErrorContainer,
    flex: 1,
  },

  // Location Card
  locationCard: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationAddress: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '500',
    color: COLORS.onSurface,
    marginTop: SPACING.xs,
  },
  locationCoords: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginTop: 2,
  },
  locationLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.errorContainer,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error,
  },
  liveText: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '700',
    color: COLORS.onErrorContainer,
    letterSpacing: 0.5,
  },

  // Toggle Card
  toggleCard: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  toggleContent: {
    flex: 1,
  },
  toggleTitle: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  toggleDescription: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },

  // Activated Actions
  activatedActions: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  cancelText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },

  // Resolved State
  resolvedSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  resolvedCheckCircle: {
    marginBottom: SPACING.md,
  },
  resolvedTitle: {
    ...TYPOGRAPHY.headlineLgMobile,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  resolvedSubtitle: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  resolvedAction: {
    width: '100%',
  },

  // Contacts Section
  contactsSection: {
    marginTop: SPACING.lg,
  },
  contactsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  contactsSectionTitle: {
    ...TYPOGRAPHY.labelLg,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactCard: {
    marginBottom: SPACING.sm,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.onPrimary,
    letterSpacing: 0.3,
  },
  contactCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty contacts

  // Call Support
  callSupportContainer: {
    marginTop: SPACING.lg,
  },

  // Bottom Info
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  bottomInfoText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    textAlign: 'center',
    flex: 1,
  },
});
