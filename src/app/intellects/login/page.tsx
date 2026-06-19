import { redirect } from 'next/navigation';

// =============================================================================
// SMART RIDE — Legacy admin login path
// =============================================================================
// This page used to be the admin login. The login has been moved to
// /intellects/admin for additional obscuration. Any request that lands here
// (e.g. old bookmarks) is immediately redirected to the new path.
//
// The next.config.ts redirects() also covers this path with a permanent 308,
// but this page-level redirect is a belt-and-suspenders fallback in case the
// Next.js redirect layer is bypassed (e.g. during ISR revalidation, or if the
// redirect cache is stale on the client).
// =============================================================================

export default function LegacyAdminLoginPage() {
  redirect('/intellects/admin');
}
