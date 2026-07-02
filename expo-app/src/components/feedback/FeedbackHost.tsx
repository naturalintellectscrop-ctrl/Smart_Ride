// ============================================
// SMART RIDE MOBILE - FEEDBACK HOST
// ============================================
// Mounted ONCE near the app root (app/_layout.tsx). Renders the branded modal
// (one at a time from the queue) and the toast stack. This is what makes the
// imperative Alert/toast helpers work from anywhere in the app.
// ============================================

import React from 'react';
import { useFeedbackStore } from './feedbackStore';
import { SmartRideModal } from './SmartRideModal';
import { SmartRideToastHost } from './SmartRideToast';

export function FeedbackHost() {
  const modals = useFeedbackStore((s) => s.modals);
  const toasts = useFeedbackStore((s) => s.toasts);
  const current = modals[0];

  return (
    <>
      {current ? <SmartRideModal key={current.id} config={current} /> : null}
      <SmartRideToastHost toasts={toasts} />
    </>
  );
}
