// ============================================
// SMART RIDE MOBILE — PHARMACY DESIGN KIT
// ============================================
// The pharmacy surface has its own visual language: a light, clinical ground,
// green as the single brand colour, and colour used to say what a number MEANS
// rather than for decoration — amber for work waiting, blue for work in flight,
// green for work done. Money always sits on the one dark green field so it is
// never mistaken for an ordinary statistic.
//
// These primitives exist so every pharmacy screen is built from the same parts
// instead of each one inventing its own cards. They sit on top of the app's
// Card/theme tokens rather than replacing them, so dark mode keeps working.
// ============================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';

// ── Palette ──────────────────────────────────────────────────────────────
// Tone pairs: a pale fill for the tile, a saturated ink for the number and
// icon. Written out for both schemes because the pastel fills that carry this
// design in daylight become mud when inverted.

export type Tone = 'amber' | 'blue' | 'green' | 'violet' | 'slate';

export interface ToneColors {
  fill: string;
  chip: string;
  ink: string;
  border: string;
}

export function toneColors(tone: Tone, isDark: boolean): ToneColors {
  const light: Record<Tone, ToneColors> = {
    amber: { fill: '#FEF6E7', chip: '#FDECC8', ink: '#B45309', border: '#F6E3BE' },
    blue: { fill: '#EFF6FF', chip: '#DBEAFE', ink: '#1D4ED8', border: '#DCE9FD' },
    green: { fill: '#ECFDF3', chip: '#D1FADF', ink: '#047857', border: '#D3F5E1' },
    violet: { fill: '#F5F3FF', chip: '#EDE9FE', ink: '#6D28D9', border: '#E9E5FD' },
    slate: { fill: '#F4F6F8', chip: '#E6EAEF', ink: '#334155', border: '#E4E8ED' },
  };
  const dark: Record<Tone, ToneColors> = {
    amber: { fill: '#2A2115', chip: '#3A2D19', ink: '#F5C265', border: '#3A2D19' },
    blue: { fill: '#141F2E', chip: '#1B2C42', ink: '#8AB4F8', border: '#1B2C42' },
    green: { fill: '#132720', chip: '#1A3A2C', ink: '#6EE7A8', border: '#1A3A2C' },
    violet: { fill: '#1E1A2E', chip: '#2A2440', ink: '#C4B5FD', border: '#2A2440' },
    slate: { fill: '#1B1F1E', chip: '#262B29', ink: '#C3CBC7', border: '#262B29' },
  };
  return (isDark ? dark : light)[tone];
}

/** The one dark field money lives on. */
export const MONEY_FIELD = '#064E32';
export const MONEY_FIELD_DEEP = '#03301F';

export function usePharmacyTheme() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  return { isDark, COLORS };
}

// ── Section heading ──────────────────────────────────────────────────────

