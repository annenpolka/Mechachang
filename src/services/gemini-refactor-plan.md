# Geminiサービスのリファクタリング計画

## 現状の課題
- `gemini.ts`ファイルが複数の責務を持っている
- ファイルサイズが大きく、保守性が低下している
- テストがしづらい構造になっている
- モデルのインスタンス管理が単一のグローバル変数に依存している

## 提案する分割構造

### 1. `src/services/gemini/`
新しいディレクトリを作成し、関連ファイルをまとめる

### 2. `src/services/gemini/model.ts`
Geminiモデルの初期化と管理を担当
```typescript
export class GeminiModelManager {
  private static instance: GenerativeModel | null = null;

  static initialize(apiKey: string): GenerativeModel;
  static getInstance(): GenerativeModel;
  static reset(): void; // テスト用
}
```

### 3. `src/services/gemini/analyzer.ts`
入力テキストの分析を担当
```typescript
export class InputAnalyzer {
  constructor(private model: GenerativeModel);

  async analyze(text: string): Promise<InputAnalysis>;
  private getAnalysisPrompt(text: string): string;
}
```

### 4. `src/services/gemini/schemas.ts`
モード別のスキーマ定義を管理
```typescript
export const schemas: Record<AnalysisMode, any>;
export function getSchemaForMode(mode: AnalysisMode): any;
```

### 5. `src/services/gemini/formatter.ts`
レスポンスのフォーマットを担当
```typescript
export class ResponseFormatter {
  static format(mode: AnalysisMode, output: any): string;
}
```

### 6. `src/services/gemini/processor.ts`
Geminiリクエストの処理を担当
```typescript
export class GeminiRequestProcessor {
  constructor(
    private modelManager: GeminiModelManager,
    private analyzer: InputAnalyzer,
    private formatter: ResponseFormatter
  );

  async process(request: GeminiRequest): Promise<GeminiResponse>;
}
```

### 7. `src/services/gemini/index.ts`
公開APIを提供
```typescript
export { processGeminiRequest } from './processor';
export { GeminiModelManager } from './model';
// 必要に応じて他のエクスポート
```

## 期待される利点

1. **責務の分離**
   - 各クラス/モジュールが単一の責務を持つ
   - コードの理解が容易になる
   - 変更の影響範囲が限定される

2. **テスタビリティの向上**
   - 各コンポーネントを個別にテスト可能
   - モックやスタブの作成が容易

3. **依存関係の明確化**
   - 依存関係が明示的になる
   - DIパターンの活用が可能

4. **再利用性の向上**
   - 各モジュールを独立して再利用可能
   - 新機能の追加が容易

## 実装手順

1. 新しいディレクトリ構造の作成
2. 各モジュールの実装
3. 既存のテストの更新
4. 新しいテストの追加
5. 既存コードからの段階的な移行

## 注意点

- 既存のAPIとの互換性を維持
- テストカバレッジの維持
- エラーハンドリングの一貫性
- ログ出力の統一的な管理