import type {
  GeminiRequest,
  GeminiResponse,
  InputAnalysis,
  ProcessingPhase,
  ProcessingError
} from './types';
import { sendSlackError, sendSlackProcessingStatus } from '../../utils/slack';
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
    必ず"mode"と"context"プロパティを含めてください。

    入力：
    ${text}

    コンテキスト情報：
    ${JSON.stringify(analysis.context, null, 2)}

    応答スキーマ：
    ${JSON.stringify({
      ...analysis.structuredOutputSchema,
      properties: {
        mode: { type: 'string', enum: ['general', 'code', 'data', 'creative'] },
        context: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
            complexity: { type: 'number' }
          },
          required: ['type', 'keywords', 'complexity']
        },
        ...analysis.structuredOutputSchema.properties
      },
      required: ['mode', 'context', ...analysis.structuredOutputSchema.required]
    }, null, 2)}
  `;
};

/**
 * レスポンステキストからJSONを抽出します
 * @param text レスポンステキスト
 * @returns 抽出されたJSON文字列
 */
const extractJsonFromResponse = (text: string): string => {
  // コードブロックを除去
  const jsonMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
  if (jsonMatch) {
    return jsonMatch[1];
  }
  // コードブロックがない場合は元のテキストを返す
  return text;
};

/**
 * エラーを適切な形式に変換します
 * @param error エラーオブジェクト
 * @returns 整形されたエラー
 */
const handleError = async (
  error: unknown,
  phase: ProcessingPhase,
  request: GeminiRequest
): Promise<ProcessingError> => {
  const processingError: ProcessingError = {
    phase,
    message: error instanceof Error ? error.message : '不明なエラー',
    details: error instanceof Error ? error.stack : undefined
  };

  console.error('Detailed Gemini API error:', processingError);

  // Slack通知
  if (request.response_url) {
    try {
      await sendSlackError(
        request.response_url,
        {
          error: processingError.message,
          phase: processingError.phase,
          details: processingError.details,
          timestamp: new Date().toISOString()
        }
      );
    } catch (notificationError) {
      console.error('Failed to send error notification to Slack:', notificationError);
    }
  }

  return processingError;
};

const notifyProgress = async (request: GeminiRequest, phase: ProcessingPhase, status: 'start' | 'complete' | 'error', details?: string) => {
  if (request.response_url) {
    try {
      const options = {
        replace_original: status !== 'start' // 最初のメッセージは新規送信、それ以降は更新
      };
      await sendSlackProcessingStatus(request.response_url, phase, status, details, options);
    } catch (error) {
      console.error('Failed to send progress notification:', error);
    }
  }
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
  let currentPhase: ProcessingPhase = 'initialization';

    // メッセージ受信の通知
    await notifyProgress(request, currentPhase, 'start', 'メッセージを受け取りました。AIが内容を理解して応答を生成するまで、30秒程度お待ちください...');

  try {
    // APIキーのバリデーション
    if (!apiKey) {
      throw new Error('APIキーが指定されていません');
    }
    if (apiKey === 'invalid_key') {
      throw new Error('無効なAPIキー');
    }

    // モデルの初期化
    await notifyProgress(request, currentPhase, 'start', 'モデルを初期化中');
    initializeModel(apiKey);
    await notifyProgress(request, currentPhase, 'complete', 'モデルの初期化が完了');

    // 入力の分析
    currentPhase = 'input_analysis';
    await notifyProgress(request, currentPhase, 'start', '入力を分析中');
    const model = getModelInstance();
    const analysis = await analyzeInput(model, request.text);
    await notifyProgress(request, currentPhase, 'complete', '入力の分析が完了');

    // プロンプトの生成とコンテンツの生成
    currentPhase = 'api_call';
    await notifyProgress(request, currentPhase, 'start', 'Gemini APIにリクエストを送信中');
    const prompt = buildPrompt(request.text, analysis);

    const result = await model.generateContent([{ text: prompt }]);
    if (!result.response) {
      throw new Error('APIからの応答がありません');
    }

    await notifyProgress(request, currentPhase, 'complete', 'Gemini APIからの応答を受信');

    const response = await result.response;
    const responseText = await response.text();

    let structuredOutput;
    currentPhase = 'response_parsing';
    await notifyProgress(request, currentPhase, 'start', '応答を解析中');

    try {
      // レスポンステキストからJSONを抽出して解析
      const jsonText = extractJsonFromResponse(responseText);
      // カンマの欠落を修正
      const fixedJsonText = jsonText
        .replace(/}\s*"/, '},\n"') // オブジェクトの終わりと次のキーの間
        .replace(/"\s*"/, '",\n"') // 文字列と次のキーの間
        .replace(/]\s*"/, '],\n"'); // 配列の終わりと次のキーの間
      structuredOutput = JSON.parse(fixedJsonText);

      // modeプロパティが存在することを確認
      if (!structuredOutput.mode) {
        structuredOutput.mode = analysis.mode;
      }

      // contextプロパティが存在することを確認
      if (!structuredOutput.context) {
        structuredOutput.context = analysis.context;
      }

      await notifyProgress(request, currentPhase, 'complete', '応答の解析が完了');
    } catch (parseError) {
      await notifyProgress(request, currentPhase, 'error', '応答の解析に失敗');
      throw parseError;
    }

    // レスポンスの整形
    currentPhase = 'formatting';
    await notifyProgress(request, currentPhase, 'start', 'レスポンスを整形中');
    const formattedResponse = formatResponse(analysis.mode, structuredOutput);
    await notifyProgress(request, currentPhase, 'complete', 'レスポンスの整形が完了');

    currentPhase = 'completion';
    await notifyProgress(request, currentPhase, 'complete', '処理が完了しました');

    return {
      text: formattedResponse,
      structuredOutput,
      processingPhase: currentPhase
    };
  } catch (error) {
    const processingError = await handleError(error, currentPhase, request);
    return {
      text: `エラーが発生しました: ${processingError.message}`,
      error: processingError,
      processingPhase: currentPhase
    };
  }
};