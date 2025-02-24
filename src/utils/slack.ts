interface SlackErrorNotification {
  error: string;
  phase: string;
  details?: unknown;
  timestamp: string;
}

interface SlackMessageOptions {
  response_type?: 'in_channel' | 'ephemeral';
  replace_original?: boolean;
}

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

/**
 * Slackにメッセージを送信します
 */
export const sendSlackMessage = async (
  url: string,
  text: string,
  options: SlackMessageOptions = {}
): Promise<void> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: formatSlackResponse(text),
      response_type: options.response_type || 'in_channel',
      replace_original: options.replace_original
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Slack API error: ${response.status} - ${errorText}`);
  }
};

/**
 * Slackにエラーを通知します
 */
export const sendSlackError = async (
  url: string,
  notification: SlackErrorNotification,
  options: SlackMessageOptions = {}
): Promise<void> => {
  const errorMessage = `🚨 エラーが発生しました
• フェーズ: ${notification.phase}
• エラー: ${notification.error}
• 発生時刻: ${notification.timestamp}
${notification.details ? `• 詳細: ${JSON.stringify(notification.details, null, 2)}` : ''}`;

  await sendSlackMessage(url, errorMessage, {
    response_type: 'ephemeral',
    replace_original: true,
    ...options
  });
};

/**
 * Slackに処理状態を通知します
 */
export const sendSlackProcessingStatus = async (
  url: string,
  phase: string,
  status: 'start' | 'complete' | 'error',
  details?: string,
  options: SlackMessageOptions = {}
): Promise<void> => {
  const emoji = {
    start: '🔄',
    complete: '✅',
    error: '❌'
  }[status];

  const statusMessage = details
    ? `${emoji} ${phase}: ${details}`
    : `${emoji} ${phase}`;

  await sendSlackMessage(
    url,
    statusMessage,
    {
      replace_original: true,
      ...options
    }
  );
};