const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
    projectRoot: path.resolve(__dirname),
    watchFolders: [
        path.resolve(__dirname),
    ],
    resolver: {
        unstable_enableSymlinks: true,
        nodeModulesPaths: [
            path.resolve(__dirname, 'node_modules'),
        ],
    },
};

module.exports = mergeConfig(defaultConfig, config);
