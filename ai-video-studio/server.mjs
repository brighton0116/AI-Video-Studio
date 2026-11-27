
import http from 'node:http';
import 'dotenv/config';

const PORT = 3001;

const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.OPENAI_BASE_URL;
const MODEL = process.env.OPENAI_MODEL;

if (!API_KEY || !BASE_URL || !MODEL) {
  throw new Error('缺少必要的 AI 环境变量');
}

async function readRequestBody(req) {
  let body = '';

  for await (const chunk of req) {
    body += chunk;
  }

  return JSON.parse(body || '{}');
}

const server = http.createServer(async (req, res) => {
  if (req.url !== '/api/chat' || req.method !== 'POST') {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const abortController = new AbortController();

  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const { messages } = await readRequestBody(req);

    if (
      !Array.isArray(messages) || messages.length === 0 || !messages.every((item) =>
          ['user', 'assistant'].includes(item.role) &&
          typeof item.content === 'string'
      ) ||
      messages[messages.length - 1].role !== 'user'
    ) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '对话消息格式不正确' }));
      return;
    }

    // 调用 DeepSeek API
    const response = await fetch(
      `${BASE_URL.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的 AI 视频创作助手，擅长脚本生成和视频分镜设计。',
            },
            ...messages,
          ],
          stream: true,
        }),
        signal: abortController.signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 错误（${response.status}）：${errorText}`);
    }

    if (!response.body) {
      throw new Error('DeepSeek 没有返回流式数据');
    }

    // 将 DeepSeek 的 SSE 转发给前端
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          buffer += decoder.decode();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? '';

        for (const event of events) {
          const dataLine = event
            .split(/\r?\n/)
            .find((line) => line.startsWith('data:'));

          if (!dataLine) continue;

          const data = dataLine.slice(5).trim();

          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }

          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;

          if (typeof content === 'string' && content) {
            res.write(
              `data: ${JSON.stringify({ content })}\n\n`
            );
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!res.writableEnded && !res.destroyed) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }

    console.error('AI 请求失败：', error.message);

    if (!res.headersSent) {
      res.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      res.end(JSON.stringify({
        error: 'AI 服务调用失败，请检查 API 配置',
      }));
    } else if (!res.destroyed) {
      res.write(
        `data: ${JSON.stringify({ content: '\n\n[错误] AI 服务调用失败' })}\n\n`
      );
      res.end();
    }
  }
});

server.listen(PORT, () => {
  console.log(`DeepSeek AI 服务运行于 http://localhost:${PORT}`);
});
