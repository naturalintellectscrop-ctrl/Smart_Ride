// ============================================
// SMART RIDE MOBILE - SHARED UI COMPONENTS
// ============================================
// Reusable components matching admin dashboard design
// ============================================

export { Card } from './Card';
export type { CardProps, CardVariant } from './Card';
export { GradientButton } from './GradientButton';
export { ServiceIcon } from './ServiceIcon';
export { StatusBadge } from './StatusBadge';
export { IconInput } from './IconInput';
export { TopUpModal } from './TopUpModal';
export { WithdrawModal } from './WithdrawModal';
export { default as SmartRideMap } from './SmartRideMap';
export type { SmartRideMapProps } from './SmartRideMap';
export { EmptyState, ErrorState, SectionHeader } from './StateViews';
export {
  Skeleton,
  ConversationSkeleton,
  TaskSkeleton,
  OrderSkeleton,
  NotificationSkeleton,
  ListSkeleton,
  DetailSkeleton,
  MapSkeleton,
} from './Skeleton';
export { ListRow } from './ListRow';
export { Toggle } from './Toggle';
export { SuccessCheck } from './SuccessCheck';
export { ReceiptCard } from './ReceiptCard';
export type { ReceiptLine } from './ReceiptCard';
export { Select } from './Select';
export type { SelectOption } from './Select';
export { UploadField } from './UploadField';
export { ConfirmDialog } from './ConfirmDialog';
export { OfflineBanner } from './OfflineBanner';
export { Avatar } from './Avatar';
export { BottomNav } from './BottomNav';
export { Rating } from './Rating';
export { SegmentedControl } from './SegmentedControl';
export { CountBadge } from './CountBadge';
export { AppHeader } from './AppHeader';
export { SearchInput } from './SearchInput';
export { Chip } from './Chip';
export { OnlinePill } from './OnlinePill';
export { SmartBottomSheet } from './SmartBottomSheet';
export { RideTimeline } from './RideTimeline';
// Dialogs: the imperative `Alert` / `toast` from './feedback' is the primary
// system (see DS spec §9). `ConfirmDialog` above is its declarative half — the
// only confirm that can stay mounted in a `loading` state while the action it
// confirms is in flight, which an imperative alert cannot express.
//
// `SmartRideModal` is deliberately NOT re-exported here. It is the internal
// renderer for the feedback host and takes `{ config: ModalConfig }`, so the
// old `SmartRideModal as SmartDialog` alias named something no caller could
// actually use; it had zero usages.
