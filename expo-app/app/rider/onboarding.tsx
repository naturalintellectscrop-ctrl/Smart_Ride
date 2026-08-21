// ============================================
// SMART RIDE MOBILE - RIDER ONBOARDING
// ============================================
// Step-by-step rider registration flow.
// Step 2 (Documents) now supports real image uploads via /uploads/documents.
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ICON } from '@/src/constants';
import { AuthHeadline, StepRail, FieldCard } from '@/src/components/auth';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import type { RiderRole } from '@/src/types';
import {
  Card,
  GradientButton,
  UploadField,
} from '@/src/components';
import { Ionicons } from '@expo/vector-icons';
import { ImagePickerResult } from '@/src/utils/imagePicker';


const TOTAL_STEPS = 4;
// Short labels for the step rail. Order matches the wizard's steps.
const STEP_LABELS = ['Personal', 'Docs', 'Vehicle', 'Review'];

const VEHICLE_TYPES = [
  { id: 'MOTORCYCLE', label: 'Motorcycle', icon: 'bicycle-outline', description: 'Boda boda rider' },
  { id: 'CAR', label: 'Car', icon: 'car-outline', description: 'Smart car driver' },
  { id: 'BICYCLE', label: 'Bicycle', icon: 'bicycle-outline', description: 'Bicycle courier' },
  { id: 'SCOOTER', label: 'Scooter', icon: 'speedometer-outline', description: 'Scooter delivery' },
];

// Map UI vehicle type id to rider role (used during registration).
//
// MOTORCYCLE and CAR previously wrote 'SMART_BODA' and 'SMART_CAR', which are
// not members of RiderRole ('SMART_BODA_RIDER' | 'SMART_CAR_DRIVER' |
// 'DELIVERY_PERSONNEL'). Nothing downstream matched those values, so the map
// marker system, dispatch eligibility and the dashboard's role branch all fell
// through to their defaults for every rider onboarded this way. Typed against
// RiderRole so the union is enforced at compile time rather than by hope.
const VEHICLE_TYPE_TO_RIDER_ROLE: Record<string, RiderRole> = {
  MOTORCYCLE: 'SMART_BODA_RIDER',
  CAR: 'SMART_CAR_DRIVER',
  BICYCLE: 'DELIVERY_PERSONNEL',
  SCOOTER: 'DELIVERY_PERSONNEL',
};

// ============================================
// DOCUMENT UPLOAD CARD
// ============================================

interface DocumentUploadCardProps {
  label: string;
  imageUrl?: string;
  /** Fired with the picked file; the screen uploads it. */
  onPicked: (file: ImagePickerResult) => void;
  onRemove: () => void;
  required?: boolean;
  uploading?: boolean;
  hint?: string;
}

/**
 * A single onboarding document. Composes the shared `UploadField` rather than
 * re-implementing the dashed picker, preview, retake and remove chrome — which
 * is what this component used to do, in hardcoded hex that ignored the theme.
 *
 * Picking moves into the primitive; the screen keeps ownership of the upload
 * itself, since that posts to /documents and stores a URL.
 */
function DocumentUploadCard({
  label,
  imageUrl,
  onPicked,
  onRemove,
  required,
  uploading,
  hint,
}: DocumentUploadCardProps) {
  return (
    <UploadField
      label={required ? `${label} *` : label}
      hint={hint}
      value={imageUrl || null}
      uploading={uploading}
      onChange={(file) => (file ? onPicked(file) : onRemove())}
    />
  );
}


// ============================================
// MAIN COMPONENT
// ============================================


