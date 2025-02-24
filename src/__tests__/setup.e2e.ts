import { beforeAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { Unstable_DevWorker } from 'wrangler';
import fs from 'fs';
import path from 'path';

// Slack API設定の検証
const requiredSlackEnvVars = [
  'SLACK_SIGNING_SECRET',
  'SLACK_BOT_TOKEN'
] as const;

interface EnvVars {
  GEMINI_API_KEY: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
}

beforeAll(async () => {
  // .dev.varsから環境変数を読み込む
  const devVarsPath = path.join(process.cwd(), '.dev.vars');
  if (fs.existsSync(devVarsPath)) {
    const devVars = fs.readFileSync(devVarsPath, 'utf-8');
    const vars = devVars.split('\n').reduce((acc, line) => {
      if (line.trim() === '') return acc;
      const [key, ...valueParts] = line.split('=');
      if (key) {
        acc[key.trim()] = valueParts.join('=').trim();
      }
      return acc;
    }, {} as Record<string, string>);

    // 環境変数を設定
    Object.entries(vars).forEach(([key, value]) => {
      process.env[key] = value;
    });
  }

  // APIキーが設定されているか確認
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required for E2E tests');
  }

  // Slack環境変数の確認
  for (const envVar of requiredSlackEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`${envVar} environment variable is required for Slack E2E tests`);
    }
  }
});

// コンソール出力を有効化（APIレスポンスの確認用）
console.log = console.log.bind(console);
console.error = console.error.bind(console);