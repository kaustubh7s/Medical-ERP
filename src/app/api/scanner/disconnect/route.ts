import { NextRequest, NextResponse } from 'next/server';
import { disconnectSession, getScannerSession } from '@/lib/server/scannerSessions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, pairingToken, reason } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 });
    }

    const session = getScannerSession(sessionId);
    if (session && pairingToken && session.pairingToken !== pairingToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized token' }, { status: 401 });
    }

    disconnectSession(sessionId, reason || 'MANUAL_DISCONNECT');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
