import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['eslint.config.js'],
    },
    'apps/mobile': {
      entry: ['app/**/*.tsx', 'src/**/*.ts'],
      project: ['app/**/*.tsx', 'src/**/*.ts'],
      ignore: ['babel.config.js', 'metro.config.js'],
    },
    'services/*': {
      entry: ['src/index.ts', 'src/**/*.ts'],
      project: ['src/**/*.ts'],
      ignore: ['src/__tests__/**'],
    },
    'packages/*': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
  },
  ignoreDependencies: [
    'react-dom',
    '@babel/core',
    'expo-auth-session',
    'expo-crypto',
    'expo-web-browser',
    'react-native-svg',
    'react-native-web',
    'expo-updates',
    'expo-system-ui',
  ],
  ignore: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
  ignoreExportsUsedInFile: true,
};

export default config;
