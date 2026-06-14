// ============================================
// SMART RIDE MOBILE - RIDER ONBOARDING
// ============================================
// Step-by-step rider registration flow
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { GlassCard, GradientButton } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOTAL_STEPS = 4;

const VEHICLE_TYPES = [
  { id: 'MOTORCYCLE', label: '🏍️ Motorcycle', description: 'Boda boda rider' },
  { id: 'CAR', label: '🚗 Car', description: 'Smart car driver' },
  { id: 'BICYCLE', label: '🚲 Bicycle', description: 'Bicycle courier' },
  { id: 'SCOOTER', label: '🛵 Scooter', description: 'Scooter delivery' },
];

export default function RiderOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingOnboarding, setExistingOnboarding] = useState<any>(null);

  // Step 1: Personal Info
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    address: '',
    phone: '',
    email: '',
  });

  // Step 2: Documents
  const [documents, setDocuments] = useState({
    photoUrl: '',
    nationalId: '',
    licenseNumber: '',
    licenseExpiry: '',
  });

  // Step 3: Vehicle Info
  const [vehicleInfo, setVehicleInfo] = useState({
    vehicleType: '',
    make: '',
    model: '',
    year: '',
    color: '',
    plateNumber: '',
  });

  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const loadOnboardingStatus = async () => {
    try {
      const response = await api.getRiderOnboarding();
      if (response.success && response.data) {
        const data = response.data.onboarding || response.data;
        setExistingOnboarding(data);

        if (data?.status === 'APPROVED') {
          Alert.alert('Already Approved', 'Your rider account is already approved!', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }

        if (data?.status === 'SUBMITTED') {
          Alert.alert('Application Submitted', 'Your application is being reviewed. We\'ll notify you when it\'s approved.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }

        // Resume from last step
        if (data?.currentStep && data.currentStep > 1) {
          setCurrentStep(data.currentStep);
        }

        // Pre-fill saved data
        if (data?.steps) {
          data.steps.forEach((step: any) => {
            if (step.step === 'personal' && step.data) {
              setPersonalInfo(prev => ({ ...prev, ...step.data }));
            } else if (step.step === 'documents' && step.data) {
              setDocuments(prev => ({ ...prev, ...step.data }));
            } else if (step.step === 'vehicle' && step.data) {
              setVehicleInfo(prev => ({ ...prev, ...step.data }));
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load onboarding status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveStep = async (step: string, data: any) => {
    try {
      await api.updateRiderOnboarding(step, data);
    } catch (error) {
      console.error('Failed to save step:', error);
    }
  };

  const validateStep1 = () => {
    if (!personalInfo.fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return false;
    }
    if (!personalInfo.phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return false;
    }
    if (!personalInfo.address.trim()) {
      Alert.alert('Error', 'Address is required');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!documents.nationalId.trim()) {
      Alert.alert('Error', 'National ID number is required');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!vehicleInfo.vehicleType) {
      Alert.alert('Error', 'Please select a vehicle type');
      return false;
    }
    if (!vehicleInfo.plateNumber.trim()) {
      Alert.alert('Error', 'Plate number is required');
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      await saveStep('personal', personalInfo);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      await saveStep('documents', documents);
    } else if (currentStep === 3) {
      if (!validateStep3()) return;
      await saveStep('vehicle', vehicleInfo);
    }
    setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    Alert.alert(
      'Submit Application',
      'Are you sure you want to submit? You won\'t be able to edit your application after submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const response = await api.registerRider({
                ...personalInfo,
                ...documents,
                ...vehicleInfo,
              });
              if (response.success) {
                Alert.alert(
                  'Application Submitted!',
                  'Your rider application has been submitted. We\'ll review it and get back to you soon.',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                Alert.alert('Error', response.error || 'Failed to submit application');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceContainerLowest]}
        style={[styles.header, { paddingTop: insets.top + 16 || 56 }]}
      >
        <View style={styles.headerRow}>
          {currentStep > 1 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Become a Rider</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(currentStep / TOTAL_STEPS) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step {currentStep} of {TOTAL_STEPS}</Text>
        </View>

        <LinearGradient
          colors={['rgba(0, 255, 136, 0.3)', 'rgba(0, 212, 255, 0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowBorder}
        />
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepTitle}>Personal Information</Text>
            <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={personalInfo.fullName}
              onChangeText={t => setPersonalInfo(p => ({ ...p, fullName: t }))}
            />

            <Text style={styles.fieldLabel}>Phone Number *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g., +256 700 000 000"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={personalInfo.phone}
              onChangeText={t => setPersonalInfo(p => ({ ...p, phone: t }))}
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={personalInfo.email}
              onChangeText={t => setPersonalInfo(p => ({ ...p, email: t }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Address *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Your residential address"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={personalInfo.address}
              onChangeText={t => setPersonalInfo(p => ({ ...p, address: t }))}
            />
          </View>
        )}

        {/* Step 2: Documents */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.stepTitle}>Documents</Text>
            <Text style={styles.stepSubtitle}>Provide your identification documents</Text>

            <Text style={styles.fieldLabel}>National ID Number *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter your National ID number"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={documents.nationalId}
              onChangeText={t => setDocuments(p => ({ ...p, nationalId: t }))}
            />

            <Text style={styles.fieldLabel}>License Number</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Driving license number (if applicable)"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={documents.licenseNumber}
              onChangeText={t => setDocuments(p => ({ ...p, licenseNumber: t }))}
            />

            <Text style={styles.fieldLabel}>License Expiry Date</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={documents.licenseExpiry}
              onChangeText={t => setDocuments(p => ({ ...p, licenseExpiry: t }))}
            />

            <GlassCard variant="accent" style={styles.infoCard}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Document uploads (photo, ID scan) can be completed after registration. For now, please provide the document numbers.
              </Text>
            </GlassCard>
          </View>
        )}

        {/* Step 3: Vehicle Info */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.stepTitle}>Vehicle Information</Text>
            <Text style={styles.stepSubtitle}>Tell us about your vehicle</Text>

            <Text style={styles.fieldLabel}>Vehicle Type *</Text>
            <View style={styles.vehicleTypeGrid}>
              {VEHICLE_TYPES.map(vt => (
                <TouchableOpacity
                  key={vt.id}
                  style={[
                    styles.vehicleTypeCard,
                    vehicleInfo.vehicleType === vt.id && styles.vehicleTypeCardActive,
                  ]}
                  onPress={() => setVehicleInfo(p => ({ ...p, vehicleType: vt.id }))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.vehicleTypeEmoji}>{vt.label.split(' ')[0]}</Text>
                  <Text style={[
                    styles.vehicleTypeLabel,
                    vehicleInfo.vehicleType === vt.id && styles.vehicleTypeLabelActive,
                  ]}>
                    {vt.label.split(' ').slice(1).join(' ')}
                  </Text>
                  <Text style={styles.vehicleTypeDesc}>{vt.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.vehicleFormRow}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Make</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Honda"
                  placeholderTextColor={COLORS.onSurfaceVariant}
                  value={vehicleInfo.make}
                  onChangeText={t => setVehicleInfo(p => ({ ...p, make: t }))}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Model</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Boxer"
                  placeholderTextColor={COLORS.onSurfaceVariant}
                  value={vehicleInfo.model}
                  onChangeText={t => setVehicleInfo(p => ({ ...p, model: t }))}
                />
              </View>
            </View>

            <View style={styles.vehicleFormRow}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Year</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="2024"
                  placeholderTextColor={COLORS.onSurfaceVariant}
                  value={vehicleInfo.year}
                  onChangeText={t => setVehicleInfo(p => ({ ...p, year: t }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Color</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Red"
                  placeholderTextColor={COLORS.onSurfaceVariant}
                  value={vehicleInfo.color}
                  onChangeText={t => setVehicleInfo(p => ({ ...p, color: t }))}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Plate Number *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g., UAX 123A"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={vehicleInfo.plateNumber}
              onChangeText={t => setVehicleInfo(p => ({ ...p, plateNumber: t }))}
              autoCapitalize="characters"
            />
          </View>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === 4 && (
          <View>
            <Text style={styles.stepTitle}>Review & Submit</Text>
            <Text style={styles.stepSubtitle}>Please review your information before submitting</Text>

            {/* Personal Info Review */}
            <GlassCard style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>Personal Information</Text>
                <TouchableOpacity onPress={() => setCurrentStep(1)}>
                  <Text style={styles.reviewEdit}>Edit</Text>
                </TouchableOpacity>
              </View>
              <ReviewRow label="Full Name" value={personalInfo.fullName} />
              <ReviewRow label="Phone" value={personalInfo.phone} />
              <ReviewRow label="Email" value={personalInfo.email || 'Not provided'} />
              <ReviewRow label="Address" value={personalInfo.address} />
            </GlassCard>

            {/* Documents Review */}
            <GlassCard style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>Documents</Text>
                <TouchableOpacity onPress={() => setCurrentStep(2)}>
                  <Text style={styles.reviewEdit}>Edit</Text>
                </TouchableOpacity>
              </View>
              <ReviewRow label="National ID" value={documents.nationalId} />
              <ReviewRow label="License No." value={documents.licenseNumber || 'Not provided'} />
              <ReviewRow label="License Expiry" value={documents.licenseExpiry || 'Not provided'} />
            </GlassCard>

            {/* Vehicle Review */}
            <GlassCard style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>Vehicle Information</Text>
                <TouchableOpacity onPress={() => setCurrentStep(3)}>
                  <Text style={styles.reviewEdit}>Edit</Text>
                </TouchableOpacity>
              </View>
              <ReviewRow label="Vehicle Type" value={VEHICLE_TYPES.find(v => v.id === vehicleInfo.vehicleType)?.label.split(' ').slice(1).join(' ') || 'Not selected'} />
              <ReviewRow label="Make & Model" value={`${vehicleInfo.make || 'N/A'} ${vehicleInfo.model || 'N/A'}`} />
              <ReviewRow label="Year" value={vehicleInfo.year || 'Not provided'} />
              <ReviewRow label="Color" value={vehicleInfo.color || 'Not provided'} />
              <ReviewRow label="Plate Number" value={vehicleInfo.plateNumber || 'Not provided'} />
            </GlassCard>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 || 24 }]}>
        {currentStep < TOTAL_STEPS ? (
          <GradientButton
            title="Continue"
            onPress={handleNext}
          />
        ) : (
          <GradientButton
            title="Submit Application"
            onPress={handleSubmit}
            loading={isSubmitting}
          />
        )}
      </View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={reviewStyles.row}>
      <Text style={reviewStyles.label}>{label}</Text>
      <Text style={reviewStyles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
  },
  label: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  value: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurface,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.md,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    ...TYPOGRAPHY.headlineLg,
    color: COLORS.onSurface,
  },
  headerTitle: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  progressContainer: {
    marginTop: SPACING.xs,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  progressText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.sm,
  },
  glowBorder: {
    height: 1,
    marginTop: SPACING.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 120,
  },
  stepTitle: {
    ...TYPOGRAPHY.headlineLgMobile,
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
    marginTop: 14,
  },
  fieldInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: SPACING.md,
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  infoCard: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },
  // Vehicle type grid
  vehicleTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  vehicleTypeCard: {
    width: '48%',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: 'center',
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  vehicleTypeCardActive: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: `${COLORS.primary}30`,
  },
  vehicleTypeEmoji: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  vehicleTypeLabel: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  vehicleTypeLabelActive: {
    color: COLORS.primary,
  },
  vehicleTypeDesc: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  vehicleFormRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfField: {
    flex: 1,
  },
  // Review styles
  reviewCard: {
    marginBottom: SPACING.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  reviewTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  reviewEdit: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
});
