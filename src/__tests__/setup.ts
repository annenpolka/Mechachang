import { vi } from 'vitest';

// WebCrypto APIのモック
const cryptoMock = {
  subtle: {
    importKey: vi.fn().mockImplementation(async () => {
      return 'mock-key';
    }),
    sign: vi.fn().mockImplementation(async () => {
      return new Uint8Array([1, 2, 3]);
    }),
  },
} as unknown as Crypto;

// モックの設定
vi.stubGlobal('crypto', cryptoMock);

vi.stubGlobal('TextEncoder', class {
  encode(input: string): Uint8Array {
    return new Uint8Array([...input].map(char => char.charCodeAt(0)));
  }
});

// コンソールのモック
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// fetchのモック
vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
  Promise.resolve(new Response())
));