export default function RiderOnboardingScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  // ─── Switch Role (escape hatch) ───────────────
  // If a user landed here by accident (e.g., their account has role=RIDER
  // but they actually want to be a client), this lets them switch back to
  // CLIENT role and go straight to the main app without completing the
  // rider onboarding flow.
  const handleSwitchRole = () => {
    if (isSwitchingRole) return;
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

  // Step 3: Vehicle Info — pre-select the vehicle implied by the role the user
  // chose at registration (?vehicle=MOTORCYCLE|CAR|BICYCLE), still editable.
  const { vehicle: vehicleParam } = useLocalSearchParams<{ vehicle?: string }>();
  const initialVehicleType = ['MOTORCYCLE', 'CAR', 'BICYCLE', 'SCOOTER'].includes(vehicleParam || '')
    ? (vehicleParam as string)
    : '';
  const [vehicleInfo, setVehicleInfo] = useState({
    vehicleType: initialVehicleType,
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

        // DEV-3: an approved driver who lands here must leave FORWARDS.
        //
        // Both of these dismissed with router.back(), which returns to whatever
        // pushed the form — and what pushes the form is the "Become a Rider"
        // entry, so the driver bounced straight back onto a four-step
        // application for an account that is already approved. The only
        // prominent escape on that screen offers to switch them to Client, i.e.
        // to demote an approved driver, and Android back leaves the app.
        // Recovering meant knowing to force-quit.
        //
        // replace() rather than push() so the form is not left on the stack
        // behind them to be found again with a back gesture.
        if (data?.status === 'APPROVED') {
          Alert.alert(
            'You are already approved',
            'Taking you to your dashboard.',
            [{ text: 'OK', onPress: () => router.replace('/driver') }],
            // Not dismissible: OK is the only way out, and OK goes forwards.
            // A tap outside the dialog used to leave them on the form.
            { cancelable: false }
          );
          return;
        }

        if (data?.status === 'SUBMITTED' || data?.status === 'PENDING_APPROVAL') {
          Alert.alert(
            'Application submitted',
            'We are reviewing it, and will let you know as soon as it is approved.',
            [{ text: 'OK', onPress: () => router.replace('/') }],
            { cancelable: false }
          );
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

  // Returns true only if the step was accepted by the backend. Callers MUST
  // NOT advance the wizard on a false result — otherwise a rider can walk the
  // whole flow while nothing persists and lose their entered data.
  const saveStep = async (step: string, data: any): Promise<boolean> => {
    try {
      const res = await api.updateRiderOnboarding(step, data);
      return !!res?.success;
    } catch (error) {
      console.error('Failed to save step:', error);
      return false;
    }
  };

  // ----------------------------------------
  // Document upload handler
  // ----------------------------------------

  const handleUploadDocument = useCallback(async (field: keyof typeof documents | string, image: ImagePickerResult) => {
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
    if (!vehicleInfo.make.trim()) {
      Alert.alert('Error', 'Vehicle make is required');
      return false;
    }
    if (!vehicleInfo.model.trim()) {
      Alert.alert('Error', 'Vehicle model is required');
      return false;
    }
    if (!vehicleInfo.plateNumber.trim()) {
      Alert.alert('Error', 'Plate number is required');
      return false;
    }
    // Boda / car drivers must also provide their licence number.
    if ((vehicleInfo.vehicleType === 'MOTORCYCLE' || vehicleInfo.vehicleType === 'CAR') && !documents.licenseNumber.trim()) {
      Alert.alert('Error', 'Driving licence number is required for motorcycle and car drivers');
      return false;
    }
    return true;
  };

  // ----------------------------------------
  // Navigation
  // ----------------------------------------

  const handleNext = async () => {
    // Persist the current step BEFORE advancing. If the save is rejected (e.g.
    // a flaky connection), stay on the step and tell the user, rather than
    // silently walking forward on unsaved data.
    let saved = true;
    if (currentStep === 1) {
      if (!validateStep1()) return;
      saved = await saveStep('personal', personalInfo);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      saved = await saveStep('documents', documents);
    } else if (currentStep === 3) {
      if (!validateStep3()) return;
      saved = await saveStep('vehicle', vehicleInfo);
    }
    if (!saved) {
      Alert.alert(
        'Could not save',
        'We couldn\'t save this step. Please check your connection and try again.'
      );
      return;
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
      {/* Step rail replaces the AppHeader subtitle + percentage bar, so the
          wizard reads the same as the auth flow that leads into it. The
          "Not a rider?" escape hatch keeps its place on the right. */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, SPACING.sm) }]}>
        <TouchableOpacity
          style={styles.topBarButton}
          onPress={currentStep > 1 ? handleBack : handleSwitchRole}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={ICON.lg} color={COLORS.onSurface} />
        </TouchableOpacity>

        <StepRail current={currentStep} labels={STEP_LABELS} style={styles.stepRail} />

        <TouchableOpacity
          style={styles.topBarButton}
          onPress={handleSwitchRole}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Not a rider? Switch role"
        >
          <Ionicons name="swap-horizontal-outline" size={ICON.lg} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <View>
            <AuthHeadline lead="Personal" accent="information" subtitle="Tell us about yourself." style={styles.stepHeadline} />

            <FieldCard
              label="Full Name *"
              icon="person-outline"
              placeholder="Enter your full name"
              value={personalInfo.fullName}
              onChangeText={t => setPersonalInfo(p => ({ ...p, fullName: t }))}
              autoCapitalize="words"
              style={styles.field}
            />

            {/* Free-text phone rather than PhoneFieldCard: this value is sent
                to updateRiderOnboarding as typed, and the picker's +256 split
                would change what the backend receives. */}
            <FieldCard
              label="Phone Number *"
              icon="call-outline"
              placeholder="e.g., +256 700 000 000"
              value={personalInfo.phone}
              onChangeText={t => setPersonalInfo(p => ({ ...p, phone: t }))}
              keyboardType="phone-pad"
              style={styles.field}
            />

            <FieldCard
              label="Email"
              icon="mail-outline"
              placeholder="your@email.com"
              value={personalInfo.email}
              onChangeText={t => setPersonalInfo(p => ({ ...p, email: t }))}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.field}
            />

            <FieldCard
              label="Address *"
              icon="location-outline"
              placeholder="Your residential address"
              value={personalInfo.address}
              onChangeText={t => setPersonalInfo(p => ({ ...p, address: t }))}
              style={styles.field}
            />
          </View>
        )}

        {/* Step 2: Documents */}
        {currentStep === 2 && (
          <View>
            <AuthHeadline lead="Your" accent="documents" subtitle="Upload clear photos of your documents." style={styles.stepHeadline} />

            {/* Rider Selfie */}
            <DocumentUploadCard
              label="Rider Selfie Photo"
              imageUrl={documents.photoUrl}
              onPicked={(file) => handleUploadDocument('photoUrl', file)}
              onRemove={() => handleRemoveDocument('photoUrl')}
              required
              uploading={uploadingField === 'photoUrl'}
              hint="A clear photo of your face"
            />

            {/* National ID Front */}
            <DocumentUploadCard
              label="National ID (Front)"
              imageUrl={documents.nationalIdFront}
              onPicked={(file) => handleUploadDocument('nationalIdFront', file)}
              onRemove={() => handleRemoveDocument('nationalIdFront')}
              required
              uploading={uploadingField === 'nationalIdFront'}
            />

            {/* National ID Back */}
            <DocumentUploadCard
              label="National ID (Back)"
              imageUrl={documents.nationalIdBack}
              onPicked={(file) => handleUploadDocument('nationalIdBack', file)}
              onRemove={() => handleRemoveDocument('nationalIdBack')}
              required
              uploading={uploadingField === 'nationalIdBack'}
            />

            <FieldCard
              label="Driving License Number"
              icon="card-outline"
              placeholder="License number (if applicable)"
              value={documents.licenseNumber}
              onChangeText={t => setDocuments(p => ({ ...p, licenseNumber: t }))}
              autoCapitalize="characters"
              style={styles.field}
            />

            <FieldCard
              label="License Expiry Date"
              icon="calendar-outline"
              placeholder="YYYY-MM-DD"
              value={documents.licenseExpiry}
              onChangeText={t => setDocuments(p => ({ ...p, licenseExpiry: t }))}
              style={styles.field}
            />

            {/* Driving License Photo — required for drivers */}
            <DocumentUploadCard
              label="Driving License Photo"
              imageUrl={documents.licensePhoto}
              onPicked={(file) => handleUploadDocument('licensePhoto', file)}
              onRemove={() => handleRemoveDocument('licensePhoto')}
              required={isDriver}
              uploading={uploadingField === 'licensePhoto'}
              hint="Required for motorcycle/car drivers"
            />

            {/* Vehicle Photo — optional but recommended for drivers */}
            <DocumentUploadCard
              label="Vehicle Photo"
              imageUrl={documents.vehiclePhoto}
              onPicked={(file) => handleUploadDocument('vehiclePhoto', file)}
              onRemove={() => handleRemoveDocument('vehiclePhoto')}
              uploading={uploadingField === 'vehiclePhoto'}
              hint="A clear photo of your vehicle"
            />

            <Card variant="accent" style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Make sure all photos are clear, well-lit, and show all four corners of the document.
                Your application will be reviewed within 24-48 hours.
              </Text>
            </Card>
          </View>
        )}

        {/* Step 3: Vehicle Info */}
        {currentStep === 3 && (
          <View>
            <AuthHeadline lead="Vehicle" accent="information" subtitle="Tell us about your vehicle." style={styles.stepHeadline} />

            <Text style={styles.groupLabel}>Vehicle Type *</Text>
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

            {/* Make/Model and Year/Colour used to sit two-up. A field card
                carries a 60pt icon gutter, which leaves too little room for a
                label and a value at half width, so they stack. */}
            <FieldCard
              label="Make"
              icon="car-outline"
              placeholder="e.g., Honda"
              value={vehicleInfo.make}
              onChangeText={t => setVehicleInfo(p => ({ ...p, make: t }))}
              autoCapitalize="words"
              style={styles.field}
            />

            <FieldCard
              label="Model"
              icon="car-sport-outline"
              placeholder="e.g., Boxer"
              value={vehicleInfo.model}
              onChangeText={t => setVehicleInfo(p => ({ ...p, model: t }))}
              autoCapitalize="words"
              style={styles.field}
            />

            <FieldCard
              label="Year"
              icon="calendar-outline"
              placeholder="2024"
              value={vehicleInfo.year}
              onChangeText={t => setVehicleInfo(p => ({ ...p, year: t }))}
              keyboardType="numeric"
              maxLength={4}
              style={styles.field}
            />

            <FieldCard
              label="Color"
              icon="color-palette-outline"
              placeholder="e.g., Red"
              value={vehicleInfo.color}
              onChangeText={t => setVehicleInfo(p => ({ ...p, color: t }))}
              autoCapitalize="words"
              style={styles.field}
            />

            <FieldCard
              label="Plate Number *"
              icon="reader-outline"
              placeholder="e.g., UAX 123A"
              value={vehicleInfo.plateNumber}
              onChangeText={t => setVehicleInfo(p => ({ ...p, plateNumber: t }))}
              autoCapitalize="characters"
              style={styles.field}
            />
          </View>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === 4 && (
          <View>
            <AuthHeadline lead="Review and" accent="submit" subtitle="Check your details before sending your application." style={styles.stepHeadline} />

            {/* Personal Info Review */}
            <Card style={styles.reviewCard}>
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
            </Card>

            {/* Documents Review */}
            <Card style={styles.reviewCard}>
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
            </Card>

            {/* Vehicle Review */}
            <Card style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>Vehicle Information</Text>
                <TouchableOpacity onPress={() => setCurrentStep(3)}>
                  <Text style={styles.reviewEdit}>Edit</Text>
                </TouchableOpacity>
              </View>
              <ReviewRow label="Vehicle Type" value={VEHICLE_TYPES.find(v => v.id === vehicleInfo.vehicleType)?.label || 'Not selected'} />
              <ReviewRow label="Make & Model" value={`${vehicleInfo.make || 'N/A'} ${vehicleInfo.model || 'N/A'}`} />
              <ReviewRow label="Year" value={vehicleInfo.year || 'Not provided'} />
              <ReviewRow label="Color" value={vehicleInfo.color || 'Not provided'} />
              <ReviewRow label="Plate Number" value={vehicleInfo.plateNumber || 'Not provided'} />
            </Card>
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
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const reviewStyles = useMemo(() => createReviewStyles(COLORS), [COLORS]);
  return (
    <View style={reviewStyles.row}>
      <Text style={reviewStyles.label}>{label}</Text>
      <Text style={reviewStyles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const createReviewStyles = (COLORS: ThemedColors) => StyleSheet.create({
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

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  topBarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  stepRail: {
    flex: 1,
    marginTop: SPACING.sm,
  },
  stepHeadline: {
    marginBottom: SPACING.lg,
  },
  field: {
    marginBottom: SPACING.gutter,
  },
  groupLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 120,
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
  // Vehicle type grid
  vehicleTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  vehicleTypeCard: {
    // Two tiles plus the row gap overflowed 100%, squeezing the second
    // tile and wrapping its label. flexBasis reflows instead.
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 150,
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
