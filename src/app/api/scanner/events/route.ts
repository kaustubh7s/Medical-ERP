import { NextRequest } from 'next/server';
import {
  getScannerSession,
  registerSSEClient,
  unregisterSSEClient,
} from '@/lib/server/scannerSessions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const token = searchParams.get('token');

  if (!sessionId || !token) {
    return new Response(JSON.stringify({ error: 'Missing sessionId or token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = getScannerSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found or expired' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (session.pairingToken !== token) {
    return new Response(JSON.stringify({ error: 'Unauthorized session token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let pingInterval: NodeJS.Timeout | null = null;
  let activeController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      activeController = controller;
      registerSSEClient(sessionId, controller);

      // Heartbeat ping every 15 seconds to prevent browser/network timeouts
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`event: PING\ndata: ${Date.now()}\n\n`));
        } catch (err) {
          if (pingInterval) clearInterval(pingInterval);
        }
      }, 15000);
    },
    cancel() {
      if (pingInterval) clearInterval(pingInterval);
      if (activeController) unregisterSSEClient(sessionId, activeController);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
