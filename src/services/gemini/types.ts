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

// 入力タイプの定義
export type InputType = 'question' | 'command' | 'description' | 'other';

// 技術レベルの定義
export type TechnicalLevel = 'basic' | 'intermediate' | 'advanced';

// 期待される出力タイプの定義
export type OutputType = 'text' | 'code' | 'analysis' | 'mixed';

// 文脈情報の定義
export interface AnalysisContext {
  type: string;
  keywords: string[];
  complexity: number;
  inputType: InputType;
  technicalLevel: TechnicalLevel;
  expectedOutput: OutputType;
  constraints: string[];
}

// 入力分析の結果
export interface InputAnalysis {
  mode: AnalysisMode;
  context: AnalysisContext;
  structuredOutputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

// 処理フェーズの定義
export type ProcessingPhase =
  | 'initialization'
  | 'input_analysis'
  | 'api_call'
  | 'response_parsing'
  | 'formatting'
  | 'completion';

// エラー情報
export interface ProcessingError {
  phase: ProcessingPhase;
  message: string;
  details?: unknown;
  context?: Record<string, unknown>;
  userGuidance?: string; // ユーザーへのガイダンスメッセージ
}

// Geminiリクエスト
export interface GeminiRequest {
  text: string;
  mode?: AnalysisMode;
  response_url?: string; // Slack通知用のURL
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
  error?: ProcessingError;
  processingPhase?: ProcessingPhase;
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