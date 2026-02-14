import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getCurrentUser } from '@/lib/auth';

// Read Clawdbot configuration
function getGatewayConfig() {
  const configPaths = [
    '/root/.clawdbot/clawdbot.json',
    join(process.env.HOME || '', '.clawdbot/clawdbot.json'),
    join(process.env.HOME || '', '.openclaw/openclaw.json'),
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
  // Check authentication - all roles can chat
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get gateway configuration
    const gatewayConfig = getGatewayConfig();
    if (!gatewayConfig) {
      return NextResponse.json(
        { error: 'Gateway configuration not found' },
        { status: 500 }
      );
    }

    const { port, token } = gatewayConfig;

    // Generate session key with timestamp
    const sessionKey = `superclaw-chat-${Date.now()}`;
    
    // Send message to Clawdbot gateway
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/sessions/${sessionKey}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ text: message }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Gateway error:', response.status, errorText);
        return NextResponse.json(
          { error: `Gateway error: ${response.status}` },
          { status: 500 }
        );
      }

      const data = await response.json();
      
      // Extract assistant response from the gateway response
      // The response format may vary, so we'll handle common formats
      let assistantMessage = '';
      
      if (typeof data === 'string') {
        assistantMessage = data;
      } else if (data?.message) {
        assistantMessage = data.message;
      } else if (data?.content) {
        assistantMessage = data.content;
      } else if (data?.text) {
        assistantMessage = data.text;
      } else if (data?.response) {
        assistantMessage = data.response;
      } else {
        // If we can't find the message, return the whole response as string
        assistantMessage = JSON.stringify(data);
      }

      return NextResponse.json({
        message: assistantMessage,
        sessionKey,
      });

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout - gateway took too long to respond' },
          { status: 408 }
        );
      }

      console.error('Gateway request failed:', error);
      return NextResponse.json(
        { error: 'Failed to communicate with gateway' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}