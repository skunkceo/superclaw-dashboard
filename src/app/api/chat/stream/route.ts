import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readFileSync, existsSync } from 'fs';
import WebSocket from 'ws';

// Read OpenClaw configuration
function getGatewayConfig() {
  const configPaths = [
    '/root/.openclaw/openclaw.json',
    '/root/.clawdbot/clawdbot.json',
  ];

  for (const path of configPaths) {
    if (existsSync(path)) {
      try {
        const config = JSON.parse(readFileSync(path, 'utf8'));
        return {
          port: config?.gateway?.port || 18789,
          token: config?.gateway?.auth?.token || '',
        };
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }

    const gwConfig = getGatewayConfig();
    if (!gwConfig) {
      return new Response('Gateway config not found', { status: 500 });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Connect to OpenClaw WebSocket
          const ws = new WebSocket(`ws://127.0.0.1:${gwConfig.port}/`, {
            headers: {
              'Authorization': `Bearer ${gwConfig.token}`,
            },
          });

          let responseStarted = false;

          ws.on('open', () => {
            // Send message to OpenClaw
            ws.send(JSON.stringify({
              type: 'message',
              sessionKey: `superclaw-chat:${user.email}`,
              message: {
                role: 'user',
                content: message,
              },
            }));
          });

          ws.on('message', (data: Buffer) => {
            try {
              const msg = JSON.parse(data.toString());
              
              // Stream assistant responses
              if (msg.type === 'message' && msg.message?.role === 'assistant') {
                if (!responseStarted) {
                  responseStarted = true;
                  controller.enqueue(encoder.encode('data: ' + JSON.stringify({
                    type: 'start',
                    content: msg.message.content,
                  }) + '\n\n'));
                } else {
                  controller.enqueue(encoder.encode('data: ' + JSON.stringify({
                    type: 'chunk',
                    content: msg.message.content,
                  }) + '\n\n'));
                }
              }
              
              // Handle completion
              if (msg.type === 'done' || msg.type === 'error') {
                controller.enqueue(encoder.encode('data: ' + JSON.stringify({
                  type: 'done',
                }) + '\n\n'));
                ws.close();
                controller.close();
              }
            } catch (err) {
              console.error('Parse error:', err);
            }
          });

          ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({
              type: 'error',
              message: 'Connection error',
            }) + '\n\n'));
            controller.close();
          });

          ws.on('close', () => {
            if (!responseStarted) {
              controller.enqueue(encoder.encode('data: ' + JSON.stringify({
                type: 'error',
                message: 'No response received',
              }) + '\n\n'));
            }
            controller.close();
          });

          // Timeout after 60 seconds
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
              controller.enqueue(encoder.encode('data: ' + JSON.stringify({
                type: 'error',
                message: 'Request timed out',
              }) + '\n\n'));
              controller.close();
            }
          }, 60000);

        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'error',
            message: 'Failed to connect to gateway',
          }) + '\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat stream error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
