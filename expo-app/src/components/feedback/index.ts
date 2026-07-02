// ============================================
// SMART RIDE MOBILE - FEEDBACK (public API)
// ============================================
// Drop-in, branded replacement for React Native's Alert + a toast helper.
//
// Usage (identical signature to RN Alert — just change the import source):
//   import { Alert } from '@/src/components/feedback';
//   Alert.alert('Submission Failed', "We couldn't submit your application.", [
//     { text: 'Try Again', onPress: retry },
//   ]);
//
// Or lightweight, non-blocking feedback:
//   import { toast } from '@/src/components/feedback';
//   toast.success('Profile updated');
//   toast.error('Could not save changes');
//
// The visual STATE (success / warning / error / info) is inferred from the
// title + button styles, so existing call sites rebrand with no code changes.
// ============================================

import { useFeedbackStore, FeedbackType, FeedbackButton } from './feedbackStore';

export { FeedbackHost } from './FeedbackHost';
export type { FeedbackType, FeedbackButton } from './feedbackStore';

const SUCCESS_RE = /success|sent|complete|completed|saved|added|approved|confirmed|updated|submitted|welcome|congrat/i;
const ERROR_RE = /error|fail|failed|invalid|denied|unable|couldn|could not|cannot|can't|wrong|not found|unavailable|expired|rejected|declined|insufficient|required|missing/i;
const WARNING_RE = /warning|are you sure|sure\?|cancel|delete|remove|discard|leave|log ?out|sign ?out|permission|confirm|attention/i;

/**
 * Infer the feedback state from the alert's title and buttons so we can pick
 * the right icon + colour without changing any call sites.
 */
function inferType(title?: string, message?: string, buttons?: FeedbackButton[]): FeedbackType {
  const hay = `${title || ''} ${message || ''}`;
  // A destructive button means this is a warning/confirmation, not plain info.
  if (buttons?.some((b) => b.style === 'destructive')) return 'warning';
  if (SUCCESS_RE.test(title || '')) return 'success';
  if (ERROR_RE.test(hay)) return 'error';
  if (WARNING_RE.test(hay)) return 'warning';
  return 'info';
}

/**
 * React Native Alert-compatible shim. Same signature as Alert.alert so it is a
 * drop-in replacement, but renders the Smart Ride branded modal.
 */
function alert(
  title: string,
  message?: string,
  buttons?: FeedbackButton[],
  options?: { cancelable?: boolean },
): void {
  useFeedbackStore.getState().pushModal({
    type: inferType(title, message, buttons),
    title,
    message,
    buttons: buttons && buttons.length ? buttons : [{ text: 'OK' }],
    cancelable: options?.cancelable !== false,
  });
}

export const Alert = { alert };

/** Imperative branded toast helper for quick, non-blocking feedback. */
export const toast = {
  show: (message: string, type: FeedbackType = 'info', title?: string, duration = 3000) =>
    useFeedbackStore.getState().pushToast({ message, type, title, duration }),
  success: (message: string, title?: string) => toast.show(message, 'success', title),
  error: (message: string, title?: string) => toast.show(message, 'error', title),
  warning: (message: string, title?: string) => toast.show(message, 'warning', title),
  info: (message: string, title?: string) => toast.show(message, 'info', title),
};
