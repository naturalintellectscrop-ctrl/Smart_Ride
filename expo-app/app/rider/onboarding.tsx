// ============================================
// SMART RIDE MOBILE - RIDER ONBOARDING
// ============================================
// Step-by-step rider registration flow.
// Step 2 (Documents) now supports real image uploads via /uploads/documents.
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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { GlassCard, GradientButton } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { pickImage } from '@/src/utils/imagePicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOTAL_STEPS = 4;

const VEHICLE_TYPES = [
  { id: 'MOTORCYCLE', label: 'Motorcycle', icon: 'bicycle-outline', description: 'Boda boda rider' },
  { id: 'CAR', label: 'Car', icon: 'car-outline', description: 'Smart car driver' },
  { id: 'BICYCLE', label: 'Bicycle', icon: 'bicycle-outline', description: 'Bicycle courier' },
  { id: 'SCOOTER', label: 'Scooter', icon: 'speedometer-outline', description: 'Scooter delivery' },
];

// Map UI vehicle type id to rider role (used during registration)
const VEHICLE_TYPE_TO_RIDER_ROLE: Record<string, string> = {
  MOTORCYCLE: 'SMART_BODA',
  CAR: 'SMART_CAR',
  BICYCLE: 'DELIVERY_PERSONNEL',
  SCOOTER: 'DELIVERY_PERSONNEL',
};

// ============================================
// DOCUMENT UPLOAD CARD
// ============================================

interface DocumentUploadCardProps {
  label: string;
  imageUrl: string;
  onUpload: () => void;
  onRemove: () => void;
  required?: boolean;
  uploading?: boolean;
  hint?: string;
}

