import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['src/__tests__/setup.e2e.ts'], // E2Eテスト用のセットアップファイルを使用
    exclude: [
      '.trunk/**',
      'node_modules/**'
    ],
    testTimeout: 30000, // タイムアウトを30秒に設定
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
    env: {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || '',
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || '',
      SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID || ''
    }
  },
});