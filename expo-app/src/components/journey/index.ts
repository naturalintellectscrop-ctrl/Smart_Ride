// ============================================
// SMART RIDE — In-Journey Task Shell
// ============================================
// One design language for the whole span from "task assigned" to "money
// settled", across rides, item delivery, food, shopping and health tasks.
//
// The rule the whole module is built around: the BACKEND owns what is possible.
// Screens read `task.allowedTransitions` (published by GET /api/tasks/[id] from
// the same state machine the transition endpoint enforces) and choose which of
// those to present. Nothing here defines a lifecycle.
// ============================================

export { JourneyShell } from './JourneyShell';
export { JourneyProgress } from './JourneyProgress';
export { JourneyActions } from './JourneyActions';
export type { JourneySecondaryAction } from './JourneyActions';
export { JourneyBanner } from './JourneyBanner';
export { TaskPaymentPanel } from './TaskPaymentPanel';
export type { BannerTone } from './JourneyBanner';

export {
  isRideType,
  isTerminal,
  pickPrimaryTransition,
  requiresProof,
  canCancel,
  mapLegFor,
  providerCopy,
  journeyMilestones,
} from './journeyCopy';
export type {
  JourneyRole,
  JourneyLeg,
  JourneyStateCopy,
  JourneyMilestone,
} from './journeyCopy';

export { translateTaskError, translatePaymentError } from './taskErrors';
export type { JourneyError, JourneyErrorAction } from './taskErrors';
