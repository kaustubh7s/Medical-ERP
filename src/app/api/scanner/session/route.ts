import { NextRequest, NextResponse } from 'next/server';
import {
  createScannerSession,
  getScannerSession,
  updateSessionWorkflow,
  disconnectSession,
  getLocalNetworkAddresses,
} from '@/lib/server/scannerSessions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const workflow = body.activeWorkflow || 'pos';
    const session = createScannerSession(workflow);
    const networkIps = getLocalNetworkAddresses();
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      pairingToken: session.pairingToken,
      pairingPin: session.pairingPin,
      expiresAt: session.expiresAt,
      activeWorkflow: session.activeWorkflow,
      networkIps,
      port,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 });
  }

  const session = getScannerSession(sessionId);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session expired or not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    sessionId: session.sessionId,
    expiresAt: session.expiresAt,
    connectedDevice: session.connectedDevice || null,
    activeWorkflow: session.activeWorkflow,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, activeWorkflow } = body;
    if (!sessionId || !activeWorkflow) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const updated = updateSessionWorkflow(sessionId, activeWorkflow);
    return NextResponse.json({ success: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 });
  }

  disconnectSession(sessionId, 'REVOKED_BY_MACBOOK');
  return NextResponse.json({ success: true });
}
