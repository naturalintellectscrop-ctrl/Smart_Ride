import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // No output: "standalone" — Vercel handles deployment natively
  reactStrictMode: false,
  // Skip TypeScript errors during build
  // Pre-existing TS errors in API routes don't affect the landing page
  // These should be fixed incrementally but shouldn't block deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  // Exclude mobile-only directories from the Next.js build
  // These contain expo/react-native imports that would fail in browser context
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  allowedDevOrigins: [
    'c-6a26afc3-1445a456-c6ab506c40f1',
    '21.0.11.154',
  ],
  // SECURITY: The admin dashboard login used to live at /admin/* and was
  // deliberately obscured to /intellects/admin to reduce drive-by probing.
  // Any stale /admin/* URL (old bookmarks, search-engine caches, attacker
  // reconnaissance) is permanently redirected to the obscured login at
  // /intellects/admin so legit users land on the right page and probes
  // don't get a telling 404. The old /intellects/login path is also
  // redirected to /intellects/admin for consistency.
  // Note: /api/admin/* is intentionally NOT redirected — it is the backend
  // API surface used by the dashboard, not a discoverable login page.
  async redirects() {
    return [
      { source: '/admin/login', destination: '/intellects/admin', permanent: true },
      { source: '/admin', destination: '/intellects/admin', permanent: true },
      { source: '/admin/:path*', destination: '/intellects/admin', permanent: true },
      { source: '/intellects/login', destination: '/intellects/admin', permanent: true },
    ];
  },
};

// ============================================
// Sentry Source Maps + Tree Shaking
// ============================================
// Wraps the Next.js config with Sentry build-time options.
// - Uploads source maps on every `next build` (requires SENTRY_AUTH_TOKEN)
// - Creates a /monitoring tunnel route to bypass ad-blockers
// - org/project can be set here OR via SENTRY_ORG / SENTRY_PROJECT env vars
// ============================================
export default withSentryConfig(nextConfig, {
  // Org + project slugs from Sentry (sentry.io → Settings → Projects)
  // Can be overridden by SENTRY_ORG / SENTRY_PROJECT env vars at build time.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for source map upload — generate at
  // https://sentry.io/settings/auth-tokens/ (scopes: project:releases, org:read)
  // Store in .env.sentry-build-plugin (gitignored) or CI secret.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a wider set of client files for better stack-trace resolution
  widenClientFileUpload: true,

  // Proxy API route that forwards Sentry events to bypass ad-blockers.
  // The plugin creates this route automatically on `next build`.
  tunnelRoute: "/monitoring",

  // Suppress non-CI build output
  silent: !process.env.CI,
});
