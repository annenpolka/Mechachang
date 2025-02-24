import { describe, it, expect, beforeAll } from 'vitest';
import { processGeminiRequest } from '../services/gemini';

describe('Gemini API E2E Tests', () => {
  const API_KEY = process.env.GEMINI_API_KEY as string;

  beforeAll(() => {
    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required for E2E tests');
    }
  });

  it('日本語の質問に対して適切な応答を返す', async () => {
    const request = { text: '猫について教えて' };
    const response = await processGeminiRequest(request, API_KEY);

    // レスポンスの構造を確認
    expect(response).toHaveProperty('text');
    expect(response).toHaveProperty('structuredOutput');

    // 日本語の応答であることを確認
    expect(response.text).toMatch(/[ぁ-んァ-ン一-龯]/);

    // レスポンスに猫に関連する単語が含まれていることを確認
    expect(response.text).toMatch(/猫|ネコ|キャット/);
  }, 30000); // タイムアウトを30秒に設定

  it('コードに関する質問に対してコードを含む応答を返す', async () => {
    const request = { text: 'JavaScriptでHello Worldを出力するコードを書いて' };
    const response = await processGeminiRequest(request, API_KEY);

    // コードブロックが含まれていることを確認
    expect(response.text).toMatch(/```/);
    expect(response.text).toMatch(/console\.log/);

    // 構造化データを確認
    expect(response.structuredOutput).toHaveProperty('mode', 'code');
    expect(response.structuredOutput).toHaveProperty('language');
    expect(response.structuredOutput).toHaveProperty('code');
  }, 30000);

  it('複雑な質問に対して構造化された応答を返す', async () => {
    const request = { text: '太陽系の惑星について、大きさ順に説明して' };
    const response = await processGeminiRequest(request, API_KEY);

    // 構造化データに必要なプロパティが含まれていることを確認
    const output = response.structuredOutput;
    expect(output).toHaveProperty('mode');
    expect(output).toHaveProperty('context');

    // 惑星の名前が含まれていることを確認
    const text = response.text;
    expect(text).toMatch(/木星|土星|天王星|海王星|地球|金星|火星|水星/);
  }, 30000);

  it('エラー時の挙動を確認', async () => {
    // 無効なAPIキーでのリクエスト
    const request = { text: 'テスト' };
    await expect(processGeminiRequest(request, 'invalid_key'))
      .rejects
      .toThrow();
  }, 10000);
});