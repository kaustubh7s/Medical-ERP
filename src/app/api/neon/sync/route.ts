import { NextResponse } from 'next/server';
import { sql } from '@/lib/neonClient';

function parseMemberNum(memId?: string): number {
  if (!memId) return 0;
  const match = memId.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function isWalkinCustomer(name?: string, id?: string, phone?: string): boolean {
  if (id && id.startsWith('cust-walkin')) return true;
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone === '9999999999' || cleanPhone === '0000000000') return true;
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  return (
    lower === 'walk-in' ||
    lower === 'walk in' ||
    lower === 'walk-in customer' ||
    lower === 'walk in customer' ||
    lower === 'walk-in cash customer' ||
    lower === 'walk in cash customer' ||
    lower.includes('walk-in') ||
    lower.includes('walkin')
  );
}

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

    const data = rows[0].data || {};

    // 1. Fetch all memberships from relational table to ensure full multi-system synchronization
    let dbMemberships: any[] = [];
    try {
      dbMemberships = await sql`
        SELECT id, membership_id, customer_id, customer_name, customer_phone,
               customer_email, customer_address, plan_name, tier, duration_months,
               duration_label, start_date, expiry_date, fee, status, payment_mode,
               created_date, created_by, data
        FROM pharmacy_memberships
        ORDER BY created_date DESC, id DESC;
      `;
    } catch (err) {
      console.warn('Failed to query pharmacy_memberships in GET /sync', err);
    }

    // 2. Fetch all customers from relational table
    let dbCustomers: any[] = [];
    try {
      dbCustomers = await sql`
        SELECT id, name, phone, email, address, gst_number, credit_limit,
               current_due, loyalty_points, doctor_name, data
        FROM pharmacy_customers
        ORDER BY updated_at DESC, id DESC;
      `;
    } catch (err) {
      console.warn('Failed to query pharmacy_customers in GET /sync', err);
    }

    // 3. Merge memberships by ID / membershipId (excluding walk-ins)
    const memMap = new Map<string, any>();
    if (Array.isArray(data.memberships)) {
      for (const m of data.memberships) {
        if (isWalkinCustomer(m.customerName, m.id, m.customerPhone)) continue;
        const key = m.membershipId || m.id || m.customerPhone;
        if (key) memMap.set(key, m);
      }
    }
    for (const row of dbMemberships) {
      const rowData = row.data && typeof row.data === 'object' ? row.data : {};
      const custName = row.customer_name || rowData.customerName || 'Member';
      if (isWalkinCustomer(custName, row.id, row.customer_phone)) continue;

      const memObj = {
        id: row.id,
        membershipId: row.membership_id || row.id,
        customerId: row.customer_id || rowData.customerId || `cust-${row.id}`,
        customerName: custName,
        customerPhone: row.customer_phone || rowData.customerPhone || '',
        customerEmail: row.customer_email || rowData.customerEmail,
        customerAddress: row.customer_address || rowData.customerAddress,
        startDate: row.start_date || rowData.startDate,
        durationMonths: Number(row.duration_months || rowData.durationMonths || 12),
        durationLabel: row.duration_label || rowData.durationLabel || '12 Months',
        expiryDate: row.expiry_date || rowData.expiryDate,
        status: row.status || rowData.status || 'ACTIVE',
        feePaid: Number(rowData.feePaid ?? row.fee ?? 149),
        paymentMode: row.payment_mode || rowData.paymentMode || 'CASH',
        notes: rowData.notes || `Membership fee paid via ${row.payment_mode || 'CASH'}`,
        createdDate: row.created_date || rowData.createdDate,
        createdBy: row.created_by || rowData.createdBy || 'Store Admin',
        history: rowData.history || [],
        ...rowData,
      };
      if (!memObj.feePaid && row.fee) memObj.feePaid = Number(row.fee);
      const key = memObj.membershipId || memObj.id || memObj.customerPhone;
      memMap.set(key, memObj);
    }
    data.memberships = Array.from(memMap.values());

    // 4. Merge customers by phone (clean digits) and ID (strictly excluding walk-in sales records)
    const custMap = new Map<string, any>();
    if (Array.isArray(data.customers)) {
      for (const c of data.customers) {
        if (isWalkinCustomer(c.name, c.id, c.phone)) continue;
        const cleanP = (c.phone || '').replace(/\D/g, '');
        const key = cleanP || c.id;
        if (key) custMap.set(key, c);
      }
    }
    for (const row of dbCustomers) {
      const rowName = row.name || (row.data && row.data.name);
      if (isWalkinCustomer(rowName, row.id, row.phone)) continue;

      const rowData = row.data && typeof row.data === 'object' ? row.data : {};
      const custObj = {
        id: row.id,
        name: rowName || 'Customer',
        phone: row.phone || rowData.phone || '',
        email: row.email || rowData.email,
        address: row.address || rowData.address,
        gstNumber: row.gst_number || rowData.gstNumber,
        creditLimit: Number(row.credit_limit ?? rowData.creditLimit ?? 5000),
        currentDue: Number(row.current_due ?? rowData.currentDue ?? 0),
        loyaltyPoints: Number(row.loyalty_points ?? rowData.loyaltyPoints ?? 0),
        doctorName: row.doctor_name || rowData.doctorName || 'Self',
        createdDate: rowData.createdDate || new Date().toISOString().split('T')[0],
        ...rowData,
      };
      const cleanP = (custObj.phone || '').replace(/\D/g, '');
      const key = cleanP || custObj.id;
      custMap.set(key, custObj);
    }

    // 5. Ensure all legitimate members exist in customer CRM
    for (const m of data.memberships) {
      if (isWalkinCustomer(m.customerName, m.id, m.customerPhone)) continue;
      const cleanP = (m.customerPhone || '').replace(/\D/g, '');
      const key = cleanP || m.customerId || m.id;
      if (key && !custMap.has(key) && !custMap.has(cleanP)) {
        const synthesizedCustomer = {
          id: m.customerId || `cust-${m.id || Date.now()}`,
          name: m.customerName,
          phone: m.customerPhone,
          email: m.customerEmail,
          address: m.customerAddress,
          creditLimit: 5000,
          currentDue: 0,
          loyaltyPoints: 50,
          doctorName: 'Self',
          createdDate: m.createdDate || new Date().toISOString().split('T')[0],
        };
        custMap.set(key, synthesizedCustomer);
      }
    }
    data.customers = Array.from(custMap.values());

    // 6. Guarantee membershipSettings.nextNumber is ahead of all existing members
    let maxMemNum = 1000;
    for (const m of data.memberships) {
      const num = parseMemberNum(m.membershipId);
      if (num > maxMemNum) maxMemNum = num;
    }
    if (!data.membershipSettings) {
      data.membershipSettings = {};
    }
    data.membershipSettings.nextNumber = Math.max(
      data.membershipSettings.nextNumber || 1000,
      maxMemNum + 1
    );

    return NextResponse.json({
      hasData: true,
      data,
      updatedAt: rows[0].updated_at,
      updatedBy: rows[0].updated_by,
      membershipsCount: data.memberships.length,
      customersCount: data.customers.length,
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

    const cashier = cashierName || 'CarePlus Admin';

    // 1. Sync & Upsert Memberships to relational table (excluding walk-ins)
    if (Array.isArray(data.memberships) && data.memberships.length > 0) {
      for (const mem of data.memberships) {
        if (isWalkinCustomer(mem.customerName, mem.id, mem.customerPhone)) continue;
        try {
          const fee = Number(mem.feePaid ?? mem.fee ?? 149);
          const memId = mem.membershipId || mem.id;
          await sql`
            INSERT INTO pharmacy_memberships (
              id, membership_id, customer_id, customer_name, customer_phone,
              customer_email, customer_address, plan_name, tier, duration_months,
              duration_label, start_date, expiry_date, fee, status, payment_mode,
              created_date, created_by, data, updated_at
            ) VALUES (
              ${mem.id}, ${memId}, ${mem.customerId || null},
              ${mem.customerName || null}, ${mem.customerPhone || null}, ${mem.customerEmail || null},
              ${mem.customerAddress || null}, ${mem.planName || null}, ${mem.tier || null},
              ${Number(mem.durationMonths || 12)}, ${mem.durationLabel || null}, ${mem.startDate || null},
              ${mem.expiryDate || null}, ${fee}, ${mem.status || 'ACTIVE'},
              ${mem.paymentMode || 'CASH'}, ${mem.createdDate || null}, ${mem.createdBy || cashier},
              ${JSON.stringify({ ...mem, feePaid: fee })}::jsonb, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              membership_id = EXCLUDED.membership_id,
              customer_name = EXCLUDED.customer_name,
              customer_phone = EXCLUDED.customer_phone,
              customer_email = EXCLUDED.customer_email,
              customer_address = EXCLUDED.customer_address,
              status = EXCLUDED.status,
              expiry_date = EXCLUDED.expiry_date,
              fee = EXCLUDED.fee,
              data = EXCLUDED.data,
              updated_at = NOW();
          `;
        } catch (err) {
          console.warn('Individual membership upsert error:', err);
        }
      }
    }

    // 2. Sync & Upsert Customers to relational table (strictly excluding walk-in sales)
    if (Array.isArray(data.customers) && data.customers.length > 0) {
      for (const cust of data.customers) {
        if (isWalkinCustomer(cust.name, cust.id, cust.phone)) continue;
        try {
          const custPhone = cust.phone ? String(cust.phone) : '0000000000';
          await sql`
            INSERT INTO pharmacy_customers (
              id, name, phone, email, address, gst_number, credit_limit,
              current_due, loyalty_points, doctor_name, data, updated_at
            ) VALUES (
              ${cust.id}, ${cust.name || 'Customer'}, ${custPhone}, ${cust.email || null},
              ${cust.address || null}, ${cust.gstNumber || null}, ${Number(cust.creditLimit || 5000)},
              ${Number(cust.currentDue || 0)}, ${Number(cust.loyaltyPoints || 0)},
              ${cust.doctorName || null}, ${JSON.stringify(cust)}::jsonb, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              email = EXCLUDED.email,
              address = EXCLUDED.address,
              current_due = EXCLUDED.current_due,
              loyalty_points = EXCLUDED.loyalty_points,
              doctor_name = EXCLUDED.doctor_name,
              data = EXCLUDED.data,
              updated_at = NOW();
          `;
        } catch (err) {
          console.warn('Individual customer upsert error:', err);
        }
      }
    }

    // 3. Sync Invoices to relational table (recent 100) — Invoices PRESERVE walk-in sales for tracking
    if (Array.isArray(data.invoices) && data.invoices.length > 0) {
      for (const inv of data.invoices.slice(0, 100)) {
        try {
          const invDateStr = inv.invoiceDate || inv.date || new Date().toISOString();
          await sql`
            INSERT INTO pharmacy_invoices (
              id, invoice_number, invoice_date, invoice_type,
              customer_id, customer_name, customer_phone, doctor_name,
              sub_total, total_discount, total_cgst, total_sgst, round_off,
              grand_total, payment_mode, payment_status, amount_paid,
              balance_due, cashier_name, items, data
            ) VALUES (
              ${inv.id}, ${inv.invoiceNumber}, ${invDateStr},
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
          // Ignore duplicate invoice upsert
        }
      }
    }

    // 4. Query full set of memberships and customers (excluding walk-ins)
    let allMems: any[] = [];
    try {
      allMems = await sql`SELECT data FROM pharmacy_memberships;`;
    } catch {}

    let allCusts: any[] = [];
    try {
      allCusts = await sql`SELECT data FROM pharmacy_customers;`;
    } catch {}

    const fullMemMap = new Map<string, any>();
    if (Array.isArray(data.memberships)) {
      data.memberships.forEach((m: any) => {
        if (isWalkinCustomer(m.customerName, m.id, m.customerPhone)) return;
        const k = m.membershipId || m.id || m.customerPhone;
        if (k) fullMemMap.set(k, m);
      });
    }
    allMems.forEach((row) => {
      if (row.data) {
        if (isWalkinCustomer(row.data.customerName, row.data.id, row.data.customerPhone)) return;
        const k = row.data.membershipId || row.data.id || row.data.customerPhone;
        if (k && !fullMemMap.has(k)) fullMemMap.set(k, row.data);
      }
    });
    data.memberships = Array.from(fullMemMap.values());

    const fullCustMap = new Map<string, any>();
    if (Array.isArray(data.customers)) {
      data.customers.forEach((c: any) => {
        if (isWalkinCustomer(c.name, c.id, c.phone)) return;
        const cleanP = (c.phone || '').replace(/\D/g, '');
        const k = cleanP || c.id;
        if (k) fullCustMap.set(k, c);
      });
    }
    allCusts.forEach((row) => {
      if (row.data) {
        if (isWalkinCustomer(row.data.name, row.data.id, row.data.phone)) return;
        const cleanP = (row.data.phone || '').replace(/\D/g, '');
        const k = cleanP || row.data.id;
        if (k && !fullCustMap.has(k)) fullCustMap.set(k, row.data);
      }
    });

    // Ensure all real members are in customers
    data.memberships.forEach((m: any) => {
      if (isWalkinCustomer(m.customerName, m.id, m.customerPhone)) return;
      const cleanP = (m.customerPhone || '').replace(/\D/g, '');
      const k = cleanP || m.customerId || m.id;
      if (k && !fullCustMap.has(k) && !fullCustMap.has(cleanP)) {
        fullCustMap.set(k, {
          id: m.customerId || `cust-${m.id || Date.now()}`,
          name: m.customerName,
          phone: m.customerPhone,
          email: m.customerEmail,
          address: m.customerAddress,
          creditLimit: 5000,
          currentDue: 0,
          loyaltyPoints: 50,
          doctorName: 'Self',
          createdDate: m.createdDate || new Date().toISOString().split('T')[0],
        });
      }
    });
    data.customers = Array.from(fullCustMap.values());

    // Compute highest nextNumber
    let highestNum = 1000;
    data.memberships.forEach((m: any) => {
      const n = parseMemberNum(m.membershipId);
      if (n > highestNum) highestNum = n;
    });
    if (!data.membershipSettings) data.membershipSettings = {};
    data.membershipSettings.nextNumber = Math.max(data.membershipSettings.nextNumber || 1000, highestNum + 1);

    const mergedPayloadString = JSON.stringify(data);

    // 5. Atomic upsert to main snapshot with merged payload
    const syncRes = await sql`
      INSERT INTO pharmacy_sync_state (key, data, updated_at, updated_by)
      VALUES ('careplus_erp_live', ${mergedPayloadString}::jsonb, NOW(), ${cashier})
      ON CONFLICT (key) DO UPDATE
      SET data = EXCLUDED.data,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
      RETURNING updated_at;
    `;

    const serverUpdatedAt = syncRes[0]?.updated_at
      ? new Date(syncRes[0].updated_at).toISOString()
      : new Date().toISOString();

    return NextResponse.json({
      success: true,
      syncedAt: serverUpdatedAt,
      medicinesCount: data.medicines?.length || 0,
      invoicesCount: data.invoices?.length || 0,
      customersCount: data.customers.length,
      membershipsCount: data.memberships.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to sync to Neon' },
      { status: 500 }
    );
  }
}
