import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai';
import type { AnalysisMode, GeminiRequest, GeminiResponse, InputAnalysis } from '../types';

let modelInstance: GenerativeModel | null = null;

export const initializeModel = (apiKey: string): GenerativeModel => {
  if (!modelInstance) {
    const genAI = new GoogleGenerativeAI(apiKey);
    modelInstance = genAI.getGenerativeModel({
      model: 'gemini-pro',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT as HarmCategory,
          threshold: HarmBlockThreshold.BLOCK_NONE as HarmBlockThreshold,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH as HarmCategory,
          threshold: HarmBlockThreshold.BLOCK_NONE as HarmBlockThreshold,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT as HarmCategory,
          threshold: HarmBlockThreshold.BLOCK_NONE as HarmBlockThreshold,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT as HarmCategory,
          threshold: HarmBlockThreshold.BLOCK_NONE as HarmBlockThreshold,
        },
      ],
    });
  }
  return modelInstance as GenerativeModel;
};

export const analyzeInput = async (text: string): Promise<InputAnalysis> => {
  if (!modelInstance) {
    throw new Error('Model not initialized');
  }

  const analysisPrompt = `
    以下のテキストを分析し、最適なモードと処理方法を判断してください。
    応答は必ず以下のJSON形式で返してください：
    {
      "mode": "general" | "code" | "data" | "creative",
      "context": {
        "type": "string",
        "keywords": ["string"],
        "complexity": number
      }
    }

    入力テキスト：
    ${text}
  `;

  console.log('Analyzing input text:', text);
  try {
    const result = await modelInstance!.generateContent([{ text: analysisPrompt }]);
    console.log('Received analysis response');
    const response = await result.response;
    const responseText = await response.text();
    console.log('Raw analysis response:', responseText);
    let analysisResult;
    try {
      analysisResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse analysis response:', responseText);
      throw new Error('APIからの応答を解析できませんでした');
    }

    // スキーマの設定
    const structuredOutputSchema = getSchemaForMode(analysisResult.mode);

    return {
      ...analysisResult,
      structuredOutputSchema,
    };
  } catch (error) {
    console.error('Error during content analysis:', {
      error: error instanceof Error ? error.message : error,
      phase: 'analyzeInput'
    });
    throw error;
  }
};

export const getSchemaForMode = (mode: AnalysisMode): any => {
  const schemas: Record<AnalysisMode, any> = {
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

  return schemas[mode];
};

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

export const processGeminiRequest = async (request: GeminiRequest, apiKey: string): Promise<GeminiResponse> => {
  try {
    if (!apiKey) {
      throw new Error('APIキーが指定されていません');
    }

    initializeModel(apiKey);
    console.log('Model initialized with API key:', apiKey.substring(0, 8) + '...');

    const analysis = await analyzeInput(request.text);

    const prompt = `
      以下の入力に対して、${analysis.mode}モードで応答を生成してください。
      応答は必ずStructured Output形式で返してください。

      入力：
      ${request.text}

      コンテキスト情報：
      ${JSON.stringify(analysis.context, null, 2)}

      応答スキーマ：
      ${JSON.stringify(analysis.structuredOutputSchema, null, 2)}
    `;

    console.log('Sending prompt to Gemini API');
    if (!modelInstance) {
      throw new Error('モデルが初期化されていません');
    }
    const result = await modelInstance.generateContent([{ text: prompt }]);
    console.log('Received response from Gemini API');
    const response = await result.response;
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    let structuredOutput;
    try {
      structuredOutput = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', responseText);
      throw new Error('APIからの応答を解析できませんでした');
    }

    // レスポンスの整形
    const formattedResponse = formatResponse(analysis.mode, structuredOutput);

    return {
      text: formattedResponse,
      structuredOutput
    };
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : '不明なエラー',
      stack: error instanceof Error ? error.stack : undefined,
      phase: modelInstance !== null ? 'API呼び出し中' : 'モデル初期化中'
    };

    console.error('Detailed Gemini API error:', errorDetails);
    const errorMessage = `Gemini APIエラー: ${errorDetails.phase} - ${errorDetails.message}`;
    console.error('Error message:', errorMessage);
    throw new Error(errorMessage);
  }
};