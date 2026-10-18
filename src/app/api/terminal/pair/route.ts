import { NextRequest, NextResponse } from 'next/server';
import { requestPairingCode, pairTerminal } from '@/lib/server/payment-terminal';

export async function GET() {
  try {
    const data = await requestPairingCode();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to request pairing code';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'REQUEST_CODE') {
      const data = await requestPairingCode();
      return NextResponse.json(data);
    }

    const { pairingCode, clientName } = body;
    if (!pairingCode) {
      return NextResponse.json(
        { success: false, error: 'Pairing code is required.' },
        { status: 400 }
      );
    }

    const data = await pairTerminal(pairingCode, clientName);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Pairing error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
