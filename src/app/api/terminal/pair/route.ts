import { NextRequest, NextResponse } from 'next/server';
import { requestPairingCode, pairTerminal } from '@/lib/server/payment-terminal';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customBaseUrl = searchParams.get('baseUrl');
    const customConfig = customBaseUrl ? { baseUrl: customBaseUrl.trim().replace(/\/+$/, '') } : undefined;
    const data = await requestPairingCode(customConfig);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to request pairing code';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseUrl, pairingCode, clientName } = body;
    const customConfig = baseUrl ? { baseUrl: baseUrl.trim().replace(/\/+$/, '') } : undefined;

    if (body.action === 'REQUEST_CODE') {
      const data = await requestPairingCode(customConfig);
      return NextResponse.json(data);
    }

    if (!pairingCode) {
      return NextResponse.json(
        { success: false, error: 'Pairing code is required.' },
        { status: 400 }
      );
    }

    const data = await pairTerminal(pairingCode, clientName, customConfig);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Pairing error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
