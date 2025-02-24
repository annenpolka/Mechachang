import type {
  GeminiRequest,
  GeminiResponse,
  InputAnalysis,
  ProcessingPhase,
  ProcessingError
} from './types';
import { sendSlackError } from '../../utils/slack';
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
            complexity: { type: 'number' },
            inputType: { type: 'string', enum: ['question', 'command', 'description', 'other'] },
            technicalLevel: { type: 'string', enum: ['basic', 'intermediate', 'advanced'] },
            expectedOutput: { type: 'string', enum: ['text', 'code', 'analysis', 'mixed'] },
            constraints: { type: 'array', items: { type: 'string' } }
          },
          required: ['type', 'keywords', 'complexity', 'inputType', 'technicalLevel',
                    'expectedOutput', 'constraints']
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
  request: GeminiRequest,
  context?: Record<string, unknown>
): Promise<ProcessingError> => {
  // エラーの種類に応じた詳細なメッセージを生成
  let errorMessage = error instanceof Error ? error.message : '不明なエラー';
  let errorDetails = error instanceof Error ? error.stack : undefined;

  if (error instanceof TypeError) {
    errorMessage = '入力データの形式が正しくありません';
  } else if (error instanceof RangeError) {
    errorMessage = '入力データが処理可能な範囲を超えています';
  }

  const processingError: ProcessingError = {
    phase,
    message: errorMessage,
    details: errorDetails,
    context
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

  try {
    // APIキーのバリデーション
    if (!apiKey) {
      throw new Error('APIキーが指定されていません');
    }
    if (apiKey === 'invalid_key') {
      throw new Error('無効なAPIキー');
    }

    // モデルの初期化
    console.log('Initializing model...');
    initializeModel(apiKey);

    // 入力の分析
    currentPhase = 'input_analysis';
    console.log('Analyzing input...');

    const model = getModelInstance();

    // 入力の分析
    const analysis = await analyzeInput(model, request.text);
    // プロンプトの生成とコンテンツの生成
    currentPhase = 'api_call';
    console.log('Sending request to Gemini API...');
    const prompt = buildPrompt(request.text, analysis);

    const result = await model.generateContent([{ text: prompt }]);
    if (!result.response) {
      throw new Error('APIからの応答がありません');
    }

    const response = await result.response;
    const responseText = await response.text();

    let structuredOutput;
    currentPhase = 'response_parsing';
    console.log('Parsing response...');

    try {
      // レスポンステキストからJSONを抽出して解析
      const jsonText = extractJsonFromResponse(responseText);
      // カンマの欠落を修正
      const fixedJsonText = jsonText
        .replace(/}\s*"/, '},\n"') // オブジェクトの終わりと次のキーの間
        .replace(/"\s*"/, '",\n"') // 文字列と次のキーの間
        .replace(/]\s*"/, '],\n"'); // 配列の終わりと次のキーの間
      structuredOutput = JSON.parse(fixedJsonText);

      // 応答の品質チェック
      if (!structuredOutput || typeof structuredOutput !== 'object') {
        throw new Error('応答が正しい形式ではありません');
      }
      if (Object.keys(structuredOutput).length === 0) {
        throw new Error('応答が空です');
      }

      // modeプロパティが存在することを確認
      if (!structuredOutput.mode) {
        structuredOutput.mode = analysis.mode;
      }

      // contextプロパティが存在することを確認
      if (!structuredOutput.context) {
        structuredOutput.context = analysis.context;
      }

    } catch (parseError) {
      throw parseError;
    }

    // レスポンスの整形
    currentPhase = 'formatting';
    const formattedResponse = formatResponse(analysis.mode, structuredOutput);

    currentPhase = 'completion';
    console.log('Processing completed');

    return {
      text: formattedResponse,
      structuredOutput,
      processingPhase: currentPhase
    };
  } catch (error) {
    // エラー発生時のコンテキスト情報を収集
    const errorContext = {
      phase: currentPhase,
      inputLength: request.text.length,
      timestamp: new Date().toISOString()
    };

    const processingError = await handleError(error, currentPhase, request, errorContext);
    return {
      text: `エラーが発生しました: ${processingError.message}`,
      error: processingError,
      processingPhase: currentPhase
    };
  }
};