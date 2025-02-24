# Gemini 2.0 Flash Slackbot 実装計画

## 概要
Cloudflare WorkersとHonoを使用して、SlackからGemini 2.0 Flash APIを呼び出せるボットを実装します。
入力テキストを分析し、適切なモードで応答を生成する単一のインターフェースを提供します。

## 技術スタック
- TypeScript
- Hono
- Cloudflare Workers
- Slack API
- Gemini 2.0 Flash API（Structured Outputs機能）

## 実装ステップ

### 1. プロジェクトセットアップ
- [x] Cloudflare Workersプロジェクトの作成
- [x] TypeScriptとHonoの設定
- [x] 必要なパッケージのインストール
- [x] 開発環境の構築

### 2. Slack App設定
- [ ] Slack Appの作成
- [ ] ボットユーザーの追加
- [ ] スラッシュコマンドの設定（`/gemini`）
- [ ] 必要な権限の設定
- [ ] Signing Secretの取得

### 3. Gemini API設定
- [ ] Google Cloud Projectの設定
- [ ] Gemini APIキーの取得
- [x] APIクライアントの実装
  - Structured Outputs用のインターフェース定義
  - 入力分析ロジックの実装
  - レスポンス型の定義

### 4. 入力分析システム
- [x] 入力テキスト分析ロジック
  - パターン認識
  - キーワード抽出
  - コンテキスト分析
- [x] モード判定ロジック
  - 分析結果に基づくモード選択
  - 適切なプロンプト生成
- [x] Structured Outputs設定
  - モードごとの出力スキーマ定義
  - レスポンスフォーマット

### 5. Cloudflare Workers実装
- [x] Honoルーターの設定
- [x] Slackリクエスト検証の実装
- [x] メインハンドラーの実装
  - 入力テキストの受信
  - 分析システムの実行
  - Gemini APIの呼び出し
  - レスポンス整形
- [x] エラーハンドリング実装

### 6. 環境変数設定
- [x] Slack Signing Secret
- [x] Slack Bot Token
- [x] Gemini API Key
- [x] その他必要な設定値

### 7. デプロイと動作確認
- [ ] Cloudflare Workersへのデプロイ
- [ ] Slackアプリのエンドポイント更新
- [x] 基本的な機能テスト
- [x] エラーケースのテスト

## 機能仕様

### コマンド
```
/gemini [入力テキスト]
```

### 入力分析システム
```typescript
interface InputAnalysis {
  mode: 'general' | 'code' | 'data' | 'creative';
  context: {
    type: string;
    keywords: string[];
    complexity: number;
  };
  structuredOutputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}
```

### 処理フロー
1. Slackからのリクエストを受信
2. リクエストの検証（Signing Secret）
3. 入力テキストの分析
4. モードの判定
5. Structured Outputsスキーマの選択
6. Gemini APIへのリクエスト
7. レスポンスの整形
8. Slackへの応答

### エラーハンドリング
- 不正なリクエストの処理
- API制限への対応
- タイムアウト処理
- 入力分析エラー
- Structured Outputsのスキーマ検証
- エラーメッセージのフォーマット

## セキュリティ考慮事項
- Slack Signing Secretによるリクエスト検証
- 環境変数の適切な管理
- API キーの保護
- レート制限の実装
- 入力検証とサニタイズ

## 今後の拡張性
- 新しいモードの追加
- 分析ロジックの改善
- 出力フォーマットの最適化
- パフォーマンスチューニング

## 実装結果

### プロジェクト構造
```
/
├── .dev.vars              # 開発環境の環境変数
├── .dev.vars.example      # 環境変数のサンプル
├── .gitignore            # Gitの除外設定
├── package.json          # プロジェクト設定とスクリプト
├── tsconfig.json         # TypeScript設定
├── wrangler.toml         # Cloudflare Workers設定
└── src/
    ├── index.ts          # メインアプリケーション（Honoルーター）
    ├── services/
    │   └── gemini.ts     # Gemini APIクライアント
    ├── types/
    │   ├── index.ts      # 共通の型定義
    │   ├── hono.d.ts     # Honoの型定義
    │   └── generative-ai.d.ts  # Gemini APIの型定義
    └── utils/
        └── slack.ts      # Slack関連のユーティリティ関数
```

### 主要ファイルの役割
- `index.ts`: Honoを使用したメインアプリケーション。Slackからのリクエストを処理し、Gemini APIと連携
- `services/gemini.ts`: Gemini APIとの通信を担当。入力分析とStructured Outputs処理を実装
- `types/index.ts`: Slack、Gemini、環境変数などの共通型定義
- `types/hono.d.ts`: Honoフレームワークの型定義
- `types/generative-ai.d.ts`: Gemini APIクライアントの型定義
- `utils/slack.ts`: Slackリクエストの検証やレスポンスのフォーマット処理