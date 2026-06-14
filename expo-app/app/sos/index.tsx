// ============================================
// SMART RIDE MOBILE - SOS EMERGENCY SCREEN
// ============================================
// Stitch Design System — Safety SOS
// Emergency SOS button (w-128 h-128 bg-error
// rounded-full with pulse animation), Emergency
// contacts list, Trip details card, Call Support
// ============================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Linking,
  Alert,
  Vibration,
  Dimensions,
} from 'react-native';
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
import { COLORS, GRADIENTS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { GlassCard, GradientButton } from '@/src/components';

// ============================================
// TYPES
// ============================================

type SosState = 'idle' | 'holding' | 'activated' | 'resolved';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

// ============================================
// MOCK DATA
// ============================================

const MOCK_CONTACTS: EmergencyContact[] = [
  {
    id: '1',
    name: 'Police Emergency',
    relationship: 'Emergency Services',
    phone: '999',
  },
  {
    id: '2',
    name: 'Ambulance',
    relationship: 'Medical Emergency',
    phone: '911',
  },
  {
    id: '3',
    name: 'Sarah Nakamya',
    relationship: 'Spouse',
    phone: '+256700123456',
  },
  {
    id: '4',
    name: 'James Okello',
    relationship: 'Brother',
    phone: '+256700654321',
  },
];

const SMART_RIDE_EMERGENCY = '+256800100100';

// ============================================
// PULSING SOS BUTTON — Stitch Design: w-128 h-128 bg-error rounded-full with pulse
// ============================================

function PulsingSosButton({ onPress, onLongPressStarted, onLongPressEnded }: {
  onPress: () => void;
  onLongPressStarted: () => void;
  onLongPressEnded: () => void;
}) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
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
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressIn = () => {
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sosState, setSosState] = useState<SosState>('idle');
  const [isHolding, setIsHolding] = useState(false);
  const [shareLiveLocation, setShareLiveLocation] = useState(true);
  const [flashVisible, setFlashVisible] = useState(false);

  const handleActivate = () => {
    // Flash screen red
    setFlashVisible(true);
    Vibration.vibrate([0, 300, 100, 300, 100, 500], false);
    setTimeout(() => setFlashVisible(false), 300);
    setTimeout(() => setFlashVisible(true), 400);
    setTimeout(() => setFlashVisible(false), 700);
    setTimeout(() => setFlashVisible(true), 800);
    setTimeout(() => {
      setFlashVisible(false);
      setSosState('activated');
    }, 1100);
  };

  const handleCancelSos = () => {
    Alert.alert(
      'Cancel SOS',
      'Are you sure you want to cancel the emergency alert? Our response team has been notified.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Cancel SOS',
          style: 'destructive',
          onPress: () => setSosState('resolved'),
        },
      ]
    );
  };

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
        {/* Header — Stitch: simple with back arrow */}
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Emergency SOS</Text>
              <Text style={styles.headerSubtitle}>Safety & Emergency</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>
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
              />
              {isHolding && (
                <Animated.View entering={ZoomIn.duration(200)}>
                  <Text style={styles.holdingText}>Hold for 3 seconds...</Text>
                </Animated.View>
              )}
              {!isHolding && (
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

            {/* Trip Details Card (if ride active) */}
            <GlassCard variant="default" padding={SPACING.md} borderRadius={RADIUS.xl} style={styles.tripCard}>
              <View style={styles.tripHeaderRow}>
                <View style={styles.tripIconCircle}>
                  <Ionicons name="car" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.tripContent}>
                  <Text style={styles.tripTitle}>No Active Ride</Text>
                  <Text style={styles.tripSubtitle}>Emergency info will show ride details if a trip is active</Text>
                </View>
              </View>
            </GlassCard>

            {/* Info Card */}
            <GlassCard variant="accent" padding={SPACING.md} borderRadius={RADIUS.xl} style={styles.infoCard}>
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
            </GlassCard>
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

              {/* Trip details card */}
              <GlassCard variant="default" padding={SPACING.md} borderRadius={RADIUS.xl} style={styles.locationCard}>
                <View style={styles.locationRow}>
                  <View style={styles.locationIconContainer}>
                    <Ionicons name="location" size={18} color={COLORS.error} />
                  </View>
                  <View style={styles.locationContent}>
                    <Text style={styles.locationLabel}>Current Location</Text>
                    <Text style={styles.locationAddress}>Kampala Road, Kampala, Uganda</Text>
                  </View>
                  <View style={styles.locationLiveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>
              </GlassCard>

              {/* Share Live Location Toggle */}
              <GlassCard variant="default" padding={SPACING.md} borderRadius={RADIUS.xl} style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleIconCircle}>
                    <Ionicons name="locate-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.toggleContent}>
                    <Text style={styles.toggleTitle}>Share Live Location</Text>
                    <Text style={styles.toggleDescription}>
                      Continuously share your GPS position
                    </Text>
                  </View>
                  <Switch
                    value={shareLiveLocation}
                    onValueChange={setShareLiveLocation}
                    trackColor={{ false: COLORS.surfaceContainerHigh, true: COLORS.primary }}
                    thumbColor={shareLiveLocation ? COLORS.surfaceContainerLowest : COLORS.outlineVariant}
                  />
                </View>
              </GlassCard>

              {/* Call Emergency Button */}
              <View style={styles.activatedActions}>
                <GradientButton
                  title="Call Emergency Services"
                  onPress={() => handleCall('999')}
                  variant="danger"
                  fullWidth
                  size="lg"
                  icon={<Ionicons name="call-outline" size={20} color="#FFFFFF" />}
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
              <Text style={styles.contactsSectionTitle}>Emergency Contacts</Text>

              {MOCK_CONTACTS.map((contact, index) => (
                <Animated.View
                  key={contact.id}
                  entering={FadeInUp.duration(350).delay(500 + index * 60).springify()}
                >
                  <GlassCard variant="default" padding={SPACING.md} borderRadius={RADIUS.xl} style={styles.contactCard}>
                    <View style={styles.contactRow}>
                      <View style={styles.contactIconCircle}>
                        <Ionicons
                          name={contact.phone.length <= 3 ? 'call-outline' : 'person-outline'}
                          size={18}
                          color={COLORS.error}
                        />
                      </View>
                      <View style={styles.contactContent}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactRelationship}>
                          {contact.relationship} • {contact.phone}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.contactCallButton}
                        onPress={() => handleCall(contact.phone)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={16} color={COLORS.onPrimary} />
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
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
              Your live location will be shared with our emergency response team
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(186, 26, 26, 0.2)',
    zIndex: 999,
  },

  // Red Ambient
  redAmbient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(186, 26, 26, 0.04)',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    ...SHADOWS.card,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.headlineLgMobile,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },

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
    backgroundColor: 'rgba(186, 26, 26, 0.06)',
  },
  glowRing2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sosButtonText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.onError,
    letterSpacing: 4,
    marginTop: 2,
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
  contactsSectionTitle: {
    ...TYPOGRAPHY.labelLg,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  contactCard: {
    marginBottom: SPACING.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  contactContent: {
    flex: 1,
  },
  contactName: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  contactRelationship: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  contactCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
