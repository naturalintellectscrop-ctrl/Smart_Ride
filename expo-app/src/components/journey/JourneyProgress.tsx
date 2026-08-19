// ============================================
// SMART RIDE — JourneyProgress
// ============================================
// The journey trail for an active task, rendered with the shared RideTimeline so
// it looks identical to the stepper the customer already sees on ride tracking.
//
// Steps come from `journeyMilestones()`, which derives them from the task's own
// state-machine-written timestamps plus the server's `allowedTransitions`. That
// is why this component takes a Task and not a step list: the whole point is
// that no screen gets to invent the steps.
// ============================================

import React, { useMemo } from 'react';
import { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RideTimeline, TimelineStep } from '../RideTimeline';
import { journeyMilestones } from './journeyCopy';
import type { Task, TaskStatus } from '../../types';

/** Icon per milestone, so the trail reads at a glance. */
const MILESTONE_ICON: Partial<Record<TaskStatus, keyof typeof Ionicons.glyphMap>> = {
  ASSIGNED: 'clipboard-outline',
  ACCEPTED: 'checkmark-circle-outline',
  ARRIVING: 'navigate-outline',
  ARRIVED: 'location-outline',
  PICKED_UP: 'cube-outline',
  IN_PROGRESS: 'car-outline',
  IN_TRANSIT: 'navigate',
  DELIVERING: 'home-outline',
  DELIVERED: 'checkmark-done-outline',
  COMPLETED: 'flag-outline',
};

/** Local clock time — the trail is read in the moment, so the date is noise. */
function shortTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface JourneyProgressProps {
  task: Task;
  style?: ViewStyle;
}

export function JourneyProgress({ task, style }: JourneyProgressProps) {
  const steps = useMemo<TimelineStep[]>(
    () =>
      journeyMilestones(task).map((m) => ({
        id: m.id,
        label: m.label,
        status: m.state,
        icon: MILESTONE_ICON[m.id],
        // Only completed milestones get a time. A pending step with a timestamp
        // would be claiming something happened that has not.
        timestamp: m.state === 'completed' ? shortTime(m.timestamp) : undefined,
      })),
    [task]
  );

  if (steps.length === 0) return null;

  return <RideTimeline steps={steps} style={style} />;
}
