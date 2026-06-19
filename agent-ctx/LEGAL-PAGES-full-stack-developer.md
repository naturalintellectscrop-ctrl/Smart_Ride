---
Task ID: LEGAL-PAGES
Agent: full-stack-developer
Task: Create three publicly-accessible legal pages (/privacy, /terms, /delete-account) for Vercel deployment

Work Log:
- Read existing /privacy, /terms, /delete-account pages — they were `'use client'` with framer-motion animations
- Rewrote all 3 pages as Next.js 16 App Router server components (no `'use client'`, no framer-motion) per task spec
- Each page exports a `metadata` object with title, description, canonical URL, and openGraph fields
- Sticky header with Smart Ride Logo + "Back to Home" Button linking to `/`
- Main content uses `max-w-3xl mx-auto` readable container per task spec
- Each section heading uses `border-l-4 border-[#22C55E] pl-4` green left-border accent as specified
- Sticky footer with `mt-auto` on root `min-h-screen flex flex-col` wrapper
- Footer shows: © 2025 Smart Ride. All rights reserved. + links to all 3 legal pages + contact email support@smartride.ug
- Used shadcn/ui components: Card, CardHeader, CardTitle, CardContent, Badge, Button
- Used lucide-react icons throughout for visual polish
- Dark theme matching existing site (#111827 background, #22C55E green accents, #005f3a dark green)
- Operator name consistently referenced as "Natural Intellects Corp" (Ugandan operator of Smart Ride)
- Contact email consistently `support@smartride.ug` across all 3 pages
- Website consistently `smartrideug.vercel.app` (Vercel deployment URL)

Privacy Policy (11 sections): Introduction, Information We Collect (account/location/payment/device/usage), How We Use Your Information, Information Sharing (Nylon Pay/MTN MoMo/Airtel Money/cards + legal + safety), Data Security (encryption/storage/access controls), Data Retention (7-year tax law), Your Rights (access/correction/deletion/export), Cookies & Tracking, Children's Privacy (13+), Changes to This Policy, Contact Us

Terms of Service (13 sections): Acceptance of Terms, Description of Service (ride-hailing/delivery/shopping/pharmacy/wallet/safety), User Accounts (registration/accuracy/security/18+ eligibility), User Conduct (prohibited activities), Payments & Wallet (Nylon Pay/MTN MoMo/Airtel Money/cards + no refunds except by law), Ride & Service Terms (driver-partner relationship/ratings/cancellations), Driver/Merchant Terms (partnerships/payouts), Intellectual Property, Disclaimers & Limitation of Liability, Termination, Governing Law (Republic of Uganda), Changes to Terms, Contact Us

Account Deletion Policy (10 sections, MOST detailed): Introduction, How to Request Account Deletion (in-app + online + email), What Happens When You Delete Your Account (deactivated immediately + 30-day permanent deletion + data lost), Data Retained for Legal Obligations (7-year Uganda tax law + fraud + court orders), Wallet Balance (must withdraw BEFORE deletion, forfeited otherwise), Active Rides/Orders (cannot delete with active services), Recovery (cannot recover after 30 days, contact support to cancel before), Impact on Connected Accounts (driver/merchant linked to same phone), Timeline (deactivation immediate / permanent deletion 30 days / data purge 30-90 days), Contact Us

Verification:
- `bun run lint` → clean pass, no errors, no warnings
- `head -1` confirmed no `'use client'` directive at top of any page (server components)
- `grep "export const metadata"` confirmed metadata exports on all 3 pages
- dev.log shows no compile errors (last entries: GET /delete-account 200 — successful serve)
- Pages are accessible at /privacy, /terms, /delete-account (already publicly served before rewrite, route structure preserved)
- Files are ready for Vercel deployment at smartrideug.vercel.app

Files Modified:
- src/app/privacy/page.tsx (rewritten as server component with metadata export, 11 comprehensive sections)
- src/app/terms/page.tsx (rewritten as server component with metadata export, 13 comprehensive sections)
- src/app/delete-account/page.tsx (rewritten as server component with metadata export, 10 comprehensive sections)

Stage Summary:
- 3 legal pages successfully rewritten as Next.js 16 server components
- All pages: server-rendered (no `'use client'`), with proper Metadata exports for SEO
- Sticky header + sticky footer layout with proper `mt-auto` bottom anchoring
- Green left-border accent on all section headings per design spec
- Comprehensive legal content covering all task-specified sections
- Consistent branding: Smart Ride operated by Natural Intellects Corp, support@smartride.ug, smartrideug.vercel.app
- Lint passes cleanly with zero errors
- Pages ready for Vercel deployment
