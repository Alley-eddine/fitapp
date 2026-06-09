import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {},
    'apps/web': {
      entry: ['app/**/*.{ts,tsx}', 'next.config.ts', 'postcss.config.mjs'],
      project: ['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
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
    // react-dom & tailwind are used by Next/PostCSS, not imported directly
    'react-dom',
    'tailwindcss',
    '@tailwindcss/postcss',
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
