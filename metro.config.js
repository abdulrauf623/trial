const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const workspaceRoot = __dirname;
const appRoot = path.resolve(workspaceRoot, 'apps/mobile');

const config = getDefaultConfig(workspaceRoot);

// Support running Metro from monorepo root while resolving mobile dependencies.
config.watchFolders = [workspaceRoot, appRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(appRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.extraNodeModules = {
  '@fashion/shared': path.resolve(workspaceRoot, 'packages/shared'),
  '@fashion/ui': path.resolve(workspaceRoot, 'packages/ui'),
};
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = config;

