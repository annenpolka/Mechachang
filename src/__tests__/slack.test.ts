import { describe, it, expect } from 'vitest';
import { verifySlackRequest, formatSlackResponse } from '../utils/slack';

describe('Slack Utils', () => {
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