export const verifySlackRequest = async (
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> => {
  const signatureVersion = 'v0';

  // タイムスタンプの検証（5分以上古いリクエストを拒否）
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    console.log('Request timestamp is too old');
    return false;
  }

  const [version, hash] = signature.split('=');

  if (version !== signatureVersion) {
    console.log('Invalid signature version');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(signingSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const baseString = `${signatureVersion}:${timestamp}:${body}`;
    const signature_bytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(baseString)
    );

    const signature_hex = Array.from(new Uint8Array(signature_bytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return signature_hex === hash;
  } catch (error) {
    console.error('Error during signature verification:', error);
    return false;
  }
};

export const formatSlackResponse = (text: string): string => {
  // Slackのマークダウン記法に合わせて整形
  return text
    .replace(/^```(\w+)?\n/gm, '```\n') // 言語指定を削除
    .replace(/^•/gm, '•') // 箇条書きの記号を統一
    .trim();
};