import { NextRequest, NextResponse } from 'next/server';
import { checkTerminalHealth } from '@/lib/server/payment-terminal';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customBaseUrl = searchParams.get('baseUrl');
    const health = await checkTerminalHealth(
      customBaseUrl ? { baseUrl: customBaseUrl.trim().replace(/\/+$/, '') } : undefined
    );
    return NextResponse.json(health);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        status: 'DISCONNECTED',
        terminalStatus: 'OFFLINE',
        error: msg,
      },
      { status: 503 }
    );
  }
}
