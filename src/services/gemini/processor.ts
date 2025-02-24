import type { GeminiRequest, GeminiResponse, InputAnalysis } from './types';
import { initializeModel, getModelInstance } from './model';
import { analyzeInput } from './analyzer';
import { formatResponse } from './formatter';

/**
 * プロンプトを生成します
 * @param text 入力テキスト
 * @param analysis 分析結果
 * @returns 生成されたプロンプト
 */
const buildPrompt = (text: string, analysis: InputAnalysis): string => {
  return `
    以下の入力に対して、${analysis.mode}モードで応答を生成してください。
    応答は必ずStructured Output形式で返してください。

    入力：
    ${text}

    コンテキスト情報：
    ${JSON.stringify(analysis.context, null, 2)}

    応答スキーマ：
    ${JSON.stringify(analysis.structuredOutputSchema, null, 2)}
  `;
};

/**
 * エラーを適切な形式に変換します
 * @param error エラーオブジェクト
 * @returns 整形されたエラー
 */
const handleError = (error: unknown): Error => {
  const errorDetails = {
    message: error instanceof Error ? error.message : '不明なエラー',
    stack: error instanceof Error ? error.stack : undefined,
    phase: 'API呼び出し中'
  };

  console.error('Detailed Gemini API error:', errorDetails);
  const errorMessage = `Gemini APIエラー: ${errorDetails.phase} - ${errorDetails.message}`;
  console.error('Error message:', errorMessage);
  return new Error(errorMessage);
};

/**
 * Geminiリクエストを処理します
 * @param request リクエストオブジェクト
 * @param apiKey Google API Key
 * @returns レスポンス
 */
export const processGeminiRequest = async (
  request: GeminiRequest,
  apiKey: string
): Promise<GeminiResponse> => {
  try {
    if (!apiKey) {
      throw new Error('APIキーが指定されていません');
    }

    // モデルの初期化
    initializeModel(apiKey);
    console.log('Model initialized with API key:', apiKey.substring(0, 8) + '...');

    // 入力の分析
    const model = getModelInstance();
    const analysis = await analyzeInput(model, request.text);

    // プロンプトの生成とコンテンツの生成
    const prompt = buildPrompt(request.text, analysis);
    console.log('Sending prompt to Gemini API');

    const result = await model.generateContent([{ text: prompt }]);
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
    throw handleError(error);
  }
};