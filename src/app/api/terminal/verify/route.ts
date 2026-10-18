import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentAuthoritatively } from '@/lib/server/payment-terminal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionId, requestId, expectedAmount, expectedInvoiceReference, expectedCurrency } = body;

    if (!requestId || typeof expectedAmount !== 'number' || !expectedInvoiceReference) {
      return NextResponse.json(
        {
          verified: false,
          reason: 'Missing verification fields: requestId, expectedAmount, and expectedInvoiceReference are required.',
        },
        { status: 400 }
      );
    }

    const verification = await verifyPaymentAuthoritatively({
      transactionId,
      requestId,
      expectedAmount,
      expectedInvoiceReference,
      expectedCurrency,
    });

    return NextResponse.json(verification);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server verification failure';
    return NextResponse.json(
      {
        verified: false,
        reason: msg,
      },
      { status: 500 }
    );
  }
}
