import { NextRequest, NextResponse } from 'next/server';
import { cancelPayment } from '@/lib/server/payment-terminal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = body.identifier || body.transactionId || body.requestId;

    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          error: 'Identifier (transactionId or requestId) is required to cancel.',
        },
        { status: 400 }
      );
    }

    const result = await cancelPayment(identifier);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cancel error';
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
