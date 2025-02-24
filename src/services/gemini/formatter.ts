import type { AnalysisMode } from './types';

/**
 * 生成されたレスポンスをモードに応じて整形します
 * @param mode 分析モード
 * @param output 構造化された出力データ
 * @returns 整形されたテキスト
 */
export const formatResponse = (mode: AnalysisMode, output: any): string => {
  switch (mode) {
    case 'general':
      return `${output.summary}\n\n主なポイント：\n${output.keyPoints.map((point: string) => `• ${point}`).join('\n')}`;

    case 'code':
      return `説明：${output.explanation}\n\n\`\`\`\n${output.code}\n\`\`\`\n\n提案：\n${output.suggestions?.map((s: string) => `• ${s}`).join('\n') || ''}`;

    case 'data':
      return `分析：${output.analysis}\n\n発見事項：\n${output.insights.map((i: string) => `• ${i}`).join('\n')}\n\n推奨事項：\n${output.recommendations?.map((r: string) => `• ${r}`).join('\n') || ''}`;

    case 'creative':
      return `${output.content}\n\nスタイル：${output.style}\n\nバリエーション：\n${output.variations?.map((v: string) => `• ${v}`).join('\n') || ''}`;

    default:
      return JSON.stringify(output, null, 2);
  }
};