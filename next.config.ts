import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No output: "standalone" — Vercel handles deployment natively
  // TypeScript errors are now fixed — no ignoreBuildErrors needed
  reactStrictMode: false,
  // Exclude mobile-only directories from the Next.js build
  // These contain expo/react-native imports that would fail in browser context
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  allowedDevOrigins: [
    'c-6a26afc3-1445a456-c6ab506c40f1',
    '21.0.11.154',
  ],
};

export default nextConfig;
