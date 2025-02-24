# Mechachang

Slackから利用できるGemini 2.0 Flash APIボット。Cloudflare WorkersとHonoを使用して実装されています。

## 機能

- Slackスラッシュコマンド（`/gemini`）を通じてGemini 2.0 Flash APIにアクセス
  - 即時応答による高速なユーザーフィードバック
  - バックグラウンド処理による安定した応答
- 入力テキストの自動分析による最適なモード選択
  - テキストパターンの認識
  - キーワード抽出
  - コンテキスト分析
- Structured Outputsを活用した構造化された応答
  - モードごとに最適化されたスキーマ
  - 一貫性のある応答フォーマット
  - 高い可読性と再利用性
- 4つの応答モード：
  - general: 一般的な質問や会話
    - 要約と主要ポイントの抽出
    - 感情分析（ポジティブ/ニュートラル/ネガティブ）
  - code: コード関連の質問や生成
    - 言語に応じた適切なフォーマット
    - コードの説明と改善提案
  - data: データ分析や統計
    - データの分析と洞察
    - 具体的な推奨事項
  - creative: クリエイティブな文章生成
    - スタイル指定による柔軟な生成
    - 複数のバリエーション提供

## セキュリティ機能

- Slackリクエストの署名検証
- タイムスタンプ検証（5分以上古いリクエストを拒否）
- 環境変数による安全な認証情報管理
- 開発環境での署名検証スキップ機能

## セットアップ

### 必要条件

- Node.js 18以上
- Cloudflareアカウント
- Slackワークスペースの管理者権限
- Google Cloud Platformアカウント

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/annenpolka/Mechachang.git
cd Mechachang

# 依存関係のインストール
npm install

# 環境変数の設定
cp .dev.vars.example .dev.vars
# .dev.varsを編集して必要な環境変数を設定
```

### Slack App設定

1. [Slack API](https://api.slack.com/apps)にアクセス
2. "Create New App"をクリック
3. "From scratch"を選択
4. アプリ名とワークスペースを設定
5. 以下の設定を行う：
   - Slash Commands:
     - Command: `/gemini`
     - Request URL: `https://your-worker.workers.dev/slack/command`
     - Description: "Gemini 2.0 Flash APIにアクセス"
   - OAuth & Permissions:
     - Bot Token Scopes:
       - `commands`
       - `chat:write`
6. アプリをワークスペースにインストール
7. "Basic Information"から"Signing Secret"を取得
8. "OAuth & Permissions"から"Bot User OAuth Token"を取得

### Gemini API設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. Gemini APIを有効化
4. APIキーを生成

### 環境変数の設定

開発環境用の`.dev.vars`ファイルを編集：

```
SLACK_SIGNING_SECRET=your_slack_signing_secret_here
SLACK_BOT_TOKEN=your_slack_bot_token_here
GEMINI_API_KEY=your_gemini_api_key_here
```

本番環境用にCloudflare Workersのシークレットを設定：

```bash
wrangler secret put SLACK_SIGNING_SECRET
wrangler secret put SLACK_BOT_TOKEN
wrangler secret put GEMINI_API_KEY
```

### 開発

```bash
# 開発サーバーの起動
npm run dev

# フォーマット
npm run format

# デプロイ
npm run deploy
```

## 使用方法

Slackで以下のコマンドを使用：

```
/gemini [プロンプト]
```

入力テキストは自動的に分析され、最適なモードで処理されます：

- 一般的な質問 → generalモード
- コード関連の質問 → codeモード
- データ分析の質問 → dataモード
- クリエイティブな要求 → creativeモード

## 応答フォーマット

各モードで異なる応答フォーマットが使用されます：

### Generalモード
```
要約

主なポイント：
• ポイント1
• ポイント2
```

### Codeモード
```
説明：コードの説明

```言語名
コード
```

提案：
• 提案1
• 提案2
```

### Dataモード
```
分析：データの分析

発見事項：
• 発見1
• 発見2

推奨事項：
• 推奨1
• 推奨2
```

### Creativeモード
```
生成されたコンテンツ

スタイル：スタイルの説明

バリエーション：
• バリエーション1
• バリエーション2
```

## ライセンス

ISC

## 貢献

Issue、Pull Requestは歓迎します。
