import { NextResponse } from 'next/server';
import { checkTerminalHealth } from '@/lib/server/payment-terminal';

export async function GET() {
  try {
    const health = await checkTerminalHealth();
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
