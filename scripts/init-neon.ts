import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required.');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  console.log('🔄 Connecting to Neon Serverless Postgres...');
  const result = await sql`SELECT NOW() as current_time, version() as pg_version;`;
  console.log('✅ Connected successfully to Neon Postgres!');
  console.log('Server info:', result[0]);

  console.log('📦 Creating tables for CarePlus Pharmacy ERP...');

  // 1. App State / Snapshot sync table (for atomic sync across devices)
  await sql`
    CREATE TABLE IF NOT EXISTS pharmacy_sync_state (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by TEXT DEFAULT 'system'
    );
  `;

  // 2. Individual relational tables
  await sql`
    CREATE TABLE IF NOT EXISTS pharmacy_medicines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      generic_name TEXT,
      manufacturer TEXT,
      category TEXT,
      dosage_form TEXT,
      strength TEXT,
      pack_size TEXT,
      hsn_code TEXT,
      gst_rate NUMERIC DEFAULT 12,
      rack_location TEXT,
      reorder_level INTEGER DEFAULT 10,
      requires_prescription BOOLEAN DEFAULT false,
      is_narcotic BOOLEAN DEFAULT false,
      is_chronic BOOLEAN DEFAULT false,
      data JSONB,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pharmacy_customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      gst_number TEXT,
      credit_limit NUMERIC DEFAULT 0,
      current_due NUMERIC DEFAULT 0,
      loyalty_points NUMERIC DEFAULT 0,
      doctor_name TEXT,
      data JSONB,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pharmacy_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      invoice_date TIMESTAMPTZ NOT NULL,
      invoice_type TEXT DEFAULT 'RETAIL',
      customer_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      doctor_name TEXT,
      sub_total NUMERIC NOT NULL,
      total_discount NUMERIC DEFAULT 0,
      total_cgst NUMERIC DEFAULT 0,
      total_sgst NUMERIC DEFAULT 0,
      total_igst NUMERIC DEFAULT 0,
      round_off NUMERIC DEFAULT 0,
      grand_total NUMERIC NOT NULL,
      payment_mode TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      amount_paid NUMERIC DEFAULT 0,
      balance_due NUMERIC DEFAULT 0,
      cashier_name TEXT,
      items JSONB NOT NULL,
      data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pharmacy_day_closings (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      opening_cash NUMERIC DEFAULT 5000,
      total_sales_cash NUMERIC DEFAULT 0,
      total_sales_upi NUMERIC DEFAULT 0,
      total_sales_card NUMERIC DEFAULT 0,
      expected_cash NUMERIC DEFAULT 5000,
      actual_cash NUMERIC DEFAULT 5000,
      discrepancy NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'BALANCED',
      closed_by TEXT,
      closed_at TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT,
      data JSONB
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pharmacy_cash_drawer_transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      date_time TIMESTAMPTZ DEFAULT NOW(),
      reason TEXT,
      reference_number TEXT,
      cashier_name TEXT,
      data JSONB
    );
  `;

  console.log('🎉 All Neon tables created successfully!');
}

main().catch((err) => {
  console.error('❌ Neon setup failed:', err);
  process.exit(1);
});
