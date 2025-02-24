# Geminiサービスリファクタリング実装計画

## フェーズ1: 基盤整備

### 1.1 ディレクトリ構造の作成
```bash
mkdir -p src/services/gemini
```

### 1.2 型定義の移行
- `src/types/index.ts`から関連する型定義を`src/services/gemini/types.ts`に移動
- 必要に応じて型定義の拡張

## フェーズ2: コアコンポーネントの実装

### 2.1 モデル管理（model.ts）
```typescript
// 実装優先度: 高
// 理由: 他のコンポーネントの依存関係の基盤となるため
export class GeminiModelManager {
  private static instance: GenerativeModel | null = null;
  private static safetySettings = [
    // 既存の設定を移行
  ];

  static initialize(apiKey: string): GenerativeModel {
    if (!this.instance) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.instance = genAI.getGenerativeModel({
        model: 'gemini-pro',
        safetySettings: this.safetySettings,
      });
    }
    return this.instance;
  }

  static getInstance(): GenerativeModel {
    if (!this.instance) {
      throw new Error('Model not initialized');
    }
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}
```

### 2.2 スキーマ管理（schemas.ts）
```typescript
// 実装優先度: 中
// 理由: 既存の実装を移行するだけで、大きな変更は不要
export const schemas: Record<AnalysisMode, any> = {
  // 既存のスキーマ定義を移行
};

export function getSchemaForMode(mode: AnalysisMode): any {
  return schemas[mode];
}
```

### 2.3 入力分析（analyzer.ts）
```typescript
// 実装優先度: 高
// 理由: モデルとの対話の中核部分
export class InputAnalyzer {
  constructor(private model: GenerativeModel) {}

  async analyze(text: string): Promise<InputAnalysis> {
    const prompt = this.getAnalysisPrompt(text);
    const result = await this.model.generateContent([{ text: prompt }]);
    const response = await result.response;
    const responseText = await response.text();

    try {
      const analysisResult = JSON.parse(responseText);
      return {
        ...analysisResult,
        structuredOutputSchema: getSchemaForMode(analysisResult.mode),
      };
    } catch (error) {
      throw new Error('Failed to parse analysis response');
    }
  }

  private getAnalysisPrompt(text: string): string {
    // 既存のプロンプトテンプレートを移行
    return `...`;
  }
}
```

### 2.4 レスポンス整形（formatter.ts）
```typescript
// 実装優先度: 中
// 理由: 出力形式の一貫性を保つために重要
export class ResponseFormatter {
  static format(mode: AnalysisMode, output: any): string {
    // 既存のフォーマット処理を移行
  }
}
```

## フェーズ3: 統合

### 3.1 リクエスト処理（processor.ts）
```typescript
// 実装優先度: 高
// 理由: 全コンポーネントを統合する中心的な役割
export class GeminiRequestProcessor {
  constructor(
    private modelManager: typeof GeminiModelManager,
    private analyzer: InputAnalyzer,
    private formatter: typeof ResponseFormatter
  ) {}

  async process(request: GeminiRequest): Promise<GeminiResponse> {
    try {
      const analysis = await this.analyzer.analyze(request.text);
      const prompt = this.buildPrompt(request.text, analysis);
      const model = this.modelManager.getInstance();
      const result = await model.generateContent([{ text: prompt }]);
      const response = await result.response;
      const responseText = await response.text();
      const structuredOutput = JSON.parse(responseText);

      return {
        text: this.formatter.format(analysis.mode, structuredOutput),
        structuredOutput
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private buildPrompt(text: string, analysis: InputAnalysis): string {
    // プロンプト生成ロジックを移行
  }

  private handleError(error: unknown): Error {
    // エラーハンドリングロジックを移行
  }
}
```

### 3.2 公開API（index.ts）
```typescript
// 実装優先度: 中
// 理由: 既存APIとの互換性を保つために重要
export { GeminiModelManager } from './model';
export { processGeminiRequest } from './processor';
export type { GeminiRequest, GeminiResponse } from './types';
```

## フェーズ4: テスト更新

### 4.1 単体テスト
- 各クラスに対する個別のテストファイルを作成
- モックとスタブの更新
- エラーケースのテスト強化

### 4.2 統合テスト
- 新しいクラス構造での統合テスト
- エッジケースのカバレッジ向上

## フェーズ5: 段階的移行

1. 新しい実装を`src/services/gemini/`に作成
2. 既存のテストを新しい実装に対して実行
3. 新しいテストを追加
4. 既存の`gemini.ts`を非推奨化
5. 新しい実装への移行期間を設定
6. 完全移行後に古い実装を削除

## 注意点

1. **下位互換性**
   - 既存のAPIシグネチャを維持
   - 非推奨警告を適切に実装

2. **エラーハンドリング**
   - 各クラスで適切なエラー型を定義
   - エラーメッセージの統一

3. **ログ管理**
   - 構造化ログの実装
   - デバッグ情報の充実化

4. **パフォーマンス**
   - シングルトンパターンの適切な使用
   - メモリリークの防止

## タイムライン

1. フェーズ1: 1日
2. フェーズ2: 2-3日
3. フェーズ3: 2日
4. フェーズ4: 2-3日
5. フェーズ5: 3-4日

合計: 約2週間