const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Include watchFolders pointing to the root of the monorepo
config.watchFolders = [workspaceRoot];

// Resolve alias @vesper-core/ghost-ledger correctly to the directory
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@vesper-core/ghost-ledger': path.resolve(workspaceRoot, 'packages/ghost-ledger'),
};

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;