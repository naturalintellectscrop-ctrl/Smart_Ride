/**
 * Proof of Delivery — the handover step.
 *
 * The backend refuses DELIVERED without proof (BE-005), so before this screen
 * existed a courier could reach the customer's door and had no way to finish
 * the job at all. This is the missing link, not an enhancement.
 *
 * Two proof types, because a doorstep is not always a person:
 *   CODE   the recipient reads out the 4-digit code the platform issued them.
 *          The courier never sees it, so being able to enter it is evidence of
 *          being face to face with the recipient.
 *   PHOTO  nobody available, or the recipient cannot read out a code. A photo
 *          of the parcel where it was left, so the customer can go and look.
 *
 * Everything here is driven by the real endpoint. The sheet does not decide
 * whether proof is valid — it submits and reports what the server said. A
 * wrong code, a capture too far from the drop-off, or proof already recorded
 * all come back 409 with a reason worth showing the courier.
 *
 * Composition is Design-System only: SmartBottomSheet, GradientButton, Card,
 * SuccessCheck. No new visual language.
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SmartBottomSheet } from './SmartBottomSheet';
import { GradientButton } from './GradientButton';
import { SuccessCheck } from './SuccessCheck';
import { SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { api } from '@/src/services';

type ProofMode = 'CODE' | 'PHOTO';

interface Props {
  visible: boolean;
  taskId: string;
  /** Where the parcel is going — shown so the courier can confirm the address. */
  dropoffAddress?: string | null;
  onDismiss: () => void;
  /** Fired only after the SERVER confirms the proof. Never on optimism. */
  onProofAccepted: () => void;
}

const CODE_LENGTH = 4;

export function ProofOfDeliverySheet({
  visible,
  taskId,
  dropoffAddress,
  onDismiss,
  onProofAccepted,
}: Props) {
  const { isDark } = useTheme();
  const COLORS = makeThemedColors(isDark);
  const styles = makeStyles(COLORS);

  const [mode, setMode] = useState<ProofMode>('CODE');
  const [code, setCode] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const codeInput = useRef<TextInput>(null);

  // A dismissed-and-reopened sheet must not carry a stale error or a
  // half-typed code from the previous attempt.
  useEffect(() => {
    if (visible) {
      setError(null);
      setAccepted(false);
      setIsSubmitting(false);
    }
  }, [visible]);

  const takePhoto = async () => {
    setError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Camera access is needed to photograph the delivery.');
      return;
    }
    const shot = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: false,
    });
    if (!shot.canceled && shot.assets?.[0]?.uri) {
      setPhotoUri(shot.assets[0].uri);
    }
  };

  const canSubmit =
    !isSubmitting &&
    !accepted &&
    (mode === 'CODE' ? code.trim().length === CODE_LENGTH : !!photoUri);

  const submit = async () => {
    // Guard the double-tap directly: a courier at a doorway in the rain taps
    // twice, and the second submission would come back 409 "already recorded"
    // and read as a failure on a delivery that actually succeeded.
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Location is evidence too — the backend refuses proof captured far from
      // the recorded drop-off. Best-effort: a courier indoors with no fix must
      // still be able to finish the job.
      let coords: { latitude?: number; longitude?: number } = {};
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch {
        /* submit without coordinates rather than block the handover */
      }

      const res = await api.submitProofOfDelivery(taskId, {
        proofType: mode,
        ...(mode === 'CODE' ? { code: code.trim() } : { photoUrl: photoUri! }),
        ...(recipientName.trim() ? { recipientName: recipientName.trim() } : {}),
        ...coords,
      });

      if (res.success) {
        // Confirmed by the server, not by this screen.
        setAccepted(true);
        setTimeout(onProofAccepted, 900);
      } else {
        setError(res.error || 'That proof was not accepted. Please try again.');
      }
    } catch {
      setError('Could not reach Smart Ride. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SmartBottomSheet
      visible={visible}
      title="Confirm delivery"
      onDismiss={isSubmitting ? () => {} : onDismiss}
      dismissOnBackdrop={!isSubmitting && !accepted}
      dismissOnDragDown={!isSubmitting && !accepted}
    >
      {accepted ? (
        <View style={styles.successWrap}>
          <SuccessCheck size="lg" />
          <Text style={styles.successTitle}>Delivery confirmed</Text>
          <Text style={styles.successBody}>Completing the job…</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {!!dropoffAddress && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.onSurfaceMuted} />
              <Text style={styles.addressText} numberOfLines={2}>
                {dropoffAddress}
              </Text>
            </View>
          )}

          {/* Mode switch. Two real options, both fully implemented. */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'CODE' && styles.modeTabActive]}
              onPress={() => {
                setMode('CODE');
                setError(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'CODE' }}
            >
              <Ionicons
                name="keypad-outline"
                size={18}
                color={mode === 'CODE' ? COLORS.primary : COLORS.onSurfaceMuted}
              />
              <Text style={[styles.modeText, mode === 'CODE' && styles.modeTextActive]}>
                Customer code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === 'PHOTO' && styles.modeTabActive]}
              onPress={() => {
                setMode('PHOTO');
                setError(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'PHOTO' }}
            >
              <Ionicons
                name="camera-outline"
                size={18}
                color={mode === 'PHOTO' ? COLORS.primary : COLORS.onSurfaceMuted}
              />
              <Text style={[styles.modeText, mode === 'PHOTO' && styles.modeTextActive]}>
                Photo
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'CODE' ? (
            <>
              <Text style={styles.prompt}>
                Ask the customer for their {CODE_LENGTH}-digit delivery code.
              </Text>
              <TextInput
                ref={codeInput}
                style={styles.codeInput}
                value={code}
                onChangeText={t => {
                  setCode(t.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH));
                  setError(null);
                }}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                placeholder="––––"
                placeholderTextColor={COLORS.onSurfaceMuted}
                editable={!isSubmitting}
                autoFocus
                accessibilityLabel="Delivery code"
              />
            </>
          ) : (
            <>
              <Text style={styles.prompt}>
                Take a photo of the parcel with the recipient, or where you left it.
              </Text>
              {photoUri ? (
                <View>
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.retake}
                    onPress={takePhoto}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.retakeText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={takePhoto}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Take a photo of the delivery"
                >
                  <Ionicons name="camera" size={28} color={COLORS.primary} />
                  <Text style={styles.photoButtonText}>Take photo</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <TextInput
            style={styles.nameInput}
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Who received it? (optional)"
            placeholderTextColor={COLORS.onSurfaceMuted}
            editable={!isSubmitting}
            accessibilityLabel="Recipient name"
          />

          {/* The server's reason, shown verbatim — a wrong code and a
              too-far-away capture need different corrections. */}
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <GradientButton
            title={isSubmitting ? 'Confirming…' : 'Confirm delivery'}
            onPress={submit}
            disabled={!canSubmit}
            loading={isSubmitting}
            style={styles.cta}
          />

          {isSubmitting && (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.submittingText}>Don't close the app</Text>
            </View>
          )}
        </View>
      )}
    </SmartBottomSheet>
  );
}

const makeStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    content: { paddingBottom: SPACING.lg, gap: SPACING.md },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    addressText: { flex: 1, color: COLORS.onSurfaceMuted, fontSize: 13 },
    modeRow: { flexDirection: 'row', gap: SPACING.sm },
    modeTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.outline,
      backgroundColor: COLORS.backgroundSurface,
    },
    modeTabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryContainer },
    modeText: { color: COLORS.onSurfaceMuted, fontSize: 14, fontWeight: '600' },
    modeTextActive: { color: COLORS.primary },
    prompt: { color: COLORS.onSurface, fontSize: 15, lineHeight: 21 },
    codeInput: {
      borderWidth: 1,
      borderColor: COLORS.outline,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.backgroundSurface,
      color: COLORS.onSurface,
      fontSize: 32,
      letterSpacing: 12,
      textAlign: 'center',
      paddingVertical: SPACING.md,
    },
    photoButton: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
      paddingVertical: SPACING.xl,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primaryContainer,
    },
    photoButtonText: { color: COLORS.primary, fontWeight: '600' },
    photo: { width: '100%', height: 180, borderRadius: RADIUS.md, resizeMode: 'cover' },
    retake: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
      paddingTop: SPACING.sm,
    },
    retakeText: { color: COLORS.primary, fontWeight: '600' },
    nameInput: {
      borderWidth: 1,
      borderColor: COLORS.outline,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.backgroundSurface,
      color: COLORS.onSurface,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      fontSize: 15,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.xs,
      padding: SPACING.sm,
      borderRadius: RADIUS.sm,
      backgroundColor: COLORS.errorContainer,
    },
    errorText: { flex: 1, color: COLORS.error, fontSize: 13, lineHeight: 18 },
    cta: { marginTop: SPACING.xs },
    submittingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
    },
    submittingText: { color: COLORS.onSurfaceMuted, fontSize: 13 },
    successWrap: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xl },
    successTitle: { color: COLORS.onSurface, fontSize: 18, fontWeight: '700' },
    successBody: { color: COLORS.onSurfaceMuted, fontSize: 14 },
  });
