import { Hono } from 'hono';
import { processGeminiRequest } from './services/gemini/index';
import { verifySlackRequest, formatSlackResponse } from './utils/slack';
import type { SlackSlashCommand, Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// 開発環境用のモックエンドポイント
app.post('/test-callback', async (c) => {
  const body = await c.req.json();
  console.log('Received callback:', body);
  return c.json({ ok: true });
});

// Slackイベントのチャレンジレスポンス用エンドポイント
app.post('/slack/events', async (c) => {
  const rawBody = await c.req.raw.clone().text();
  const body = JSON.parse(rawBody);

  // チャレンジリクエストの場合は署名検証をスキップ
  if (body.type === 'url_verification') {
    console.log('Received challenge request:', body);
    return c.json({
      challenge: body.challenge
    });
  }

  // Slackリクエストの検証
  const timestamp = c.req.header('x-slack-request-timestamp');
  const signature = c.req.header('x-slack-signature');

  if (!timestamp || !signature) {
    console.log('Missing required headers');
    return c.json({ error: '不正なリクエストです' }, 401);
  }

  const { SLACK_SIGNING_SECRET } = c.env;
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

  if (!isValid) {
    console.log('Invalid request signature');
    return c.json({ error: '不正なリクエストです' }, 401);
  }

  // メッセージイベントの処理
  if (body.event && (body.event.type === 'message' || body.event.type === 'app_mention')) {
    console.log('Received message event:', body.event);

    // ボット自身のメッセージは無視
    if (body.event.bot_id || body.event.subtype === 'bot_message') {
      return c.json({ ok: true });
    }

    const { GEMINI_API_KEY } = c.env;

    try {
      const geminiPromise = processGeminiRequest(
        { text: body.event.text },
        GEMINI_API_KEY
      ).then(async (response) => {
        // Slackにメッセージを送信
        const formattedResponse = formatSlackResponse(response.text);
        const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${c.env.SLACK_BOT_TOKEN}`
          },
          body: JSON.stringify({
            channel: body.event.channel,
            text: formattedResponse
          })
        });

        if (!slackResponse.ok) {
          const errorText = await slackResponse.text();
          throw new Error(`Slack API error: ${slackResponse.status} - ${errorText}`);
        }
      });

      c.executionCtx.waitUntil(geminiPromise);
    } catch (error) {
      console.error('Error processing message:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

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

  if (!isValid) {
    console.log('Invalid request signature');
    return c.json({ error: '不正なリクエストです' }, 401);
  }

  try {
    // 即時応答を返す
    console.log('Sending immediate response');

    const geminiPromise = processGeminiRequest(
      { text: formData.text },
      GEMINI_API_KEY
    ).then(async (response) => {
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
        const errorText = await slackResponse.text();
        throw new Error(`Slack API error: ${slackResponse.status} - ${errorText}`);
      }
    }).catch(error => {
      console.error('Gemini API error:', {
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    });

    // waitUntilを使用してバックグラウンド処理を確実に実行
    c.executionCtx.waitUntil(geminiPromise.catch(error => {
      console.error('Background processing error:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
    }));

    // 即時レスポンスを返す
    return c.json({
      response_type: 'in_channel',
      text: '処理中です...'
    });

  } catch (error) {
    console.error('Error processing command:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });

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
          text: `エラーが発生しました: ${error instanceof Error ? error.message : error}`
        })
      });
      if (!slackResponse.ok) {
        const errorText = await slackResponse.text();
        console.error('Failed to send error message to Slack:', {
          status: slackResponse.status,
          statusText: slackResponse.statusText,
          error: errorText
        });
      }
    } catch (slackError) {
      console.error('Failed to send error message to Slack:', {
        error: slackError instanceof Error ? slackError.message : slackError,
        stack: slackError instanceof Error ? slackError.stack : undefined
      });
    }
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default app;