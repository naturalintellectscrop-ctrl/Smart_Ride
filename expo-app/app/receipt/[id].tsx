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
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';

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
const paymentLabel = (m?: string, s?: string) =>
  m === 'CASH' && s && s !== 'COMPLETED' ? 'Cash (to be paid)' : (m && PAYMENT_LABEL[m]) || 'Mobile Money';
const stars = (r?: number) => (r ? '★★★★★☆☆☆☆☆'.slice(5 - Math.round(Math.min(5, r)), 10 - Math.round(Math.min(5, r))) : '');

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

  const buildHtml = useCallback((r: any) => {
    const lines: Array<{ label: string; amount: number }> = Array.isArray(r.breakdown) ? r.breakdown : [];
    const row = (l: string, v: string, b = false) =>
      `<tr><td style="padding:6px 0;color:#5b6b63;font-size:13px">${l}</td><td style="padding:6px 0;text-align:right;font-size:13px;${b ? 'font-weight:700' : ''}">${v}</td></tr>`;
    const bd = lines.map((l) => row(l.label, `${l.amount < 0 ? '-' : ''}${money(Math.abs(l.amount), r.currency)}`)).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="font-family:-apple-system,Roboto,sans-serif;background:#f3f5f4;margin:0;padding:16px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
      <div style="background:#005f3a;padding:22px 24px"><div style="color:#fff;font-size:20px;font-weight:800">SMART RIDE</div>
      <div style="color:#cfe9dd;font-size:13px;margin-top:4px">Thank you for choosing Smart Ride.</div></div>
      <div style="padding:24px">
        <div style="font-size:11px;color:#8a978f;text-transform:uppercase">Total Paid</div>
        <div style="font-size:32px;font-weight:800;color:#0d1b14">${money(r.total, r.currency)}</div>
        <div style="font-size:13px;color:#5b6b63;margin-top:4px">Paid via ${paymentLabel(r.paymentMethod, r.paymentStatus)}</div>
        <table style="width:100%;border-top:1px solid #eef1ef;margin-top:16px;padding-top:8px">
          ${row('Receipt Number', r.receiptNumber, true)}${row('Date', fmtDate(r.issuedAt))}
          ${r.serviceLabel ? row('Service', r.serviceLabel) : ''}${r.vehicleType ? row('Vehicle Type', r.vehicleType) : ''}
          ${r.distanceKm ? row('Distance', `${Number(r.distanceKm).toFixed(1)} km`) : ''}${r.durationMin ? row('Duration', `${r.durationMin} min`) : ''}
        </table>
        ${r.pickupAddress || r.dropoffAddress ? `<div style="border-top:1px solid #eef1ef;margin-top:12px;padding-top:12px">
          ${r.pickupAddress ? `<div style="font-size:11px;color:#8a978f">PICKUP</div><div style="font-size:14px;margin-bottom:8px">${r.pickupAddress}</div>` : ''}
          ${r.dropoffAddress ? `<div style="font-size:11px;color:#8a978f">DROPOFF</div><div style="font-size:14px">${r.dropoffAddress}</div>` : ''}</div>` : ''}
        <div style="border-top:1px solid #eef1ef;margin-top:12px;padding-top:12px"><div style="font-size:11px;color:#8a978f">FARE BREAKDOWN</div>
        <table style="width:100%">${bd}<tr><td colspan=2 style="border-top:1px solid #eef1ef;padding-top:6px"></td></tr>${row('Total', money(r.total, r.currency), true)}</table></div>
        ${r.providerName ? `<div style="border-top:1px solid #eef1ef;margin-top:12px;padding-top:12px"><div style="font-size:11px;color:#8a978f">YOUR ${r.type === 'RIDE' ? 'RIDER' : 'PROVIDER'}</div>
        <div style="font-size:16px;font-weight:600">${r.providerName}</div><div style="color:#f5a623">${stars(r.providerRating)}</div></div>` : ''}
        <div style="border-top:1px solid #eef1ef;margin-top:16px;padding-top:12px;text-align:center;font-size:12px;color:#5b6b63">
          Need help? <a href="mailto:support@smartride.ug" style="color:#005f3a">support@smartride.ug</a><br/>
          <span style="color:#8a978f">Natural Intellects · Kampala, Uganda</span></div>
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
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }
  if (error || !receipt) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="receipt-outline" size={48} color={COLORS.onSurfaceVariant} />
        <Text style={styles.errText}>{error || 'Receipt not found'}</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}><Text style={styles.secondaryBtnText}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const lines: Array<{ label: string; amount: number }> = Array.isArray(receipt.breakdown) ? receipt.breakdown : [];

  return (
    <View style={styles.container}>
      <View style={[styles.appbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.appbarTitle}>Receipt</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.brandBar}>
            <Text style={styles.brand}>SMART RIDE</Text>
            <Text style={styles.brandSub}>Thank you for choosing Smart Ride.</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.totalLabel}>TOTAL PAID</Text>
            <Text style={styles.total}>{money(receipt.total, receipt.currency)}</Text>
            <Text style={styles.paidVia}>Paid via {paymentLabel(receipt.paymentMethod, receipt.paymentStatus)}</Text>

            <View style={styles.section}>
              <Row label="Receipt Number" value={receipt.receiptNumber} strong COLORS={COLORS} />
              <Row label="Date" value={fmtDate(receipt.issuedAt)} COLORS={COLORS} />
              {receipt.serviceLabel ? <Row label="Service" value={receipt.serviceLabel} COLORS={COLORS} /> : null}
              {receipt.vehicleType ? <Row label="Vehicle Type" value={receipt.vehicleType} COLORS={COLORS} /> : null}
              {receipt.distanceKm ? <Row label="Distance" value={`${Number(receipt.distanceKm).toFixed(1)} km`} COLORS={COLORS} /> : null}
              {receipt.durationMin ? <Row label="Duration" value={`${receipt.durationMin} min`} COLORS={COLORS} /> : null}
            </View>

            {(receipt.pickupAddress || receipt.dropoffAddress) ? (
              <View style={styles.section}>
                {receipt.pickupAddress ? (<><Text style={styles.miniLabel}>PICKUP</Text><Text style={styles.addr}>{receipt.pickupAddress}</Text></>) : null}
                {receipt.dropoffAddress ? (<><Text style={[styles.miniLabel, { marginTop: 8 }]}>DROPOFF</Text><Text style={styles.addr}>{receipt.dropoffAddress}</Text></>) : null}
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.miniLabel}>FARE BREAKDOWN</Text>
              {lines.map((l, i) => (
                <Row key={i} label={l.label} value={`${l.amount < 0 ? '-' : ''}${money(Math.abs(l.amount), receipt.currency)}`} COLORS={COLORS} />
              ))}
              <View style={styles.hr} />
              <Row label="Total" value={money(receipt.total, receipt.currency)} strong COLORS={COLORS} />
            </View>

            {receipt.providerName ? (
              <View style={styles.section}>
                <Text style={styles.miniLabel}>YOUR {receipt.type === 'RIDE' ? 'RIDER' : 'PROVIDER'}</Text>
                <Text style={styles.provider}>{receipt.providerName}</Text>
                {receipt.providerRating ? <Text style={styles.starsTxt}>{stars(receipt.providerRating)}</Text> : null}
              </View>
            ) : null}

            <View style={[styles.section, { alignItems: 'center' }]}>
              <Text style={styles.help}>Need help? support@smartride.ug</Text>
              <Text style={styles.footer}>Natural Intellects · Kampala, Uganda</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleShare} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color={COLORS.onPrimary} /> : (
            <><Ionicons name="share-outline" size={18} color={COLORS.onPrimary} /><Text style={styles.primaryBtnText}>Share / Download PDF</Text></>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ label, value, strong, COLORS }: { label: string; value: string; strong?: boolean; COLORS: ThemedColors }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: COLORS.onSurfaceVariant, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: COLORS.onSurface, fontSize: 13, fontWeight: strong ? '700' : '400', flexShrink: 1, textAlign: 'right', marginLeft: 12 }}>{value}</Text>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  appbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  appbarTitle: { ...TYPOGRAPHY.headlineMd, color: COLORS.onSurface },
  content: { padding: SPACING.md },
  card: { backgroundColor: COLORS.surfaceContainerLowest, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.outlineVariant },
  brandBar: { backgroundColor: COLORS.primary, padding: SPACING.lg },
  brand: { color: COLORS.onPrimary, fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  brandSub: { color: COLORS.onPrimary, opacity: 0.85, fontSize: 12, marginTop: 4 },
  body: { padding: SPACING.lg },
  totalLabel: { fontSize: 11, color: COLORS.onSurfaceVariant, letterSpacing: 0.5 },
  total: { fontSize: 32, fontWeight: '800', color: COLORS.onSurface, lineHeight: 36 },
  paidVia: { fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 4 },
  section: { borderTopWidth: 1, borderTopColor: COLORS.outlineVariant, marginTop: SPACING.md, paddingTop: SPACING.md },
  miniLabel: { fontSize: 11, color: COLORS.onSurfaceVariant, letterSpacing: 0.5, marginBottom: 6 },
  addr: { fontSize: 14, color: COLORS.onSurface },
  hr: { height: 1, backgroundColor: COLORS.outlineVariant, marginVertical: 8 },
  provider: { fontSize: 16, fontWeight: '600', color: COLORS.onSurface },
  starsTxt: { color: '#f5a623', fontSize: 15, letterSpacing: 2, marginTop: 2 },
  help: { fontSize: 12, color: COLORS.onSurfaceVariant },
  footer: { fontSize: 12, color: COLORS.onSurfaceVariant, opacity: 0.7, marginTop: 6 },
  actions: { padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.outlineVariant, backgroundColor: COLORS.surface },
  primaryBtn: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: SPACING.md, borderRadius: RADIUS.lg },
  primaryBtnText: { color: COLORS.onPrimary, ...TYPOGRAPHY.bodyMd, fontWeight: '600' },
  secondaryBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.outline },
  secondaryBtnText: { color: COLORS.onSurface, ...TYPOGRAPHY.bodyMd },
  errText: { color: COLORS.onSurfaceVariant, ...TYPOGRAPHY.bodyMd, textAlign: 'center' },
});
