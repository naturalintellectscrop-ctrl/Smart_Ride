import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No output: "standalone" — Vercel handles deployment natively
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Exclude mobile-only directories from the Next.js build
  // These contain expo/react-native imports that would fail in browser context
  serverExternalPackages: [],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
