// ============================================
// SMART RIDE — UploadField
// ============================================
// The document/photo upload field (DS spec §4 field family). KYC documents,
// prescription photos, merchant catalogue images and vehicle papers all go
// through this, so "attach a photo" looks and behaves identically everywhere
// instead of each screen building its own dashed box and picker menu.
//
// Source choice (camera vs library) is offered through `SmartBottomSheet`, the
// same sheet every other picker in the app uses. Picking is delegated to the
// existing `src/utils/imagePicker.ts` helpers, which already own the permission
// prompts — this component does not re-implement them.
//
// States: empty → picking → filled (thumbnail + replace/remove) → uploading →
// error. A filled field always shows what was attached; the user should never
// have to trust that it worked.
// ============================================

import React, { useMemo, useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, ICON, BORDER, OPACITY } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';
import { SmartBottomSheet } from './SmartBottomSheet';
import { ListRow } from './ListRow';
import { pickImage, takePhoto, ImagePickerResult } from '../utils/imagePicker';

interface UploadFieldProps {
  label?: string;
  /** Helper text under the field — what the document must show. */
  hint?: string;
  /** Local URI or remote URL of the attached file, if any. */
  value?: string | null;
  onChange: (file: ImagePickerResult | null) => void;
  /** True while the caller is uploading the picked file. */
  uploading?: boolean;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function UploadField({
  label,
  hint,
  value,
  onChange,
  uploading = false,
  error,
  disabled = false,
  style,
}: UploadFieldProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const choose = async (source: 'camera' | 'library') => {
    setSheetOpen(false);
    const file = source === 'camera' ? await takePhoto() : await pickImage();
    // Null means the user cancelled or declined permission — imagePicker has
    // already explained why, so leave the current value alone.
    if (file) onChange(file);
  };

  const busy = uploading;

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={() => setSheetOpen(true)}
        disabled={disabled || busy}
        style={[
          styles.field,
          !!value && styles.fieldFilled,
          !!error && styles.fieldError,
          (disabled || busy) && styles.fieldDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={value ? `${label ?? 'Attachment'}, attached. Tap to replace.` : `Attach ${label ?? 'a photo'}`}
        accessibilityState={{ disabled: disabled || busy, busy }}
      >
        {value ? (
          <Image source={{ uri: value }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderIcon}>
            <Ionicons name="cloud-upload-outline" size={ICON.lg} color={COLORS.primary} />
          </View>
        )}

        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {busy ? 'Uploading…' : value ? 'Attached' : 'Tap to attach'}
          </Text>
          {hint ? <Text style={styles.hint} numberOfLines={2}>{hint}</Text> : null}
        </View>

        {busy ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : value ? (
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Remove attachment"
          >
            <Ionicons name="close-circle" size={ICON.lg} color={COLORS.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SmartBottomSheet
        visible={sheetOpen}
        title={value ? 'Replace attachment' : 'Attach a photo'}
        onDismiss={() => setSheetOpen(false)}
      >
        <View>
          <ListRow
            title="Take a photo"
            icon="camera-outline"
            divider
            onPress={() => choose('camera')}
          />
          <ListRow
            title="Choose from library"
            icon="images-outline"
            onPress={() => choose('library')}
          />
        </View>
      </SmartBottomSheet>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  label: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.gutter,
    minHeight: 72,
    padding: SPACING.gutter,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    borderWidth: BORDER.emphasis,
    borderColor: COLORS.outlineVariant,
    borderStyle: 'dashed',
  },
  fieldFilled: {
    borderStyle: 'solid',
    borderColor: COLORS.primary,
  },
  fieldError: {
    borderStyle: 'solid',
    borderColor: COLORS.error,
  },
  fieldDisabled: {
    opacity: OPACITY.disabled,
  },
  placeholderIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  hint: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  error: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});
