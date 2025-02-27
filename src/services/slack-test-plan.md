# Slackユーティリティのテスト拡充計画

## 現状の課題
現在のテストでは基本的なケースはカバーされていますが、エッジケースや複雑なケースのカバレッジが不足しています。

## 追加テストケース

### verifySlackRequest関数

1. 不正な署名の検証
   - 説明：正しい形式だが不正な値の署名を検証
   - 期待結果：falseを返す
   - 実装方針：正しい署名を生成した後、一部のビットを変更

2. エラーハンドリング
   - 説明：crypto.subtle.importKeyが失敗するケース
   - 期待結果：falseを返す
   - 実装方針：無効な署名シークレットを使用

3. 未来のタイムスタンプ
   - 説明：現在時刻より5分以上先のタイムスタンプ
   - 期待結果：falseを返す
   - 実装方針：現在時刻+400秒のタイムスタンプを使用

### formatSlackResponse関数

1. 複数コードブロック
   ```typescript
   入力：
   ```typescript
   const x = 1;
   ```
   ```python
   x = 1
   ```
   期待結果：
   ```
   const x = 1;
   ```
   ```
   x = 1
   ```
   ```

2. 複数箇条書き混在
   ```typescript
   入力：
   •First
   • Second
   •  Third
   期待結果：
   •First
   •Second
   •Third
   ```

3. 複合パターン
   ```typescript
   入力：
   ```typescript
   const x = 1;
   ```
   •Item 1
   ```python
   x = 2
   ```
   • Item 2
   期待結果：
   ```
   const x = 1;
   ```
   •Item 1
   ```
   x = 2
   ```
   •Item 2
   ```

## 実装手順

1. verifySlackRequest関数のテストを追加
   - 不正な署名のテストケース実装
   - エラーハンドリングのテストケース実装
   - 未来のタイムスタンプのテストケース実装

2. formatSlackResponse関数のテストを追加
   - 複数コードブロックのテストケース実装
   - 複数箇条書きのテストケース実装
   - 複合パターンのテストケース実装

## 期待される効果

- エッジケースのカバレッジ向上
- バグの早期発見
- コードの信頼性向上
- リファクタリング時の安全性確保