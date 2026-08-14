// ============================================
// SMART RIDE MOBILE - RECEIPT SCREEN
// ============================================
// Shows the branded, privacy-safe receipt for a completed transaction
// (ride / food / shop / item / pharmacy). First names only — never a phone
// number. Supports Download-as-PDF (expo-print) and native Share (expo-sharing).
//
// Params: ?id=<receiptId|receiptNumber>  OR  ?taskId=<id> (generates on demand)
// ============================================

import { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { api } from '@/src/services';
import { COLORS as BRAND, TYPOGRAPHY, SPACING, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  DetailSkeleton,
  ErrorState,
  GradientButton,
  ReceiptCard,
} from '@/src/components';
import type { ReceiptLine } from '@/src/components';

/** Support details shown on screen and printed on the PDF — one definition. */
const SUPPORT_EMAIL = 'support@smartride.ug';
const LEGAL_FOOTER = 'Natural Intellects · Kampala, Uganda';

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Cash',
  MTN_MOMO: 'MTN Mobile Money',
  AIRTEL_MONEY: 'Airtel Money',
  CARD: 'Card',
  VISA: 'Visa / Card',
  WALLET: 'Smart Ride Wallet',
  NYLON_PAY: 'Mobile Money',
};

const money = (n: number, c = 'UGX') => `${c} ${Math.round(Number(n) || 0).toLocaleString('en-UG')}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
/**
 * Star glyphs for the PDF only. On screen the `Rating` primitive renders this,
 * but a printed receipt has no components — so print gets stars plus the
 * number, matching what `Rating` shows.
 */
const printableRating = (r?: number | null) => {
  if (!r) return '';
  const filled = Math.round(Math.min(5, Math.max(0, r)));
  return `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}  ${Number(r).toFixed(2)}`;
};
const paymentLabel = (m?: string, s?: string) =>
  m === 'CASH' && s && s !== 'COMPLETED' ? 'Cash (to be paid)' : (m && PAYMENT_LABEL[m]) || 'Mobile Money';

export default function ReceiptScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; taskId?: string }>();

  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Proof of delivery, when this receipt is for a delivery that captured one.
  const [proof, setProof] = useState<any>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [photoBroken, setPhotoBroken] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = params.taskId
          ? await api.generateReceipt(params.taskId)
          : params.id
          ? await api.getReceipt(params.id)
          : { success: false, error: 'No receipt reference provided' };
        if (!active) return;
        if (res.success && (res.data as any)) setReceipt(res.data);
        else setError((res as any).error || 'Receipt not available yet.');
      } catch {
        if (active) setError('Failed to load receipt.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [params.id, params.taskId]);

  /**
   * Fetch the delivery proof the courier captured.
   *
   * The courier's photo was being stored and served correctly, and nothing in
   * the app ever asked for it — so from the customer's side the evidence did
   * not exist. A proof only settles a dispute if the person disputing can see
   * it, which makes the receipt its natural home: it is the one screen a
   * customer already opens when they want to know what they paid for.
   *
   * The server decides who may look. It returns 403 to anyone who is neither
   * the customer nor the assigned courier, so this fetch simply renders
   * whatever it is allowed to have.
   */
  const taskId = params.taskId ?? receipt?.taskId;
  useEffect(() => {
    if (!taskId) return;
    let active = true;
    setProofLoading(true);
    setPhotoBroken(false);
    (async () => {
      try {
        const res = await api.getProofOfDelivery(String(taskId));
        if (!active) return;
        // A ride has no proof and never will — absence is normal, not an error.
        if (res?.success && (res.data as any)?.proofCapturedAt) setProof(res.data);
      } catch {
        // Never let a missing proof break the receipt itself.
      } finally {
        if (active) setProofLoading(false);
      }
    })();
    return () => { active = false; };
  }, [taskId]);

  const buildHtml = useCallback((r: any) => {
    const lines: Array<{ label: string; amount: number }> = Array.isArray(r.breakdown) ? r.breakdown : [];
    // Print palette. Brand colours come from the shared constants so a rebrand
    // reaches the PDF; the paper greys are print-specific and have no screen
    // token, but they live in exactly one object rather than scattered inline.
    const ink = { brand: BRAND.primary, onBrand: BRAND.onPrimary, page: '#f3f5f4', card: '#ffffff', muted: '#5b6b63', faint: '#8a978f', rule: '#eef1ef', strong: '#0d1b14' };
    const row = (l: string, v: string, b = false) =>
      `<tr><td style="padding:6px 0;color:${ink.muted};font-size:13px">${l}</td><td style="padding:6px 0;text-align:right;font-size:13px;${b ? 'font-weight:700' : ''}">${v}</td></tr>`;
    const bd = lines.map((l) => row(l.label, `${l.amount < 0 ? '-' : ''}${money(Math.abs(l.amount), r.currency)}`)).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="font-family:-apple-system,Roboto,sans-serif;background:${ink.page};margin:0;padding:16px">
    <div style="max-width:520px;margin:0 auto;background:${ink.card};border-radius:16px;overflow:hidden">
      <div style="background:${ink.brand};padding:22px 24px"><div style="color:${ink.onBrand};font-size:20px;font-weight:800">SMART RIDE</div>
      <div style="color:${ink.onBrand};opacity:.8;font-size:13px;margin-top:4px">Thank you for choosing Smart Ride.</div></div>
      <div style="padding:24px">
        <div style="font-size:11px;color:${ink.faint};text-transform:uppercase">Total Paid</div>
        <div style="font-size:32px;font-weight:800;color:${ink.strong}">${money(r.total, r.currency)}</div>
        <div style="font-size:13px;color:${ink.muted};margin-top:4px">Paid via ${paymentLabel(r.paymentMethod, r.paymentStatus)}</div>
        <table style="width:100%;border-top:1px solid ${ink.rule};margin-top:16px;padding-top:8px">
          ${row('Receipt Number', r.receiptNumber, true)}${row('Date', fmtDate(r.issuedAt))}
          ${r.serviceLabel ? row('Service', r.serviceLabel) : ''}${r.vehicleType ? row('Vehicle Type', r.vehicleType) : ''}
          ${r.distanceKm ? row('Distance', `${Number(r.distanceKm).toFixed(1)} km`) : ''}${r.durationMin ? row('Duration', `${r.durationMin} min`) : ''}
        </table>
        ${r.pickupAddress || r.dropoffAddress ? `<div style="border-top:1px solid ${ink.rule};margin-top:12px;padding-top:12px">
          ${r.pickupAddress ? `<div style="font-size:11px;color:${ink.faint}">PICKUP</div><div style="font-size:14px;margin-bottom:8px">${r.pickupAddress}</div>` : ''}
          ${r.dropoffAddress ? `<div style="font-size:11px;color:${ink.faint}">DROPOFF</div><div style="font-size:14px">${r.dropoffAddress}</div>` : ''}</div>` : ''}
        <div style="border-top:1px solid ${ink.rule};margin-top:12px;padding-top:12px"><div style="font-size:11px;color:${ink.faint}">FARE BREAKDOWN</div>
        <table style="width:100%">${bd}<tr><td colspan=2 style="border-top:1px solid ${ink.rule};padding-top:6px"></td></tr>${row('Total', money(r.total, r.currency), true)}</table></div>
        ${r.providerName ? `<div style="border-top:1px solid ${ink.rule};margin-top:12px;padding-top:12px"><div style="font-size:11px;color:${ink.faint}">YOUR ${r.type === 'RIDE' ? 'RIDER' : 'PROVIDER'}</div>
        <div style="font-size:16px;font-weight:600">${r.providerName}</div><div style="color:${BRAND.warning}">${printableRating(r.providerRating)}</div></div>` : ''}
        <div style="border-top:1px solid ${ink.rule};margin-top:16px;padding-top:12px;text-align:center;font-size:12px;color:${ink.muted}">
          Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:${ink.brand}">${SUPPORT_EMAIL}</a><br/>
          <span style="color:${ink.faint}">${LEGAL_FOOTER}</span></div>
      </div></div></body></html>`;
  }, []);

  const handleShare = useCallback(async () => {
    if (!receipt) return;
    setBusy(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml(receipt) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Receipt ${receipt.receiptNumber}`, UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Saved', `Receipt saved to: ${uri}`);
      }
    } catch {
      Alert.alert('Error', 'Could not generate the PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [receipt, buildHtml]);

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Receipt" onBack={() => router.back()} />
        <DetailSkeleton />
      </View>
    );
  }

  if (error || !receipt) {
    return (
      <View style={styles.container}>
        <AppHeader title="Receipt" onBack={() => router.back()} />
        <View style={styles.stateWrap}>
          <ErrorState
            title="Receipt not available"
            subtitle={error || 'We could not find this receipt.'}
            retryLabel="Go Back"
            onRetry={() => router.back()}
          />
        </View>
      </View>
    );
  }

  const lines: ReceiptLine[] = Array.isArray(receipt.breakdown) ? receipt.breakdown : [];
  const isRide = receipt.type === 'RIDE';

  // The service block — the one part of the receipt that varies by type.
  // Rides and deliveries show their route; everything else shows its service
  // facts. `ReceiptCard` owns the rest of the architecture.
  const serviceRows: Array<[string, string]> = [
    receipt.serviceLabel ? ['Service', String(receipt.serviceLabel)] : null,
    receipt.vehicleType ? ['Vehicle', String(receipt.vehicleType)] : null,
    receipt.distanceKm ? ['Distance', `${Number(receipt.distanceKm).toFixed(1)} km`] : null,
    receipt.durationMin ? ['Duration', `${receipt.durationMin} min`] : null,
  ].filter(Boolean) as Array<[string, string]>;

  return (
    <View style={styles.container}>
      <AppHeader title="Receipt" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ReceiptCard
          receiptNumber={receipt.receiptNumber}
          issuedAt={fmtDate(receipt.issuedAt)}
          total={receipt.total}
          currency={receipt.currency}
          breakdown={lines}
          paymentLabel={`Paid via ${paymentLabel(receipt.paymentMethod, receipt.paymentStatus)}`}
          provider={
            receipt.providerName
              ? {
                  name: receipt.providerName,
                  rating: receipt.providerRating ?? null,
                  roleLabel: isRide ? 'Your rider' : 'Your provider',
                }
              : undefined
          }
          footerNote={`Need help? ${SUPPORT_EMAIL}
${LEGAL_FOOTER}`}
        >
          {serviceRows.map(([label, value]) => (
            <View key={label} style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>{label}</Text>
              <Text style={styles.serviceValue} numberOfLines={1}>{value}</Text>
            </View>
          ))}

          {receipt.pickupAddress ? (
            <View style={styles.addressBlock}>
              <Text style={styles.miniLabel}>Pickup</Text>
              <Text style={styles.addr}>{receipt.pickupAddress}</Text>
            </View>
          ) : null}
          {receipt.dropoffAddress ? (
            <View style={styles.addressBlock}>
              <Text style={styles.miniLabel}>Dropoff</Text>
              <Text style={styles.addr}>{receipt.dropoffAddress}</Text>
            </View>
          ) : null}
        </ReceiptCard>

        {/* Proof of delivery. Rendered only when one was captured, so rides
            and other non-delivery receipts are unchanged. */}
        {proofLoading && !proof ? (
          <View style={styles.proofCard}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : null}

        {proof ? (
          <View style={styles.proofCard}>
            <View style={styles.proofHead}>
              <Ionicons name="shield-checkmark-outline" size={ICON.md} color={COLORS.primary} />
              <Text style={styles.proofTitle}>Proof of delivery</Text>
            </View>

            {proof.proofPhotoUrl && !photoBroken ? (
              <Image
                source={{ uri: proof.proofPhotoUrl }}
                style={styles.proofPhoto}
                resizeMode="cover"
                onError={() => setPhotoBroken(true)}
              />
            ) : null}

            {proof.proofPhotoUrl && photoBroken ? (
              // The record exists even when the image will not load — say so
              // rather than showing a blank frame that reads as "no proof".
              <View style={[styles.proofPhoto, styles.proofPhotoFallback]}>
                <Ionicons name="image-outline" size={ICON.lg} color={COLORS.onSurfaceVariant} />
                <Text style={styles.proofFallbackText}>
                  Photo could not be loaded. It is still on file — contact support if you need it.
                </Text>
              </View>
            ) : null}

            {proof.proofRecipientName ? (
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>Received by</Text>
                <Text style={styles.serviceValue} numberOfLines={1}>{proof.proofRecipientName}</Text>
              </View>
            ) : null}

            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>Confirmed</Text>
              <Text style={styles.serviceValue}>
                {new Date(proof.proofCapturedAt).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>

            {proof.proofType === 'CODE' ? (
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>Confirmed with</Text>
                <Text style={styles.serviceValue}>Your handover code</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, SPACING.gutter) }]}>
        <GradientButton
          title={busy ? 'Preparing…' : 'Share / Download PDF'}
          onPress={handleShare}
          loading={busy}
          disabled={busy}
          size="lg"
          fullWidth
          icon={!busy ? <Ionicons name="share-outline" size={ICON.md} color={COLORS.onPrimary} /> : undefined}
        />
      </View>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  serviceLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  serviceValue: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '600',
    flexShrink: 1,
  },
  addressBlock: {
    marginTop: SPACING.sm,
  },
  miniLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addr: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '500',
    marginTop: 2,
  },
  proofCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: SPACING.sm,
  },
  proofHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  proofTitle: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  proofPhoto: {
    width: '100%',
    // Fixed ratio rather than a fixed height: courier photos arrive in
    // whatever aspect the phone camera produced, and a fixed height either
    // letterboxes them or crops the doorway out of the frame.
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceVariant,
  },
  proofPhotoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  proofFallbackText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.gutter,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
  },
});
