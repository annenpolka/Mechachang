# Slack通知機能改善計画

## 1. エラー通知の統一化

### 1.1 共通のSlack通知ユーティリティの作成
- src/utils/slack.tsに通知用の関数を追加
  - `sendSlackMessage`: 一般的なメッセージ送信
  - `sendSlackError`: エラー通知の送信
  - `sendSlackProcessingStatus`: 処理状態の通知

### 1.2 エラー通知フォーマットの統一
```typescript
interface SlackErrorNotification {
  error: string;        // エラーメッセージ
  phase: string;        // エラーが発生したフェーズ
  details?: unknown;    // 追加のエラー詳細
  timestamp: string;    // エラー発生時刻
}
```

## 2. Gemini処理の改善

### 2.1 processor.tsの改善
- handleError関数を拡張してSlack通知を統合
- 処理の各フェーズでの状態通知の追加
  - 初期化完了
  - 入力分析完了
  - API呼び出し開始
  - 応答受信
  - 処理完了

### 2.2 エラーハンドリングの改善
- より詳細なエラー情報の保持
- エラーの種類に応じた適切な通知
  - API認証エラー
  - 入力検証エラー
  - 応答解析エラー
  - タイムアウトエラー

## 3. 実装手順

1. src/utils/slack.tsの拡張
   - 新しい通知関数の実装
   - エラー通知フォーマットの定義

2. src/services/gemini/processor.tsの更新
   - handleError関数の拡張
   - 処理フェーズごとの通知追加

3. src/index.tsの改善
   - エラーハンドリングの統一化
   - 非同期処理の適切な管理

4. テストの追加
   - 通知機能のユニットテスト
   - エラーケースの統合テスト

## 4. 期待される効果

- エラー発生時の迅速な検知と対応
- 処理状態の可視化による問題の早期発見
- 一貫性のあるエラー通知による運用性の向上
- デバッグ情報の充実による問題解決の効率化