import { NextRequest, NextResponse } from 'next/server';
import { submitPaymentRequest } from '@/lib/server/payment-terminal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { requestId, amount, currency, invoiceReference, paymentMethod } = body;

    if (!requestId || !invoiceReference || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed: requestId, invoiceReference, and a positive amount are required.',
        },
        { status: 400 }
      );
    }

    const token = body.token || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const result = await submitPaymentRequest(
      {
        requestId,
        amount,
        currency: currency || 'INR',
        invoiceReference,
        paymentMethod: paymentMethod || 'CUSTOMER_CHOICE',
      },
      token ? { token } : undefined
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit payment request';
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
