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

const webShims = {
  'react-native-config': path.resolve(projectRoot, 'web-shims/react-native-config.js'),
  'react-native-quick-crypto': path.resolve(projectRoot, 'web-shims/react-native-quick-crypto.js'),
  'expo-secure-store': path.resolve(projectRoot, 'web-shims/expo-secure-store.js'),
  'react-native-webview': path.resolve(projectRoot, 'web-shims/react-native-webview.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webShims[moduleName]) {
    return {
      filePath: webShims[moduleName],
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
