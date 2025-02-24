import { describe, it, expect } from 'vitest';
import { verifySlackRequest, formatSlackResponse } from '../utils/slack';

describe('Slack Utils', () => {
  describe('verifySlackRequest', () => {
    const signingSecret = 'test_secret';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = 'test_body';

    it('古いタイムスタンプのリクエストを拒否する', async () => {
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString(); // 6分以上前
      const result = await verifySlackRequest(
        signingSecret,
        'v0=dummy',
        oldTimestamp,
        body
      );
      expect(result).toBe(false);
    });

    it('不正なシグネチャバージョンを拒否する', async () => {
      const result = await verifySlackRequest(
        signingSecret,
        'v1=dummy',
        timestamp,
        body
      );
      expect(result).toBe(false);
    });

    it('正しい署名を検証する', async () => {
      // 正しい署名を生成
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(signingSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const baseString = `v0:${timestamp}:${body}`;
      const signature_bytes = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(baseString)
      );
      const signature_hex = Array.from(new Uint8Array(signature_bytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const result = await verifySlackRequest(
        signingSecret,
        `v0=${signature_hex}`,
        timestamp,
        body
      );
      expect(result).toBe(true);
    });
  });

  describe('formatSlackResponse', () => {
    it('コードブロックの言語指定を削除する', () => {
      const input = '```typescript\nconst x = 1;\n```';
      const expected = '```\nconst x = 1;\n```';
      expect(formatSlackResponse(input)).toBe(expected);
    });

    it('箇条書きの記号を統一する', () => {
      const input = '•First\n•Second';
      const expected = '•First\n•Second';
      expect(formatSlackResponse(input)).toBe(expected);
    });

    it('前後の空白を削除する', () => {
      const input = ' \ntest\n ';
      const expected = 'test';
      expect(formatSlackResponse(input)).toBe(expected);
    });
  });
});