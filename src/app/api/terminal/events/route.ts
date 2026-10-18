import { getTerminalConfig } from '@/lib/server/payment-terminal';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getTerminalConfig();
  const sseUrl = `${config.baseUrl.replace(/\/+$/, '')}/api/terminal/events`;

  try {
    const upstreamRes = await fetch(sseUrl, {
      headers: {
        Accept: 'text/event-stream',
      },
      cache: 'no-store',
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return new Response('Simulator event stream unavailable', { status: 502 });
    }

    return new Response(upstreamRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SSE Proxy Error';
    return new Response(`SSE Error: ${msg}`, { status: 502 });
  }
}
