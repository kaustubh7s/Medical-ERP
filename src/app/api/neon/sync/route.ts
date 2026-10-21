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
        } catch {
          // Ignore individual invoice upsert failures if duplicate
        }
      }
    }

    // 3. Sync Memberships to relational table
    if (Array.isArray(data.memberships) && data.memberships.length > 0) {
      for (const mem of data.memberships) {
        try {
          await sql`
            INSERT INTO pharmacy_memberships (
              id, membership_id, customer_id, customer_name, customer_phone,
              customer_email, customer_address, plan_name, tier, duration_months,
              duration_label, start_date, expiry_date, fee, status, payment_mode,
              created_date, created_by, data, updated_at
            ) VALUES (
              ${mem.id}, ${mem.membershipId || mem.id}, ${mem.customerId || null},
              ${mem.customerName || null}, ${mem.customerPhone || null}, ${mem.customerEmail || null},
              ${mem.customerAddress || null}, ${mem.planName || null}, ${mem.tier || null},
              ${Number(mem.durationMonths || 12)}, ${mem.durationLabel || null}, ${mem.startDate || null},
              ${mem.expiryDate || null}, ${Number(mem.fee || 0)}, ${mem.status || 'ACTIVE'},
              ${mem.paymentMode || 'CASH'}, ${mem.createdDate || null}, ${mem.createdBy || cashier},
              ${JSON.stringify(mem)}::jsonb, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              expiry_date = EXCLUDED.expiry_date,
              fee = EXCLUDED.fee,
              data = EXCLUDED.data,
              updated_at = NOW();
          `;
        } catch {
          // Ignore individual membership failure
        }
      }
    }

    // 4. Sync Customers to relational table (recent 100)
    if (Array.isArray(data.customers) && data.customers.length > 0) {
      for (const cust of data.customers.slice(0, 100)) {
        try {
          await sql`
            INSERT INTO pharmacy_customers (
              id, name, phone, email, address, gst_number, credit_limit,
              current_due, loyalty_points, doctor_name, data, updated_at
            ) VALUES (
              ${cust.id}, ${cust.name}, ${cust.phone || null}, ${cust.email || null},
              ${cust.address || null}, ${cust.gstNumber || null}, ${Number(cust.creditLimit || 0)},
              ${Number(cust.currentDue || 0)}, ${Number(cust.loyaltyPoints || 0)},
              ${cust.doctorName || null}, ${JSON.stringify(cust)}::jsonb, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              current_due = EXCLUDED.current_due,
              loyalty_points = EXCLUDED.loyalty_points,
              data = EXCLUDED.data,
              updated_at = NOW();
          `;
        } catch {
          // Ignore
        }
      }
    }

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      medicinesCount: data.medicines?.length || 0,
      invoicesCount: data.invoices?.length || 0,
      customersCount: data.customers?.length || 0,
      membershipsCount: data.memberships?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to sync to Neon' },
      { status: 500 }
    );
  }
}
