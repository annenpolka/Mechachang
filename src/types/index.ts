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

// Gemini関連の型定義のre-export
export type {
  AnalysisMode,
  InputAnalysis,
  GeminiRequest,
  GeminiResponse
} from '../services/gemini/types';

// 環境変数の型定義
export interface Env {
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  GEMINI_API_KEY: string;
  dev?: { [key: string]: any };
}