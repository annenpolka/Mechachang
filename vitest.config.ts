import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    exclude: [
      '.trunk/**',
      'node_modules/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'test-gemini.js',
        'vitest.config.ts',
      ],
    },
  },
});