export function SectionTitle({
  title,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { COLORS } = usePharmacyTheme();
  return (
    <View style={[kit.sectionRow, style]}>
      <Text style={[kit.sectionTitle, { color: COLORS.onSurface }]}>{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={kit.sectionAction}
        >
          <Text style={[kit.sectionActionText, { color: COLORS.primary }]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={15} color={COLORS.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────
// A number, what it counts, and a way to go and do something about it. The
// "View details" line is not decoration: a count with no way through to the
// list behind it is a dead end.

export function StatTile({
  tone,
  icon,
  value,
  label,
  onPress,
  actionLabel = 'View details',
}: {
  tone: Tone;
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
  onPress?: () => void;
  actionLabel?: string;
}) {
  const { isDark } = usePharmacyTheme();
  const t = toneColors(tone, isDark);

  return (
    <TouchableOpacity
      style={[kit.statTile, { backgroundColor: t.fill, borderColor: t.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${value} ${label}`}
    >
      <View style={[kit.statChip, { backgroundColor: t.chip }]}>
        <Ionicons name={icon} size={18} color={t.ink} />
      </View>
      <Text style={[kit.statValue, { color: t.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      {/* Two lines, because "Needs action" does not fit on one at a large font
          scale and a label clipped to "Needs acti…" says nothing. */}
      <Text
        style={[kit.statLabel, { color: t.ink }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
      {onPress ? (
        <View style={kit.statAction}>
          <Text style={[kit.statActionText, { color: t.ink }]} numberOfLines={1}>
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={13} color={t.ink} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ── Money hero ───────────────────────────────────────────────────────────

export function MoneyHero({
  caption,
  amount,
  meta,
  primaryLabel,
  onPrimary,
  trailing,
  busy,
}: {
  caption: string;
  amount: string;
  meta?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  trailing?: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <View style={kit.money}>
      <View style={kit.moneyTop}>
        <Text style={kit.moneyCaption}>{caption}</Text>
        {trailing}
      </View>
      <Text style={kit.moneyAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
        {amount}
      </Text>
      {meta ? <Text style={kit.moneyMeta}>{meta}</Text> : null}
      {primaryLabel && onPrimary ? (
        <TouchableOpacity
          style={kit.moneyButton}
          onPress={onPrimary}
          disabled={busy}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={kit.moneyButtonText}>{primaryLabel}</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/**
 * A week of takings, drawn as an area. Deliberately unlabelled beyond the day
 * initials — it answers "which way is this going", not "what exactly was
 * Tuesday", which the earnings screen answers properly.
 */
export function Sparkline({
  values,
  labels,
  height = 66,
}: {
  values: number[];
  labels?: string[];
  height?: number;
}) {
  const max = Math.max(...values, 1);
  return (
    <View style={[kit.spark, { height: height + 16 }]}>
      <View style={[kit.sparkPlot, { height }]}>
        {values.map((v, i) => (
          <View key={i} style={kit.sparkCol}>
            <View
              style={[
                kit.sparkBar,
                {
                  height: Math.max(3, (v / max) * (height - 6)),
                  backgroundColor: v > 0 ? '#5BE9A6' : 'rgba(255,255,255,0.18)',
                },
              ]}
            />
          </View>
        ))}
      </View>
      {labels ? (
        <View style={kit.sparkLabels}>
          {/* Seven labels across half a card is one character each. "Mon" was
              arriving as "M…", which is a truncated word rather than an
              initial — worse than the initial it was trying to be. */}
          {labels.map((l, i) => (
            <Text key={i} style={kit.sparkLabel} numberOfLines={1}>
              {l.length > 2 ? l.charAt(0) : l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── Action tile ──────────────────────────────────────────────────────────

export function ActionTile({
  icon,
  title,
  subtitle,
  onPress,
  tone = 'green',
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  tone?: Tone;
  badge?: number;
}) {
  const { isDark, COLORS } = usePharmacyTheme();
  const t = toneColors(tone, isDark);

  return (
    <TouchableOpacity
      style={[
        kit.action,
        { backgroundColor: COLORS.backgroundElevated, borderColor: COLORS.border },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <View style={[kit.actionChip, { backgroundColor: t.chip }]}>
        <Ionicons name={icon} size={19} color={t.ink} />
        {badge && badge > 0 ? (
          <View style={kit.actionBadge}>
            <Text style={kit.actionBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </View>
      {/* No chevron. The whole tile is the target, and on a 2-across grid the
          arrow was taking the room the words needed — "Prescriptions" arrived
          as "Prescr…" and "Manage stock" as "Manage…". An affordance that costs
          you the label is not worth having. */}
      <View style={kit.actionText}>
        <Text
          style={[kit.actionTitle, { color: COLORS.onSurface }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {title}
        </Text>
        <Text
          style={[kit.actionSubtitle, { color: COLORS.onSurfaceVariant }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Overview row ─────────────────────────────────────────────────────────

export function OverviewRow({
  icon,
  tone = 'green',
  title,
  subtitle,
  value,
  valueTone,
  right,
  onPress,
  first,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  title: string;
  subtitle?: string;
  value?: string | number;
  valueTone?: Tone;
  right?: React.ReactNode;
  onPress?: () => void;
  first?: boolean;
}) {
  const { isDark, COLORS } = usePharmacyTheme();
  const t = toneColors(tone, isDark);
  const vt = valueTone ? toneColors(valueTone, isDark) : null;

  const body = (
    <View style={[kit.row, !first && { borderTopWidth: 1, borderTopColor: COLORS.outlineVariant }]}>
      <View style={[kit.rowChip, { backgroundColor: t.chip }]}>
        <Ionicons name={icon} size={17} color={t.ink} />
      </View>
      <View style={kit.rowText}>
        <Text style={[kit.rowTitle, { color: COLORS.onSurface }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[kit.rowSubtitle, { color: COLORS.onSurfaceVariant }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ??
        (value !== undefined ? (
          <Text style={[kit.rowValue, { color: vt ? vt.ink : COLORS.onSurface }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null)}
      {onPress ? <Ionicons name="chevron-forward" size={17} color={COLORS.outline} /> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={title}>
      {body}
    </TouchableOpacity>
  );
}

export function Panel({
  children,
  style,
  padding = 0,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  const { COLORS } = usePharmacyTheme();
  return (
    <View
      style={[
        kit.panel,
        { backgroundColor: COLORS.backgroundElevated, borderColor: COLORS.border, padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A small state pill — order status, payment state, stock level. */
export function TonePill({
  label,
  tone,
  icon,
}: {
  label: string;
  tone: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { isDark } = usePharmacyTheme();
  const t = toneColors(tone, isDark);
  return (
    <View style={[kit.pill, { backgroundColor: t.chip }]}>
      {icon ? <Ionicons name={icon} size={12} color={t.ink} style={{ marginRight: 4 }} /> : null}
      <Text style={[kit.pillText, { color: t.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export const kit = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.gutter,
  },
  sectionTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.3, flexShrink: 1 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: SPACING.sm },
  sectionActionText: { fontSize: 13, fontWeight: '600' },

  statTile: {
    flex: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 12,
    minHeight: 140,
    justifyContent: 'flex-start',
  },
  statChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11.5, fontWeight: '600', marginTop: 1, opacity: 0.85, lineHeight: 14 },
  statAction: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 8 },
  statActionText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },

  money: {
    backgroundColor: MONEY_FIELD,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  moneyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  moneyCaption: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  moneyAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 8 },
  moneyMeta: { color: 'rgba(255,255,255,0.68)', fontSize: 12, marginTop: 3 },
  moneyButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    minWidth: 132,
    alignItems: 'center',
  },
  moneyButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  spark: { marginTop: SPACING.md },
  sparkPlot: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  sparkCol: { flex: 1, justifyContent: 'flex-end', alignItems: 'stretch' },
  sparkBar: { borderRadius: 4 },
  sparkLabels: { flexDirection: 'row', gap: 6, marginTop: 6 },
  sparkLabel: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
  },

  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 72,
  },
  actionChip: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  actionBadge: {
    position: 'absolute',
    top: -3,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actionBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  actionText: { flex: 1, minWidth: 0 },
  actionTitle: { fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2 },
  actionSubtitle: { fontSize: 12, marginTop: 1 },

  panel: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
  },
  rowChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  rowSubtitle: { fontSize: 12, marginTop: 1, lineHeight: 16 },
  rowValue: { fontSize: 16, fontWeight: '800' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
    maxWidth: 170,
  },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
});
