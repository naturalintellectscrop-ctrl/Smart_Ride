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
const blockList = [
  /src\/app\/.*/,
  /next\.config\.ts$/,
  /vercel\.json$/,
  /postcss\.config\.mjs$/,
  /prisma\/.*/,
  /mini-services\/.*/,
  /examples\/.*/,
  /scripts\/.*/,
  /download\/.*/,
  /mobile\/.*/,
];

if (config.resolver.blockList) {
  config.resolver.blockList = [...config.resolver.blockList, ...blockList];
} else {
  config.resolver.blockList = blockList;
}

// Explicitly tell Metro which directories to watch
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
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
