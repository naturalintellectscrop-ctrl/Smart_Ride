// ============================================
// SMART RIDE MOBILE - CLIENT PRESCRIPTIONS
// ============================================
// Allows clients to upload and track their prescriptions.
// Design System primitives — Card, SmartBottomSheet, UploadField, StateViews
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  StyleSheet,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS, OPACITY } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  Card,
  EmptyState,
  ErrorState,
  IconInput,
  GradientButton,
  SmartBottomSheet,
  StatusBadge,
  UploadField,
} from '@/src/components';
import { statusColor } from '@/src/theme/statusColors';
import { ImagePickerResult } from '@/src/utils/imagePicker';

// ============================================
// TYPES
// ============================================

interface Prescription {
  id: string;
  prescriptionNumber: string;
  imageUrl: string;
  doctorName?: string | null;
  clinicName?: string | null;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  verificationNotes?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt: string;
  healthOrders?: any[];
}

// ============================================
// CONSTANTS
// ============================================

// Status colours come from the shared semantic mapping — this file used to
// hardcode five hexes that neither matched the other screens' copies of the
// same table nor followed dark mode.

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

// ============================================
// MAIN COMPONENT
// ============================================


export default function PrescriptionsScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePickerResult | null>(null);
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Image viewer modal
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState('');

  // ----------------------------------------
  // Data loading
  // ----------------------------------------

  const loadPrescriptions = useCallback(async () => {
    setError(null);
    try {
      const response = await api.getPrescriptions();
      if (response.success && response.data) {
        // Response shape: { success, data: [...], pagination }
        // or { success, data: { prescriptions: [...] } }
        const payload = response.data as any;
        const list: Prescription[] =
          payload.prescriptions ||
          payload.data ||
          (Array.isArray(payload) ? payload : []);
        setPrescriptions(Array.isArray(list) ? list : []);
      } else {
        setPrescriptions([]);
        if (response.error) setError(response.error);
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
      setError('Failed to load prescriptions. Pull to refresh.');
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  };

  // ----------------------------------------
  // Upload flow
  // ----------------------------------------

  const resetUploadForm = () => {
    setSelectedImage(null);
    setDoctorName('');
    setNotes('');
    setUploadProgress('');
  };


  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Image Required', 'Please select a prescription image first.');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Uploading image...');

    try {
      // Step 1: Upload image to /uploads/documents
      const uploadResponse = await api.uploadDocument(selectedImage, 'prescription');
      if (!uploadResponse.success || !uploadResponse.data?.url) {
        Alert.alert('Upload Failed', uploadResponse.error || 'Failed to upload image.');
        return;
      }

      const imageUrl = uploadResponse.data.url;

      // Step 2: Create prescription record
      setUploadProgress('Creating prescription...');
      const createResponse = await api.uploadPrescription({
        imageUrl,
        doctorName: doctorName.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (createResponse.success) {
        Alert.alert('Success', 'Prescription uploaded successfully. It will be reviewed shortly.');
        setUploadModalVisible(false);
        resetUploadForm();
        await loadPrescriptions();
      } else {
        Alert.alert('Error', createResponse.error || 'Failed to create prescription.');
      }
    } catch (err) {
      console.error('Prescription upload error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleCloseUploadModal = () => {
    if (isUploading) {
      Alert.alert(
        'Upload in Progress',
        'Please wait until the upload completes.',
        [{ text: 'OK' }]
      );
      return;
    }
    setUploadModalVisible(false);
    resetUploadForm();
  };

  // ----------------------------------------
  // Helpers
  // ----------------------------------------

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const openImageViewer = (url: string) => {
    if (!url) return;
    setViewingImageUrl(url);
    setImageModalVisible(true);
  };

  // ----------------------------------------
  // Render
  // ----------------------------------------

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceContainerLowest]}
        style={[styles.header, { paddingTop: insets.top + 12 || 56 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Prescriptions</Text>
          <View style={{ width: 40 }} />
        </View>
        <LinearGradient
          colors={[COLORS.primaryFixedDim, COLORS.primaryFixed, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowBorder}
        />
      </LinearGradient>

      {/* Upload button (prominent, primary color) */}
      <View style={styles.actionBar}>
        <GradientButton
          title="Upload Prescription"
          onPress={() => setUploadModalVisible(true)}
          icon={<Ionicons name="cloud-upload-outline" size={18} color={COLORS.onPrimary} />}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading prescriptions...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {error ? (
            <ErrorState title="Couldn't load prescriptions" subtitle={error} onRetry={onRefresh} />
          ) : prescriptions.length > 0 ? (
            prescriptions.map((prescription) => (
              <PrescriptionCard
                key={prescription.id}
                prescription={prescription}
                onImagePress={() => openImageViewer(prescription.imageUrl)}
                formatDate={formatDate}
              />
            ))
          ) : (
            <EmptyState
              icon="document-text-outline"
              title="No prescriptions yet"
              subtitle="Upload your first prescription to have it reviewed by our pharmacists."
              actionLabel="Upload prescription"
              onAction={() => setUploadModalVisible(true)}
            />
          )}
        </ScrollView>
      )}

      {/* Upload Modal */}
      {/* Upload. This was a bespoke <Modal> with its own KeyboardAvoidingView,
          scrim, header, close button and hand-built image picker — all of which
          SmartBottomSheet and UploadField now provide. */}
      <SmartBottomSheet
        visible={uploadModalVisible}
        title="Upload prescription"
        onDismiss={handleCloseUploadModal}
        dismissOnBackdrop={!isUploading}
      >
        <View>
          <UploadField
            label="Prescription image"
            hint="A clear photo of the whole prescription. JPG or PNG."
            value={selectedImage?.uri ?? null}
            onChange={(file) => setSelectedImage(file)}
            uploading={isUploading}
          />

          <IconInput
            label="Doctor name (optional)"
            placeholder="e.g. Dr. Mukasa"
            value={doctorName}
            onChangeText={setDoctorName}
            icon="person-outline"
            editable={!isUploading}
          />

          <IconInput
            label="Notes (optional)"
            placeholder="Anything the pharmacist should know"
            value={notes}
            onChangeText={setNotes}
            icon="document-text-outline"
            multiline
            editable={!isUploading}
          />

          {uploadProgress ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          ) : null}

          <View style={styles.modalFooter}>
            <GradientButton
              title="Cancel"
              onPress={handleCloseUploadModal}
              variant="outline"
              size="lg"
              fullWidth={false}
              disabled={isUploading}
              style={styles.modalFooterBtn}
            />
            <GradientButton
              title="Upload"
              onPress={handleUpload}
              size="lg"
              fullWidth={false}
              loading={isUploading}
              disabled={!selectedImage || isUploading}
              style={styles.modalFooterBtn}
            />
          </View>
        </View>
      </SmartBottomSheet>

      {/* Image Viewer Modal */}
      <Modal visible={imageModalVisible} animationType="fade" transparent onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close" size={22} color={COLORS.white} />
          </TouchableOpacity>
          {viewingImageUrl ? (
            <Image
              source={{ uri: viewingImageUrl }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// PRESCRIPTION CARD SUBCOMPONENT
// ============================================

interface PrescriptionCardProps {
  prescription: Prescription;
  onImagePress: () => void;
  formatDate: (d?: string) => string;
}

function PrescriptionCard({ prescription, onImagePress, formatDate }: PrescriptionCardProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const statusKey = (prescription.status || 'UNKNOWN').toUpperCase();
  const statusTint = statusColor(statusKey, COLORS);
  const statusLabel = STATUS_LABELS[statusKey] || prescription.status || 'Unknown';

  return (
    <Card style={styles.prescriptionCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {prescription.imageUrl ? (
            <TouchableOpacity onPress={onImagePress} activeOpacity={0.8}>
              <Image source={{ uri: prescription.imageUrl }} style={styles.thumbnail} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="document-outline" size={20} color={COLORS.outline} />
            </View>
          )}
          <View style={styles.cardHeaderText}>
            <Text style={styles.prescriptionNumber}>#{prescription.prescriptionNumber?.slice(-8) || prescription.id?.slice(-6)}</Text>
            <Text style={styles.prescriptionDate}>{formatDate(prescription.createdAt)}</Text>
          </View>
        </View>
        <StatusBadge label={statusLabel} color={statusTint} size="md" />
      </View>

      {prescription.doctorName ? (
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={14} color={COLORS.outline} />
          <Text style={styles.infoLabel}>Doctor:</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{prescription.doctorName}</Text>
        </View>
      ) : null}

      {prescription.clinicName ? (
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={14} color={COLORS.outline} />
          <Text style={styles.infoLabel}>Clinic:</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{prescription.clinicName}</Text>
        </View>
      ) : null}

      {prescription.notes ? (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{prescription.notes}</Text>
        </View>
      ) : null}

      {prescription.status === 'VERIFIED' && prescription.verificationNotes ? (
        <View style={styles.verifiedSection}>
          <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.success} />
          <Text style={styles.verifiedText}>{prescription.verificationNotes}</Text>
        </View>
      ) : null}

      {prescription.status === 'REJECTED' && prescription.rejectionReason ? (
        <View style={styles.rejectionSection}>
          <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
          <Text style={styles.rejectionText}>{prescription.rejectionReason}</Text>
        </View>
      ) : null}

      {prescription.imageUrl ? (
        <TouchableOpacity style={styles.viewImageBtn} onPress={onImagePress} activeOpacity={0.7}>
          <Ionicons name="eye-outline" size={14} color={COLORS.primary} />
          <Text style={styles.viewImageText}>View Image</Text>
        </TouchableOpacity>
      ) : null}
    </Card>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  headerTitle: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  glowBorder: {
    height: 1,
    marginTop: SPACING.md,
  },
  // Action bar
  actionBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    marginTop: SPACING.sm,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: 40,
  },
  // Prescription card
  prescriptionCard: {
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  cardHeaderText: {
    flex: 1,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  prescriptionNumber: {
    ...TYPOGRAPHY.labelLg,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  prescriptionDate: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: 3,
  },
  infoLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
  },
  infoValue: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  notesSection: {
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.DEFAULT,
  },
  notesLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  notesText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontStyle: 'italic',
  },
  verifiedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: `${COLORS.success}10`,
    borderRadius: RADIUS.DEFAULT,
    borderWidth: 1,
    borderColor: `${COLORS.success}30`,
  },
  verifiedText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  rejectionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: `${COLORS.error}10`,
    borderRadius: RADIUS.DEFAULT,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
  },
  rejectionText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  viewImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.DEFAULT,
  },
  viewImageText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Empty state
  // Upload modal
  // Image picker
  // Image preview
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.md,
  },
  progressText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Modal footer
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  modalFooterBtn: {
    flex: 1,
  },
  // Image viewer modal
  imageModalOverlay: {
    flex: 1,
    backgroundColor: `rgba(0, 0, 0, ${OPACITY.scrimHeavy + 0.32})`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.onPrimary}2E`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: '92%',
    height: '72%',
    borderRadius: RADIUS.md,
  },
});
