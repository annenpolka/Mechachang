import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { GenerativeModel, SafetySetting } from './types';

let modelInstance: GenerativeModel | null = null;

const safetySettings: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

/**
 * Geminiモデルを初期化します
 * @param apiKey Google API Key
 * @returns 初期化されたGenerativeModelインスタンス
 */
export const initializeModel = (apiKey: string): GenerativeModel => {
  if (!apiKey) {
    throw new Error('APIキーが指定されていません');
  }

  if (!modelInstance) {
    const genAI = new GoogleGenerativeAI(apiKey);
    modelInstance = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      safetySettings,
    });
  }
  return modelInstance;
};

/**
 * 初期化済みのモデルインスタンスを取得します
 * @returns GenerativeModelインスタンス
 * @throws モデルが初期化されていない場合
 */
export const getModelInstance = (): GenerativeModel => {
  if (!modelInstance) {
    throw new Error('モデルが初期化されていません');
  }
  return modelInstance;
};

/**
 * モデルインスタンスをリセットします（主にテスト用）
 */
export const resetModel = (): void => {
  modelInstance = null;
};