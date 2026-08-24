// ============================================
// SMART RIDE MOBILE - CLIENT SURFACE
// ============================================
// The shared vocabulary for the client-facing tabs (home, rides, orders,
// wallet, profile). Same shape rule as the auth surface:
//
//   cards and fields   RADIUS.lg (16)
//   pills and CTAs     RADIUS.full
//   icon plates        RADIUS.md (12)
//
// Colours come from the derived surface tokens in theme/themedColors.ts
// (tintSurface / cardSurface / hairlineSoft), never from literals.
// ============================================

export { GreetingHeader } from './GreetingHeader';
export type { GreetingHeaderAction } from './GreetingHeader';
export { LocationPill } from './LocationPill';
export { WalletCard } from './WalletCard';
export { HomeSearchRow } from './HomeSearchRow';
export { SectionHeading } from './SectionHeading';
export { ServiceTile, SERVICE_TILE_WIDTH } from './ServiceTile';
export { QuickRideCard } from './QuickRideCard';
