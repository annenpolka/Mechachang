import { Hono } from 'hono';
import { processGeminiRequest } from './services/gemini';
import { verifySlackRequest, formatSlackResponse } from './utils/slack';
import type { SlackSlashCommand, Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// 開発環境用のモックエンドポイント
app.post('/test-callback', async (c) => {
  const body = await c.req.json();
  console.log('Received callback:', body);
  return c.json({ ok: true });
});

app.post('/slack/command', async (c) => {
  console.log('Received request to /slack/command');

  const { SLACK_SIGNING_SECRET, GEMINI_API_KEY } = c.env;
  const rawBody = await c.req.raw.clone().text();
  console.log('Raw body:', rawBody);

  const formData = await c.req.parseBody() as unknown as SlackSlashCommand;
  console.log('Parsed form data:', formData);

  // Slackリクエストの検証
  const timestamp = c.req.header('x-slack-request-timestamp');
  const signature = c.req.header('x-slack-signature');
  console.log('Headers:', { timestamp, signature });

  if (!timestamp || !signature) {
    console.log('Missing required headers');
    return c.json({ error: '不正なリクエストです' }, 401);
  }

  // 開発環境では署名検証をスキップ
  let isValid = false;
  if (c.env.dev) {
    isValid = true;
  } else {
    isValid = await verifySlackRequest(
      SLACK_SIGNING_SECRET,
      signature,
      timestamp,
      rawBody
    );
  }


  try {
    // 即時応答を返す
    console.log('Sending immediate response');

    const geminiPromise = processGeminiRequest(
      { text: formData.text },
      GEMINI_API_KEY
    ).catch(error => {
      console.error('Gemini API error:', {
        message: error.message,
        stack: error.stack,
        details: error
      });
      throw error;
    }).then(async (response) => {
      // Slackに結果を送信
      console.log('Sending result to Slack');
      const formattedResponse = formatSlackResponse(response.text);
      const slackResponse = await fetch(formData.response_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
        response_type: 'in_channel',
        replace_original: true,
        text: formattedResponse
        })
      });

      console.log('Slack response status:', slackResponse.status);
      if (!slackResponse.ok) {
        throw new Error(`Slack API error: ${slackResponse.status} ${slackResponse.statusText}`);
      }
    });

    // waitUntilを使用してバックグラウンド処理を確実に実行
    c.executionCtx.waitUntil(geminiPromise.catch(error => {
      console.error('Background processing error:', {
        error: error instanceof Error ? error.message : error
      });
    }));

    // 即時レスポンスを返す
    return c.json({
      response_type: 'in_channel',
      text: '処理中です...'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? `${error.message}\n${error.stack}` : JSON.stringify(error);
    console.error('Error:', errorMessage);

    // エラーメッセージを送信
    console.log('Sending error message to Slack');
    try {
      const slackResponse = await fetch(formData.response_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          response_type: 'ephemeral',
          replace_original: true,
          text: `エラーが発生しました: ${errorMessage}`
        })
      });
      if (!slackResponse.ok) {
        console.error('Failed to send error message to Slack:', slackResponse.status, slackResponse.statusText);
      }
    } catch (slackError) {
      console.error('Failed to send error message to Slack:', slackError);
    }
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default app;