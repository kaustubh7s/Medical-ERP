import { NextRequest, NextResponse } from 'next/server';
import { submitPhoneScan } from '@/lib/server/scannerSessions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body.sessionId;
    const pairingToken = body.pairingToken || body.token;
    const scanValue = body.scanValue || body.rawText;
    const { scanType, nonce, timestamp } = body;

    if (!sessionId || !pairingToken || !scanValue) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId, pairingToken, or scanValue' },
        { status: 400 }
      );
    }

    const result = submitPhoneScan(sessionId, pairingToken, {
      scanValue,
      scanType,
      nonce,
      timestamp,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.processedScan,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
