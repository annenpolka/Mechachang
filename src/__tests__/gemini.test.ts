import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initializeModel,
  getModelInstance,
  resetModel,
  analyzeInput,
  processGeminiRequest,
  formatResponse,
  getSchemaForMode,
  type AnalysisMode
} from '../services/gemini/index';

// モックの設定
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockImplementation(() => ({
        generateContent: vi.fn().mockImplementation(async () => ({
          response: {
            text: vi.fn().mockImplementation(async () => JSON.stringify({
              mode: 'general',
              context: {
                type: 'text',
                keywords: ['test'],
                complexity: 1
              },
              summary: 'テスト',
              keyPoints: ['ポイント1']
            }))
          }
        }))
      }))
    })),
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
    },
    HarmBlockThreshold: {
      BLOCK_NONE: 'BLOCK_NONE'
    }
  };
});

describe('Gemini Service', () => {
  const API_KEY = 'test_api_key';

  beforeEach(() => {
    vi.clearAllMocks();
    resetModel();
  });

  describe('モデル管理', () => {
    it('モデルを初期化する', () => {
      const model = initializeModel(API_KEY);
      expect(model).toBeDefined();
    });

    it('同じAPIキーで2回呼び出しても1つのインスタンスを返す', () => {
      const model1 = initializeModel(API_KEY);
      const model2 = initializeModel(API_KEY);
      expect(model1).toBe(model2);
    });

    it('初期化前にgetModelInstanceを呼ぶとエラーを投げる', () => {
      expect(() => getModelInstance()).toThrow('モデルが初期化されていません');
    });
  });

  describe('入力分析', () => {
    it('入力テキストを分析してモードと構造化スキーマを返す', async () => {
      const model = initializeModel(API_KEY);
      const result = await analyzeInput(model, 'テストテキスト');
      expect(result).toHaveProperty('mode');
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('structuredOutputSchema');
    });
  });

  describe('リクエスト処理', () => {
    it('リクエストを処理して整形されたレスポンスを返す', async () => {
      const request = { text: 'テストリクエスト' };
      const response = await processGeminiRequest(request, API_KEY);
      expect(response).toHaveProperty('text');
      expect(response).toHaveProperty('structuredOutput');
    });

    it('APIキーが無効な場合にエラーを投げる', async () => {
      const request = { text: 'テストリクエスト' };
      await expect(processGeminiRequest(request, '')).rejects.toThrow();
    });
  });

  describe('レスポンス整形', () => {
    it('generalモードのレスポンスを整形する', () => {
      const mode: AnalysisMode = 'general';
      const output = {
        summary: 'テストの要約',
        keyPoints: ['ポイント1', 'ポイント2']
      };
      const formatted = formatResponse(mode, output);
      expect(formatted).toContain('テストの要約');
      expect(formatted).toContain('• ポイント1');
      expect(formatted).toContain('• ポイント2');
    });

    it('codeモードのレスポンスを整形する', () => {
      const mode: AnalysisMode = 'code';
      const output = {
        language: 'typescript',
        explanation: 'テストの説明',
        code: 'const test = true;',
        suggestions: ['提案1']
      };
      const formatted = formatResponse(mode, output);
      expect(formatted).toContain('テストの説明');
      expect(formatted).toContain('```\nconst test = true;\n```');
      expect(formatted).toContain('• 提案1');
    });
  });

  describe('スキーマ管理', () => {
    it('各モードに対して適切なスキーマを返す', () => {
      const modes: AnalysisMode[] = ['general', 'code', 'data', 'creative'];
      modes.forEach(mode => {
        const schema = getSchemaForMode(mode);
        expect(schema).toHaveProperty('type', 'object');
        expect(schema).toHaveProperty('properties');
        expect(schema).toHaveProperty('required');
      });
    });
  });
});