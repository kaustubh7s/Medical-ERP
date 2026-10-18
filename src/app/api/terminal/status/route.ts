import { NextRequest, NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/server/payment-terminal';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier =
      searchParams.get('identifier') ||
      searchParams.get('transactionId') ||
      searchParams.get('requestId');

    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required identifier (transactionId or requestId).',
        },
        { status: 400 }
      );
    }

    const result = await getPaymentStatus(identifier);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query status';
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
