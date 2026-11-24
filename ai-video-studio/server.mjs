
import http from 'node:http';

const PORT = 3001;

const server = http.createServer((req, res) => {
  if (req.url === '/api/chat' && req.method === 'POST') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const chunks = [
      '你好！',
      '我是你的 AI 视频助手。',
      '今天我们来制作一个奶牛猫上班日常视频。',
      '首先生成脚本，然后设计分镜。',
    ];

    let index = 0;

    const timer = setInterval(() => {
      if (index < chunks.length) {
        res.write(`data: ${JSON.stringify({ content: chunks[index] })}\n\n`);
        index++;
      } else {
        res.write('data: [DONE]\n\n');
        clearInterval(timer);
        res.end();
      }
    }, 800);

    req.on('close', () => {
      clearInterval(timer);
    });

    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`SSE server running at http://localhost:${PORT}`);
});
