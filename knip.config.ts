import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {},
    'apps/mobile': {
      entry: ['app/**/*.tsx', 'src/**/*.ts'],
      project: ['app/**/*.tsx', 'src/**/*.ts'],
      ignore: ['babel.config.js', 'metro.config.js'],
    },
    'services/*': {
      project: ['src/**/*.ts'],
      ignore: ['src/__tests__/**'],
    },
    'packages/*': {
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
    'husky',
  ],
  ignore: [
    '**/__tests__/**',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/index.ts', // barrel files
  ],
  ignoreExportsUsedInFile: true,
  rules: {
    exports: 'off', // Too many false positives for utility functions
  },
};

export default config;
