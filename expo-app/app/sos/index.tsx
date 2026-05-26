// ============================================
// SMART RIDE MOBILE - SOS EMERGENCY SCREEN
// ============================================
// Urgent, serious SOS emergency screen with
// pulsing red button, hold-to-activate, and
// emergency contacts
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
import { COLORS, GRADIENTS } from '@/src/constants';
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
// PULSING BUTTON COMPONENT
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
        withTiming(1.06, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // infinite
      false
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1000, easing: Easing.inOut(Easing.ease) })
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
      {/* Outer glow rings */}
      <Animated.View style={[styles.glowRing3, glowStyle]} />
      <Animated.View style={[styles.glowRing2, glowStyle]} />

      {/* Main button */}
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
          style={styles.sosButtonTouchable}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sosButtonGradient}
          >
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
  const [holdProgress, setHoldProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      {/* Red ambient gradient at top */}
      <View style={styles.redAmbient} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 || 56 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Emergency SOS</Text>
              <Text style={styles.headerSubtitle}>Safety & Emergency</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </Animated.View>

        {/* Main content based on state */}
        {sosState === 'idle' ? (
          <Animated.View entering={FadeInUp.duration(400).delay(200).springify()}>
            {/* SOS Button */}
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

            {/* Info Card */}
            <GlassCard variant="accent" padding={16} borderRadius={14} style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
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

              {/* Location info */}
              <GlassCard variant="default" padding={14} borderRadius={14} style={styles.locationCard}>
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
              <GlassCard variant="default" padding={14} borderRadius={14} style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleIconContainer}>
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
                    trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: COLORS.primary }}
                    thumbColor={shareLiveLocation ? COLORS.background : '#6B7280'}
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
                <Ionicons name="close-circle-outline" size={18} color={COLORS.textMuted} />
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
                  icon={<Ionicons name="home-outline" size={20} color={COLORS.background} />}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Emergency Contacts - Always visible except resolved */}
        {sosState !== 'resolved' && (
          <Animated.View entering={FadeInUp.duration(400).delay(400).springify()}>
            <View style={styles.contactsSection}>
              <Text style={styles.contactsSectionTitle}>Emergency Contacts</Text>

              {MOCK_CONTACTS.map((contact, index) => (
                <Animated.View
                  key={contact.id}
                  entering={FadeInUp.duration(350).delay(500 + index * 60).springify()}
                >
                  <GlassCard variant="default" padding={12} borderRadius={14} style={styles.contactCard}>
                    <View style={styles.contactRow}>
                      <View style={styles.contactIconContainer}>
                        <Ionicons name="call-outline" size={18} color={COLORS.error} />
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
                        <Ionicons name="call" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Bottom Info */}
        <Animated.View entering={FadeIn.duration(400).delay(700)}>
          <View style={styles.bottomInfo}>
            <Ionicons name="shield-outline" size={14} color={COLORS.textDim} />
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ---- Flash Overlay ----
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    zIndex: 999,
  },

  // ---- Red Ambient ----
  redAmbient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  // ---- ScrollView ----
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // ---- Header ----
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // ---- SOS Button ----
  sosSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  sosButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 180,
    height: 180,
    position: 'relative',
  },
  glowRing3: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  glowRing2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  sosButtonTouchable: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#EF4444',
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
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sosButtonText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  holdingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
    marginTop: 16,
  },
  sosInstructions: {
    alignItems: 'center',
    marginTop: 16,
  },
  sosInstructionText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  sosInstructionSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // ---- Info Card ----
  infoCard: {
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  // ---- Activated State ----
  activatedSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  activatedCheckCircle: {
    marginBottom: 16,
  },
  activatedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  activatedSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },

  // ---- Location Card ----
  locationCard: {
    width: '100%',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 1,
  },
  locationLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.error,
    letterSpacing: 0.5,
  },

  // ---- Toggle Card ----
  toggleCard: {
    width: '100%',
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleContent: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // ---- Activated Actions ----
  activatedActions: {
    width: '100%',
    marginBottom: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // ---- Resolved State ----
  resolvedSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  resolvedCheckCircle: {
    marginBottom: 16,
  },
  resolvedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  resolvedSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  resolvedAction: {
    width: '100%',
  },

  // ---- Contacts Section ----
  contactsSection: {
    marginTop: 28,
  },
  contactsSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  contactCard: {
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactContent: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  contactRelationship: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  contactCallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Bottom Info ----
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 20,
  },
  bottomInfoText: {
    fontSize: 12,
    color: COLORS.textDim,
    textAlign: 'center',
    flex: 1,
  },
});
