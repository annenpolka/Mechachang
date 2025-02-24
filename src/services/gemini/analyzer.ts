import type { GenerativeModel, InputAnalysis } from './types';
import { getSchemaForMode } from './schemas';

/**
 * 分析用のプロンプトを生成します
 * @param text 分析対象のテキスト
 * @returns 生成されたプロンプト
 */
const getAnalysisPrompt = (text: string): string => {
  return `
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
 * 入力テキストを分析し、適切な処理モードと文脈情報を決定します
 * @param model 初期化済みのGenerativeModelインスタンス
 * @param text 分析対象のテキスト
 * @returns 分析結果
 */
export const analyzeInput = async (
  model: GenerativeModel,
  text: string
): Promise<InputAnalysis> => {
  console.log('Analyzing input text:', text);

  try {
    const prompt = getAnalysisPrompt(text);
    const result = await model.generateContent([{ text: prompt }]);
    console.log('Received analysis response');

    const response = await result.response;
    const responseText = await response.text();
    console.log('Raw analysis response:', responseText);

    let analysisResult;
    try {
      // レスポンステキストからJSONを抽出して解析
      const jsonText = extractJsonFromResponse(responseText);
      // カンマの欠落を修正
      const fixedJsonText = jsonText
        .replace(/}\s*"/, '},\n"')  // オブジェクトの終わりと次のキーの間
        .replace(/"\s*"/, '",\n"')  // 文字列と次のキーの間
        .replace(/]\s*"/, '],\n"'); // 配列の終わりと次のキーの間
      analysisResult = JSON.parse(fixedJsonText);
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