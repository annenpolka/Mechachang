// Slack関連の型定義
export interface SlackSlashCommand {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

export interface SlackResponse {
  response_type?: 'in_channel' | 'ephemeral';
  text?: string;
  blocks?: SlackBlock[];
}

export interface SlackBlock {
  type: 'section' | 'context' | 'divider';
  text?: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  };
  fields?: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }[];
}

// 入力分析システムの型定義
export type AnalysisMode = 'general' | 'code' | 'data' | 'creative';

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

// Gemini API関連の型定義
export interface GeminiRequest {
  text: string;
  mode?: AnalysisMode;
  structuredOutputSchema?: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface GeminiResponse {
  text: string;
  structuredOutput?: Record<string, unknown>;
}

// 環境変数の型定義
export interface Env {
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  GEMINI_API_KEY: string;
  dev?: { [key: string]: any };
}