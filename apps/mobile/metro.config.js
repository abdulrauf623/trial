const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro find modules in workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// pnpm installs dependencies as symlinks inside .pnpm store.
// Explicitly enabling symlink resolution avoids intermittent "Unable to resolve"
// errors for workspace-linked and external packages.
config.resolver.unstable_enableSymlinks = true;

// Map workspace packages to their source directories
config.resolver.extraNodeModules = {
  '@fashion/shared': path.resolve(workspaceRoot, 'packages/shared'),
  '@fashion/ui': path.resolve(workspaceRoot, 'packages/ui'),
};

// Resolve source extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = config;
