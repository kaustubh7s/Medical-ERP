import { NextRequest, NextResponse } from 'next/server';
import { pairPhoneToSession } from '@/lib/server/scannerSessions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body.sessionId;
    const pairingToken = body.pairingToken || body.token || body.pin;
    const deviceName = body.deviceName;

    if (!pairingToken) {
      return NextResponse.json(
        { success: false, error: 'Please enter the 6-digit PIN shown on your MacBook.' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown IP';
    const userAgent = req.headers.get('user-agent') || 'Mobile Browser';

    const result = pairPhoneToSession(sessionId, pairingToken, {
      name: deviceName || 'Mobile Phone',
      userAgent,
      ip,
    });

    if (!result.success || !result.session) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      sessionId: result.session.sessionId,
      pairingToken: result.session.pairingToken,
      activeWorkflow: result.session.activeWorkflow || 'pos',
      expiresAt: result.session.expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
