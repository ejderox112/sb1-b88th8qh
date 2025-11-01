const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [projectRoot];

// Add the 'assets' folder to the resolver
config.resolver.assetExts.push('jpg', 'png');
config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx', 'cjs', 'json');

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  'lib': path.resolve(__dirname, 'lib'),
};

module.exports = config;
