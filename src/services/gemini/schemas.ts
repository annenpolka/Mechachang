import type { AnalysisMode } from './types';

export const schemas: Record<AnalysisMode, any> = {
  general: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      keyPoints: { type: 'array', items: { type: 'string' } },
      sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] }
    },
    required: ['summary', 'keyPoints']
  },
  code: {
    type: 'object',
    properties: {
      language: { type: 'string' },
      explanation: { type: 'string' },
      code: { type: 'string' },
      suggestions: { type: 'array', items: { type: 'string' } }
    },
    required: ['language', 'explanation', 'code']
  },
  data: {
    type: 'object',
    properties: {
      analysis: { type: 'string' },
      insights: { type: 'array', items: { type: 'string' } },
      recommendations: { type: 'array', items: { type: 'string' } }
    },
    required: ['analysis', 'insights']
  },
  creative: {
    type: 'object',
    properties: {
      content: { type: 'string' },
      style: { type: 'string' },
      variations: { type: 'array', items: { type: 'string' } }
    },
    required: ['content', 'style']
  }
};

/**
 * 指定されたモードに対応するスキーマを取得します
 * @param mode 分析モード
 * @returns スキーマ定義
 */
export const getSchemaForMode = (mode: AnalysisMode): any => {
  return schemas[mode];
};