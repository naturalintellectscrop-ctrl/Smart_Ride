// ============================================
// SMART RIDE — JourneyShell
// ============================================
// The one layout every in-journey screen uses: live map behind, persistent task
// panel in front, one primary action at the bottom.
//
// The shell owns the map's routing on purpose. "The map should not continue
// displaying the previous route after the task state changes" is the kind of rule
// that gets forgotten in a screen rewrite, so the leg is computed here from the
// authoritative task status — every consumer gets correct re-routing for free and
// none of them can opt out of it.
//
// Structure, top to bottom:
//   map (fills)  →  header overlay  →  ETA pill  →  panel
//   panel: status header → banner slot → scrollable detail → pinned actions
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../AppHeader';
import { Card } from '../Card';
import { SmartRideMap, ProviderKind } from '../SmartRideMap';
import { StatusBadge } from '../StatusBadge';
import { useLiveRoute } from '../../hooks/useLiveRoute';
import { statusColor as semanticStatusColor } from '../../theme/statusColors';
import { SPACING, RADIUS, TYPOGRAPHY, ICON } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';
import { DEFAULT_LOCATION } from '../../constants';
import { mapLegFor, isRideType, isTerminal } from './journeyCopy';
import type { Coord } from '../../utils/ride';
import type { Task } from '../../types';

/** Which branded marker family this service's provider gets on the map. */
function providerKind(taskType?: string): ProviderKind {
  switch (taskType) {
    case 'SMART_CAR_RIDE':
      return 'car';
    case 'SMART_BODA_RIDE':
      return 'boda';
    case 'ITEM_DELIVERY':
      return 'parcel';
    case 'SHOPPING':
      return 'errand';
    default:
      return 'delivery';
  }
}

/** Short service label. A food delivery must never read "Car". */
function serviceLabel(taskType?: string): string {
  switch (taskType) {
    case 'SMART_BODA_RIDE':
      return 'Boda';
    case 'SMART_CAR_RIDE':
      return 'Car';
    case 'FOOD_DELIVERY':
      return 'Food';
    case 'SHOPPING':
      return 'Shopping';
    case 'ITEM_DELIVERY':
      return 'Parcel';
    case 'SMART_HEALTH_DELIVERY':
      return 'Health';
    default:
      return 'Task';
  }
}

interface JourneyShellProps {
  task: Task;
  /** Headline for the panel — what is happening now. */
  title: string;
  /** One line under it — what to do, or what happens next. */
  subtitle?: string;
  /** Short status chip label. */
  chip: string;
  /**
   * The provider's live position. Origin of the live route, and the driver
   * marker. Omit on the customer's side, where the driver's position arrives
   * over realtime instead.
   */
  originLocation?: Coord | null;
  /** Panel detail content. Scrolls. */
  children: React.ReactNode;
  /** Pinned below the scroll — the action block. */
  actions?: React.ReactNode;
  /** Above the detail: geofence hints, error banners, offline notices. */
  banner?: React.ReactNode;
  headerTitle?: string;
  onBack?: () => void;
  style?: ViewStyle;
}

