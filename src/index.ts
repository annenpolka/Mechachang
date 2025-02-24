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

      // 進捗メッセージを送信
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${c.env.SLACK_BOT_TOKEN}`
        },
        body: JSON.stringify({
          channel: body.event.channel,
          text: '🔄 メッセージを処理中です...'
        })
      });

      console.log('Processing message:', body.event.text);

      const response = await processGeminiRequest(
        {
          text: body.event.text,
          response_url: undefined // Slackイベントの場合はundefined
        },
        GEMINI_API_KEY
      );

      // レスポンスの送信（エラーの場合もメッセージを送信）
      const formattedResponse = formatSlackResponse(response.error ?
        `エラーが発生しました: ${response.error.message}` :
        response.text
      );

      try {
        console.log('Sending message to Slack API...');
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

        const responseData = await slackResponse.json();
        const slackApiResponse = responseData as { ok: boolean };
        console.log('Slack API response:', responseData);

        if (!slackResponse.ok || !slackApiResponse.ok) {
          throw new Error(`Slack API error: ${slackResponse.status} ${slackResponse.statusText}`);
        }
      } catch (slackError) {
        console.error('Error sending message to Slack:', slackError);
        // エラーメッセージを送信（非同期エラーを無視）
        fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${c.env.SLACK_BOT_TOKEN}`
            },
            body: JSON.stringify({
              channel: body.event.channel,
              text: '❌ メッセージの送信中にエラーが発生しました。しばらく待ってから再度お試しください。'
            })
          }).catch(err => {
            console.error('Failed to send error message:', err);
        });
      }
    } catch (error) {
      console.error('Error in events endpoint:', error);
      console.error('Full error details:', error);
    } }

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

    const response = await processGeminiRequest(
      {
        text: formData.text,
        response_url: formData.response_url
      },
      GEMINI_API_KEY
    );

    // エラーがない場合のみ最終的な応答を送信
    if (!response.error) {
      const formattedResponse = formatSlackResponse(response.text);
      await fetch(formData.response_url, {
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
    }

  } catch (error) {
    console.error('Error in command endpoint:', error);
    return c.json({ error: 'エラーが発生しました' }, 500);
  }
  return c.json({ message: '処理を開始しました' });
});

export default app;