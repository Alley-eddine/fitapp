import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['eslint.config.js'],
    },
    frontend: {
      entry: ['src/main.tsx', 'src/app/**/*.tsx'],
      project: ['src/**/*.{ts,tsx}'],
      ignore: ['src/vite-env.d.ts'],
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
  ignoreDependencies: ['@types/*', 'vitest'],
  ignore: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
  ignoreExportsUsedInFile: true,
};

export default config;