export function JourneyShell({
  task,
  title,
  subtitle,
  chip,
  originLocation,
  children,
  actions,
  banner,
  headerTitle,
  onBack,
  style,
}: JourneyShellProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const pickup = useMemo<Coord | null>(
    () =>
      task.pickupLatitude != null && task.pickupLongitude != null
        ? { latitude: task.pickupLatitude, longitude: task.pickupLongitude }
        : null,
    [task.pickupLatitude, task.pickupLongitude]
  );

  const dropoff = useMemo<Coord | null>(
    () =>
      task.dropoffLatitude != null && task.dropoffLongitude != null
        ? { latitude: task.dropoffLatitude, longitude: task.dropoffLongitude }
        : null,
    [task.dropoffLatitude, task.dropoffLongitude]
  );

  // The live leg. Changing status changes the target, which is what makes
  // useLiveRoute drop the old polyline and fetch the new one.
  const leg = mapLegFor(task.status, task.taskType);
  const legTarget = leg === 'TO_PICKUP' ? pickup : leg === 'TO_DROPOFF' ? dropoff : null;

  const ride = isRideType(task.taskType);
  const route = useLiveRoute(originLocation ?? null, legTarget, ride ? 24 : 20);

  const statusTint = semanticStatusColor(task.status, COLORS);
  const terminal = isTerminal(task.status);

  // Only show the destination marker once it is the live leg — a drop-off pin
  // sitting on the map while the driver is still heading to pickup invites them
  // to navigate to the wrong end of the job.
  const showDropoffMarker = leg === 'TO_DROPOFF' || terminal;

  const etaMinutes = route.durationMin;
  const remainingKm = route.distanceKm;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.mapWorkspace}>
        <SmartRideMap
          style={StyleSheet.absoluteFill}
          initialLatitude={
            originLocation?.latitude ?? pickup?.latitude ?? DEFAULT_LOCATION.latitude
          }
          initialLongitude={
            originLocation?.longitude ?? pickup?.longitude ?? DEFAULT_LOCATION.longitude
          }
          pickup={pickup ? { ...pickup, title: 'Pickup' } : undefined}
          dropoff={
            showDropoffMarker && dropoff ? { ...dropoff, title: 'Destination' } : undefined
          }
          driverLocation={originLocation ?? undefined}
          driverKind={providerKind(task.taskType)}
          driverState={leg === 'TO_DROPOFF' ? 'busy' : 'assigned'}
          routeCoordinates={route.routeCoordinates}
          showUserLocation
        />

        {!!headerTitle && (
          <AppHeader title={headerTitle} onBack={onBack} style={styles.headerOverlay} />
        )}

        {/* ETA / distance for the CURRENT leg. Suppressed on terminal states,
            where there is nothing left to travel. */}
        {!terminal && (etaMinutes != null || remainingKm != null) && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.etaPill}>
            <Ionicons name="time-outline" size={ICON.xs} color={COLORS.onSurface} />
            <Text style={styles.etaText}>
              {etaMinutes != null ? `${Math.max(1, Math.round(etaMinutes))} min` : '—'}
              {remainingKm != null ? ` · ${remainingKm.toFixed(1)} km` : ''}
            </Text>
            <Text style={styles.etaLeg}>
              {leg === 'TO_PICKUP' ? 'to pickup' : 'to drop-off'}
            </Text>
          </Animated.View>
        )}
      </View>

      <Animated.View entering={SlideInDown.duration(400).springify()} style={styles.panelWrap}>
        <Card variant="elevated" padding={SPACING.lg} radius={RADIUS.xl} style={styles.panel}>
          <View style={styles.statusHeader}>
            <View style={styles.statusHeaderLeft}>
              <Text style={[styles.chip, { color: statusTint }]}>{chip}</Text>
              <Text style={styles.title}>{title}</Text>
              {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              <Text style={styles.taskNumber}>{task.taskNumber}</Text>
            </View>
            <StatusBadge label={serviceLabel(task.taskType)} color={statusTint} size="md" />
          </View>

          {!!banner && <View style={styles.bannerSlot}>{banner}</View>}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>

          {!!actions && <View style={styles.actionsSlot}>{actions}</View>}
        </Card>
      </Animated.View>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.surface,
    },
    mapWorkspace: {
      flex: 1,
    },
    headerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'transparent',
    },
    etaPill: {
      position: 'absolute',
      top: 110,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
    },
    etaText: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
      fontWeight: '700',
    },
    etaLeg: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
    },
    panelWrap: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '68%',
    },
    panel: {
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      // Without this the card ignores panelWrap's maxHeight: a flex child does
      // not shrink below its content unless told to, so the 68% cap bounded
      // nothing and the card ran off the bottom of the screen.
      flexShrink: 1,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: SPACING.md,
      marginBottom: SPACING.md,
    },
    statusHeaderLeft: {
      flex: 1,
      gap: 2,
    },
    chip: {
      ...TYPOGRAPHY.labelMd,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    title: {
      ...TYPOGRAPHY.headlineMd,
      color: COLORS.onSurface,
    },
    subtitle: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
    },
    taskNumber: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.outlineVariant,
      marginTop: SPACING.xs,
    },
    bannerSlot: {
      marginBottom: SPACING.md,
    },
    scroll: {
      // The detail region is the part that gives way when the panel runs out
      // of room, which is the whole reason it is a ScrollView.
      //
      // flexGrow: 0 stopped it expanding, but nothing let it SHRINK, so the
      // ScrollView always sized to its full content. The card grew past the
      // wrapper's maxHeight and the pinned action block — the primary
      // "Accept job" / "Confirm pickup" button — was pushed off the bottom of
      // the screen. Observed on a real device: a driver holding an assigned
      // ride had no way to advance it, and the panel would not scroll because
      // there was nothing to scroll; the overflow was outside the viewport,
      // not inside the list.
      //
      // Longer trips make it worse, since every extra progress step adds
      // height above the actions.
      flexGrow: 0,
      flexShrink: 1,
    },
    scrollContent: {
      gap: SPACING.md,
      paddingBottom: SPACING.sm,
    },
    actionsSlot: {
      marginTop: SPACING.md,
    },
  });
