const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
    projectRoot: path.resolve(__dirname),
    watchFolders: [
        path.resolve(__dirname),
        path.resolve('C:/nm/node_modules'),
    ],
    resolver: {
        unstable_enableSymlinks: true,
        nodeModulesPaths: [
            path.resolve(__dirname, 'node_modules'),
            path.resolve('C:/nm/node_modules'),
        ],
    },
};

module.exports = mergeConfig(defaultConfig, config);
