// ============================================
// SMART RIDE MOBILE - PHARMACIST PRESCRIPTIONS
// ============================================
// Prescription verification screen
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  StyleSheet,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { GlassCard, StatusBadge, GradientButton } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type PrescriptionTab = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED';

const PRESCRIPTION_TABS: { key: PrescriptionTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  VERIFIED: '#006e2f',
  REJECTED: '#ba1a1a',
  EXPIRED: '#6f7a71',
};

let COLORS: ThemedColors;
let styles: any;

export default function PrescriptionsScreen() {
  { const t = useTheme(); COLORS = makeThemedColors(t.isDark); styles = createStyles(COLORS); }
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<PrescriptionTab>('PENDING');
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Rejection modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingPrescriptionId, setRejectingPrescriptionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Verify modal
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyingPrescriptionId, setVerifyingPrescriptionId] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  // Image viewer modal
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState('');

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);

  const loadPrescriptions = useCallback(async () => {
    try {
      const statusFilter = activeTab === 'ALL' ? undefined : activeTab;
      const response = await api.getPrescriptions(statusFilter);
      if (response.success && response.data) {
        const prescriptionData = response.data.prescriptions || response.data.data || response.data;
        setPrescriptions(Array.isArray(prescriptionData) ? prescriptionData : []);
      } else {
        setPrescriptions([]);
      }
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setIsLoading(true);
    loadPrescriptions();
  }, [loadPrescriptions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  };

  const handleVerify = async () => {
    if (!verifyingPrescriptionId) return;
    setIsProcessing(true);
    try {
      const response = await api.verifyPrescription(verifyingPrescriptionId, {
        notes: verificationNotes,
      });
      if (response.success) {
        Alert.alert('Success', 'Prescription verified successfully');
        setVerifyModalVisible(false);
        setVerificationNotes('');
        setVerifyingPrescriptionId(null);
        await loadPrescriptions();
      } else {
        Alert.alert('Error', response.error || 'Failed to verify prescription');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingPrescriptionId) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }
    setIsProcessing(true);
    try {
      const response = await api.rejectPrescription(rejectingPrescriptionId, rejectionReason);
      if (response.success) {
        Alert.alert('Success', 'Prescription rejected');
        setRejectModalVisible(false);
        setRejectionReason('');
        setRejectingPrescriptionId(null);
        await loadPrescriptions();
      } else {
        Alert.alert('Error', response.error || 'Failed to reject prescription');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceContainerLowest]}
        style={[styles.header, { paddingTop: insets.top + 16 || 56 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prescriptions</Text>
          <View style={{ width: 40 }} />
        </View>
        <LinearGradient
          colors={[COLORS.primaryFixedDim, COLORS.primaryFixed, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowBorder}
        />
      </LinearGradient>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
        {PRESCRIPTION_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Prescriptions List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading prescriptions...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {prescriptions.length > 0 ? (
            prescriptions.map((prescription) => (
              <GlassCard key={prescription.id} style={styles.prescriptionCard}>
                <View style={styles.prescriptionHeader}>
                  <Text style={styles.prescriptionId}>#{prescription.id?.slice(-6)}</Text>
                  <StatusBadge
                    label={prescription.status || 'UNKNOWN'}
                    color={STATUS_COLORS[prescription.status] || COLORS.outline}
                    size="sm"
                  />
                </View>

                {/* Patient Info */}
                <View style={styles.prescriptionInfo}>
                  <Text style={styles.infoLabel}>Patient</Text>
                  <Text style={styles.infoValue}>
                    {prescription.patientName || prescription.client?.name || 'N/A'}
                  </Text>
                </View>

                {prescription.patientPhone && (
                  <View style={styles.prescriptionInfo}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{prescription.patientPhone}</Text>
                  </View>
                )}

                {/* Medicines */}
                {prescription.medicines && Array.isArray(prescription.medicines) && prescription.medicines.length > 0 && (
                  <View style={styles.medicinesSection}>
                    <Text style={styles.medicinesLabel}>Medicines:</Text>
                    {prescription.medicines.map((med: any, idx: number) => (
                      <Text key={med.id || idx} style={styles.medicineText}>
                        • {med.medicineName || med.name} {med.dosage ? `(${med.dosage})` : ''} x{med.quantity || 1}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Prescription Image */}
                {prescription.imageUrl && (
                  <TouchableOpacity
                    style={styles.imageButton}
                    onPress={() => {
                      setViewingImageUrl(prescription.imageUrl);
                      setImageModalVisible(true);
                    }}
                  >
                    <Text style={styles.imageButtonText}>View Prescription Image</Text>
                  </TouchableOpacity>
                )}

                {/* Notes */}
                {prescription.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.infoLabel}>Notes</Text>
                    <Text style={styles.notesText}>{prescription.notes}</Text>
                  </View>
                )}

                {/* Rejection Reason */}
                {prescription.status === 'REJECTED' && prescription.rejectionReason && (
                  <View style={styles.rejectionSection}>
                    <Text style={styles.rejectionLabel}>Rejection Reason</Text>
                    <Text style={styles.rejectionText}>{prescription.rejectionReason}</Text>
                  </View>
                )}

                {/* Date */}
                <Text style={styles.prescriptionDate}>{formatDate(prescription.createdAt)}</Text>

                {/* Action Buttons (only for PENDING) */}
                {prescription.status === 'PENDING' && (
                  <View style={styles.actionButtons}>
                    <GradientButton
                      title="Verify"
                      onPress={() => {
                        setVerifyingPrescriptionId(prescription.id);
                        setVerifyModalVisible(true);
                      }}
                      size="sm"
                      style={styles.actionBtn}
                    />
                    <GradientButton
                      title="Reject"
                      variant="danger"
                      onPress={() => {
                        setRejectingPrescriptionId(prescription.id);
                        setRejectModalVisible(true);
                      }}
                      size="sm"
                      style={styles.actionBtn}
                    />
                  </View>
                )}
              </GlassCard>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={32} color={COLORS.outlineVariant} />
              <Text style={styles.emptyTitle}>No prescriptions found</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'ALL'
                  ? 'Prescriptions will appear here when patients upload them'
                  : `No ${activeTab.toLowerCase()} prescriptions`}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Verify Modal */}
      <Modal visible={verifyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify Prescription</Text>
            <Text style={styles.modalSubtitle}>Add any verification notes (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Verification notes..."
              placeholderTextColor={COLORS.outline}
              value={verificationNotes}
              onChangeText={setVerificationNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <GradientButton
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setVerifyModalVisible(false);
                  setVerificationNotes('');
                  setVerifyingPrescriptionId(null);
                }}
                size="sm"
                style={styles.modalBtn}
              />
              <GradientButton
                title="Verify"
                onPress={handleVerify}
                loading={isProcessing}
                size="sm"
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Prescription</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejection</Text>
            <TextInput
              style={[styles.modalInput, styles.rejectionInput]}
              placeholder="Reason for rejection..."
              placeholderTextColor={COLORS.outline}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <GradientButton
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectionReason('');
                  setRejectingPrescriptionId(null);
                }}
                size="sm"
                style={styles.modalBtn}
              />
              <GradientButton
                title="Reject"
                variant="danger"
                onPress={handleReject}
                loading={isProcessing}
                size="sm"
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal visible={imageModalVisible} animationType="fade" transparent>
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setImageModalVisible(false)}
          >
            <Text style={styles.imageModalCloseText}>✕</Text>
          </TouchableOpacity>
          {viewingImageUrl ? (
            <Image
              source={{ uri: viewingImageUrl }}
              style={styles.prescriptionImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.outline,
    marginTop: SPACING.sm,
  },
  header: {
    paddingHorizontal: 20,
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
    justifyContent: 'center',
  },
  backText: {
    fontSize: TYPOGRAPHY.headlineLg.fontSize,
    color: COLORS.onSurface,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.headlineMd.fontSize,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  glowBorder: {
    height: 1,
    marginTop: SPACING.md,
  },
  tabsContainer: {
    maxHeight: 52,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  tabsContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLow,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: `${COLORS.primary}40`,
    borderWidth: 1,
  },
  tabText: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.gutter,
    paddingBottom: 40,
  },
  prescriptionCard: {
    marginBottom: 12,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  prescriptionId: {
    fontSize: 15,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.onSurface,
  },
  prescriptionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.outline,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },
  medicinesSection: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.DEFAULT,
    padding: 10,
    marginTop: SPACING.sm,
  },
  medicinesLabel: {
    fontSize: 11,
    color: COLORS.outline,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  medicineText: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    paddingVertical: SPACING.xs,
  },
  imageButton: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.gutter,
    backgroundColor: `${COLORS.info}15`,
    borderRadius: RADIUS.DEFAULT,
    alignItems: 'center',
  },
  imageButtonText: {
    color: COLORS.info,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
  },
  notesSection: {
    marginTop: SPACING.sm,
  },
  notesText: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  rejectionSection: {
    marginTop: SPACING.sm,
    padding: 10,
    backgroundColor: `${COLORS.error}10`,
    borderRadius: RADIUS.DEFAULT,
    borderWidth: 1,
    borderColor: `${COLORS.error}20`,
  },
  rejectionLabel: {
    fontSize: 11,
    color: COLORS.error,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  rejectionText: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },
  prescriptionDate: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
    marginTop: SPACING.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionBtn: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.bodyLg.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    color: COLORS.outline,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.headlineMd.fontSize,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    color: COLORS.outline,
    marginBottom: SPACING.md,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.onSurface,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    minHeight: 80,
    marginBottom: 16,
  },
  rejectionInput: {
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
  },
  // Image modal
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalCloseText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  prescriptionImage: {
    width: '90%',
    height: '70%',
    borderRadius: RADIUS.md,
  },
});
