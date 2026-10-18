import { NextResponse } from 'next/server';
import { sql } from '@/lib/neonClient';

export async function GET() {
  try {
    const rows = await sql`
      SELECT data, updated_at, updated_by 
      FROM pharmacy_sync_state 
      WHERE key = 'careplus_erp_live' 
      LIMIT 1;
    `;

    if (rows.length === 0 || !rows[0].data) {
      return NextResponse.json({
        hasData: false,
        message: 'No cloud snapshot found in Neon yet. Push a sync to initialize.',
      });
    }

    return NextResponse.json({
      hasData: true,
      data: rows[0].data,
      updatedAt: rows[0].updated_at,
      updatedBy: rows[0].updated_by,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        hasData: false,
        error: error.message || 'Failed to pull data from Neon',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, cashierName } = body;

    if (!data) {
      return NextResponse.json({ error: 'Missing data payload' }, { status: 400 });
    }

    const jsonString = JSON.stringify(data);
    const cashier = cashierName || 'CarePlus Admin';

    // 1. Atomic upsert to main snapshot
    await sql`
      INSERT INTO pharmacy_sync_state (key, data, updated_at, updated_by)
      VALUES ('careplus_erp_live', ${jsonString}::jsonb, NOW(), ${cashier})
      ON CONFLICT (key) DO UPDATE
      SET data = EXCLUDED.data,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
    `;

    // 2. Sync Invoices to relational table (recent 100)
    if (Array.isArray(data.invoices) && data.invoices.length > 0) {
      for (const inv of data.invoices.slice(0, 100)) {
        try {
          await sql`
            INSERT INTO pharmacy_invoices (
              id, invoice_number, invoice_date, invoice_type,
              customer_id, customer_name, customer_phone, doctor_name,
              sub_total, total_discount, total_cgst, total_sgst, round_off,
              grand_total, payment_mode, payment_status, amount_paid,
              balance_due, cashier_name, items, data
            ) VALUES (
              ${inv.id}, ${inv.invoiceNumber}, ${new Date(inv.date || Date.now()).toISOString()},
              ${inv.invoiceType || 'RETAIL'}, ${inv.customerId || null}, ${inv.customerName || null},
              ${inv.customerPhone || null}, ${inv.doctorName || null}, ${Number(inv.subTotal || 0)},
              ${Number(inv.totalDiscount || 0)}, ${Number(inv.totalCgst || 0)}, ${Number(inv.totalSgst || 0)},
              ${Number(inv.roundOff || 0)}, ${Number(inv.grandTotal || 0)}, ${inv.paymentMode || 'CASH'},
              ${inv.paymentStatus || 'PAID'}, ${Number(inv.amountPaid || 0)}, ${Number(inv.balanceDue || 0)},
              ${inv.cashierName || cashier}, ${JSON.stringify(inv.items || [])}::jsonb, ${JSON.stringify(inv)}::jsonb
            )
            ON CONFLICT (id) DO UPDATE SET
              payment_status = EXCLUDED.payment_status,
              amount_paid = EXCLUDED.amount_paid,
              balance_due = EXCLUDED.balance_due,
              data = EXCLUDED.data;
          `;
        } catch (invErr) {
          // Ignore individual invoice upsert failures if duplicate
        }
      }
    }

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      medicinesCount: data.medicines?.length || 0,
      invoicesCount: data.invoices?.length || 0,
      customersCount: data.customers?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to sync to Neon' },
      { status: 500 }
    );
  }
}