function DocumentUploadCard({
  label,
  imageUrl,
  onUpload,
  onRemove,
  required,
  uploading,
  hint,
}: DocumentUploadCardProps) {
  return (
    <View style={styles.docCard}>
      <Text style={styles.docLabel}>
        {label} {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      {uploading ? (
        <View style={styles.docUploading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.docUploadingText}>Uploading...</Text>
        </View>
      ) : imageUrl ? (
        <View style={styles.docPreview}>
          <Image source={{ uri: imageUrl }} style={styles.docImage} resizeMode="cover" />
          <View style={styles.docActions}>
              <TouchableOpacity onPress={onUpload} style={styles.docRetakeBtn}>
              <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
                <Text style={styles.docRetakeText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onRemove} style={styles.docRemoveBtn}>
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                <Text style={styles.docRemoveText}>Remove</Text>
              </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={onUpload} style={styles.docUploadBtn} activeOpacity={0.7}>
          <Ionicons name="cloud-upload-outline" size={32} color={COLORS.outline} />
          <Text style={styles.docUploadText}>Tap to upload</Text>
          <Text style={styles.docUploadHint}>{hint || 'JPG, PNG up to 5MB'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RiderOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [existingOnboarding, setExistingOnboarding] = useState<any>(null);

  // ─── Switch Role (escape hatch) ───────────────
  // If a user landed here by accident (e.g., their account has role=RIDER
  // but they actually want to be a client), this lets them switch back to
  // CLIENT role and go straight to the main app without completing the
  // rider onboarding flow.
  const handleSwitchRole = () => {
    Alert.alert(
      'Not a Rider?',
      'You can switch your account back to Client role and go to the main app. You can always become a rider later from your Profile settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch to Client',
          style: 'default',
          onPress: async () => {
            setIsSwitchingRole(true);
            try {
              await api.updateUserRole('CLIENT');
              Alert.alert(
                'Role Updated',
                'You are now a Client. Taking you to the main app.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/(tabs)'),
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                'Error',
                'Could not switch role. Please check your connection and try again, or contact support.'
              );
            } finally {
              setIsSwitchingRole(false);
            }
          },
        },
      ]
    );
  };

  // Step 1: Personal Info
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    address: '',
    phone: '',
    email: '',
  });

  // Step 2: Documents — now with image URLs
  const [documents, setDocuments] = useState({
    nationalIdFront: '',      // URL
    nationalIdBack: '',       // URL
    licenseNumber: '',        // text
    licenseExpiry: '',        // text
    licensePhoto: '',         // URL
    vehiclePhoto: '',         // URL
    photoUrl: '',             // URL (rider selfie)
  });

  // Track which document field is currently uploading
  const [uploadingField, setUploadingField] = useState<string | null>(null);

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

        if (data?.status === 'SUBMITTED' || data?.status === 'PENDING_APPROVAL') {
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

  // ----------------------------------------
  // Document upload handler
  // ----------------------------------------

  const handleUploadDocument = useCallback(async (field: keyof typeof documents | string) => {
    const image = await pickImage({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!image) return;

    setUploadingField(field as string);
    try {
      const uploadResponse = await api.uploadDocument(image, 'rider_document');
      if (uploadResponse.success && uploadResponse.data?.url) {
        setDocuments(prev => ({ ...prev, [field]: uploadResponse.data!.url }));
      } else {
        Alert.alert('Upload Failed', uploadResponse.error || 'Failed to upload document.');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    } finally {
      setUploadingField(null);
    }
  }, []);

  const handleRemoveDocument = (field: keyof typeof documents) => {
    setDocuments(prev => ({ ...prev, [field]: '' }));
  };

  // ----------------------------------------
  // Validation
  // ----------------------------------------

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
    if (!documents.nationalIdFront) {
      Alert.alert('Error', 'Please upload the front of your National ID');
      return false;
    }
    if (!documents.nationalIdBack) {
      Alert.alert('Error', 'Please upload the back of your National ID');
      return false;
    }
    if (!documents.photoUrl) {
      Alert.alert('Error', 'Please upload a rider selfie photo');
      return false;
    }
    // License photo required only for motorcycle/car drivers
    if (vehicleInfo.vehicleType === 'MOTORCYCLE' || vehicleInfo.vehicleType === 'CAR') {
      if (!documents.licensePhoto) {
        Alert.alert('Error', 'Please upload your driving license photo');
        return false;
      }
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

  // ----------------------------------------
  // Navigation
  // ----------------------------------------

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
              const riderRoleType = VEHICLE_TYPE_TO_RIDER_ROLE[vehicleInfo.vehicleType] || 'DELIVERY_PERSONNEL';
              const response = await api.registerRider({
                fullName: personalInfo.fullName,
                phone: personalInfo.phone,
                email: personalInfo.email || undefined,
                address: personalInfo.address,
                physicalAddress: personalInfo.address,
                riderRoleType,
                riderRole: riderRoleType,
                vehicleType: vehicleInfo.vehicleType,
                plateNumber: vehicleInfo.plateNumber,
                vehiclePlate: vehicleInfo.plateNumber,
                make: vehicleInfo.make,
                model: vehicleInfo.model,
                year: vehicleInfo.year,
                color: vehicleInfo.color,
                // Document URLs
                photoUrl: documents.photoUrl,
                nationalIdFrontUrl: documents.nationalIdFront,
                nationalIdBackUrl: documents.nationalIdBack,
                driverLicenseUrl: documents.licensePhoto,
                vehiclePhotoUrl: documents.vehiclePhoto,
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

  // Determine whether license & vehicle photo fields apply based on selected vehicle type
  const isDriver = vehicleInfo.vehicleType === 'MOTORCYCLE' || vehicleInfo.vehicleType === 'CAR';

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
            <TouchableOpacity
              onPress={handleSwitchRole}
              disabled={isSwitchingRole}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Become a Rider</Text>
          <TouchableOpacity
            onPress={handleSwitchRole}
            disabled={isSwitchingRole}
            style={styles.switchRoleBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.switchRoleText}>
              {isSwitchingRole ? '…' : 'Not a rider?'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(currentStep / TOTAL_STEPS) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step {currentStep} of {TOTAL_STEPS}</Text>
        </View>

        <LinearGradient
          colors={['#4ae176', '#98f6be', 'transparent']}
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
            <Text style={styles.stepSubtitle}>Upload clear photos of your documents</Text>

            {/* Rider Selfie */}
            <DocumentUploadCard
              label="Rider Selfie Photo"
              imageUrl={documents.photoUrl}
              onUpload={() => handleUploadDocument('photoUrl')}
              onRemove={() => handleRemoveDocument('photoUrl')}
              required
              uploading={uploadingField === 'photoUrl'}
              hint="A clear photo of your face"
            />

            {/* National ID Front */}
            <DocumentUploadCard
              label="National ID (Front)"
              imageUrl={documents.nationalIdFront}
              onUpload={() => handleUploadDocument('nationalIdFront')}
              onRemove={() => handleRemoveDocument('nationalIdFront')}
              required
              uploading={uploadingField === 'nationalIdFront'}
            />

            {/* National ID Back */}
            <DocumentUploadCard
              label="National ID (Back)"
              imageUrl={documents.nationalIdBack}
              onUpload={() => handleUploadDocument('nationalIdBack')}
              onRemove={() => handleRemoveDocument('nationalIdBack')}
              required
              uploading={uploadingField === 'nationalIdBack'}
            />

            {/* License Number (text) */}
            <Text style={styles.fieldLabel}>Driving License Number</Text>
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

            {/* Driving License Photo — required for drivers */}
            <DocumentUploadCard
              label="Driving License Photo"
              imageUrl={documents.licensePhoto}
              onUpload={() => handleUploadDocument('licensePhoto')}
              onRemove={() => handleRemoveDocument('licensePhoto')}
              required={isDriver}
              uploading={uploadingField === 'licensePhoto'}
              hint="Required for motorcycle/car drivers"
            />

            {/* Vehicle Photo — optional but recommended for drivers */}
            <DocumentUploadCard
              label="Vehicle Photo"
              imageUrl={documents.vehiclePhoto}
              onUpload={() => handleUploadDocument('vehiclePhoto')}
              onRemove={() => handleRemoveDocument('vehiclePhoto')}
              uploading={uploadingField === 'vehiclePhoto'}
              hint="A clear photo of your vehicle"
            />

            <GlassCard variant="accent" style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Make sure all photos are clear, well-lit, and show all four corners of the document.
                Your application will be reviewed within 24-48 hours.
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
                  <Ionicons name={vt.icon as any} size={28} color={vehicleInfo.vehicleType === vt.id ? COLORS.primary : COLORS.onSurface} />
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
              <ReviewRow label="Selfie" value={documents.photoUrl ? 'Uploaded' : 'Not uploaded'} />
              <ReviewRow label="ID Front" value={documents.nationalIdFront ? 'Uploaded' : 'Not uploaded'} />
              <ReviewRow label="ID Back" value={documents.nationalIdBack ? 'Uploaded' : 'Not uploaded'} />
              <ReviewRow label="License No." value={documents.licenseNumber || 'Not provided'} />
              <ReviewRow label="License Expiry" value={documents.licenseExpiry || 'Not provided'} />
              <ReviewRow label="License Photo" value={documents.licensePhoto ? 'Uploaded' : 'Not uploaded'} />
              <ReviewRow label="Vehicle Photo" value={documents.vehiclePhoto ? 'Uploaded' : 'Not uploaded'} />
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
            loading={uploadingField !== null}
            disabled={uploadingField !== null}
          />
        ) : (
          <GradientButton
            title="Submit Application"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        )}
      </View>
    </View>
  );
}

// ============================================
// REVIEW ROW SUBCOMPONENT
// ============================================

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

// ============================================
// STYLES
// ============================================

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
  switchRoleBtn: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.DEFAULT,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLowest,
    minWidth: 40,
    alignItems: 'center',
  },
  switchRoleText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '600',
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
  infoText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },
  // Document upload card
  docCard: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  docLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  docUploadBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
  },
  docUploadText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  docUploadHint: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginTop: 2,
  },
  docPreview: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  docImage: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  docActions: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLow,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  docRetakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  docRetakeText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '600',
  },
  docRemoveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.outlineVariant,
  },
  docRemoveText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.error,
    fontWeight: '600',
  },
  docUploading: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: SPACING.sm,
  },
  docUploadingText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '600',
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
