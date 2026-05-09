// ============================================
// SMART RIDE MOBILE - METRO CONFIG
// ============================================
// This project has BOTH Expo (mobile) and Next.js (web)
// We need to ensure Metro ONLY sees Expo files
// ============================================

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Single worker for stability during build
config.maxWorkers = 1;

// CRITICAL: Block Next.js/Backend directories from Metro
// Without this, Metro picks up src/app (Next.js) instead of app/ (Expo Router)
const blockList = [
  // Block entire src/app directory (Next.js routes)
  /src\/app\/.*/,
  // Block Next.js config
  /next\.config\.ts$/,
  /vercel\.json$/,
  /postcss\.config\.mjs$/,
  // Block backend-only directories
  /prisma\/.*/,
  /mini-services\/.*/,
  /examples\/.*/,
  /scripts\/.*/,
  /download\/.*/,
  // Block nested smart-ride-mobile directories (duplicates)
  /smart-ride-mobile\/.*/,
  // Block mobile directory (old React Native CLI project)
  /mobile\/.*/,
];

// Merge with existing blockList if any
if (config.resolver.blockList) {
  config.resolver.blockList = [...config.resolver.blockList, ...blockList];
} else {
  config.resolver.blockList = blockList;
}

// Explicitly tell Metro which directories to watch
// Only watch directories needed for mobile app
config.watcher = config.watcher || {};
config.watcher.watchFolders = [
  path.resolve(projectRoot, 'app'),
  path.resolve(projectRoot, 'assets'),
  path.resolve(projectRoot, 'src/types'),
  path.resolve(projectRoot, 'src/services'),
  path.resolve(projectRoot, 'src/store'),
  path.resolve(projectRoot, 'src/lib'),
  path.resolve(projectRoot, 'src/components'),
  path.resolve(projectRoot, 'src/hooks'),
  path.resolve(projectRoot, 'src/constants'),
  path.resolve(projectRoot, 'src/config'),
  path.resolve(projectRoot, 'src/animations'),
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
