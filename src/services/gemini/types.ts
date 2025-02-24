import type {
  GenerativeModel,
  GenerativeModelOptions,
  SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
  ContentPart,
  GenerateContentResult
} from '@google/generative-ai';

// 基本的な分析モード
export type AnalysisMode = 'general' | 'code' | 'data' | 'creative';

// 入力分析の結果
export interface InputAnalysis {
  mode: AnalysisMode;
  context: {
    type: string;
    keywords: string[];
    complexity: number;
  };
  structuredOutputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

// Geminiリクエスト
export interface GeminiRequest {
  text: string;
  mode?: AnalysisMode;
  structuredOutputSchema?: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

// Geminiレスポンス
export interface GeminiResponse {
  text: string;
  structuredOutput?: Record<string, unknown>;
}

// Generative AIの型の再エクスポート
export type {
  GenerativeModel,
  GenerativeModelOptions,
  SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
  ContentPart,
  GenerateContentResult
};