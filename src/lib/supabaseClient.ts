// Supabase client helper & enterprise SQL schema generator

export const SUPABASE_SQL_SCHEMA = `-- Enterprise Pharmacy ERP Supabase PostgreSQL Schema with RLS
-- Run this in your Supabase SQL Editor to provision your production cloud database.

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles & Roles
CREATE TABLE IF NOT EXISTS pharmacy_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'PHARMACIST', 'CASHIER', 'STAFF')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  credit_limit NUMERIC DEFAULT 0,
  current_due NUMERIC DEFAULT 0,
  loyalty_points NUMERIC DEFAULT 0,
  doctor_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  drug_license_number TEXT,
  payment_terms TEXT,
  current_balance NUMERIC DEFAULT 0,
  bank_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Medicines Master
CREATE TABLE IF NOT EXISTS medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  generic_name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  category TEXT NOT NULL,
  dosage_form TEXT NOT NULL,
  strength TEXT NOT NULL,
  pack_size TEXT NOT NULL,
  hsn_code TEXT NOT NULL,
  gst_rate NUMERIC NOT NULL DEFAULT 12,
  schedule_type TEXT NOT NULL DEFAULT 'NORMAL',
  reorder_level INTEGER NOT NULL DEFAULT 20,
  max_stock_level INTEGER NOT NULL DEFAULT 200,
  requires_prescription BOOLEAN DEFAULT false,
  barcode TEXT,
  storage_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Batches (FEFO Inventory Engine)
CREATE TABLE IF NOT EXISTS medicine_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  mfg_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  purchase_rate NUMERIC NOT NULL,
  mrp NUMERIC NOT NULL,
  sale_rate NUMERIC NOT NULL,
  rack_location TEXT NOT NULL,
  barcode TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Sales Invoices
CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date TIMESTAMPTZ DEFAULT NOW(),
  invoice_type TEXT NOT NULL DEFAULT 'RETAIL',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  doctor_name TEXT,
  items JSONB NOT NULL,
  sub_total NUMERIC NOT NULL,
  total_discount NUMERIC NOT NULL,
  total_cgst NUMERIC NOT NULL,
  total_sgst NUMERIC NOT NULL,
  total_igst NUMERIC NOT NULL DEFAULT 0,
  round_off NUMERIC DEFAULT 0,
  grand_total NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PAID',
  amount_paid NUMERIC NOT NULL,
  balance_due NUMERIC DEFAULT 0,
  cashier_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Purchases & GRN
CREATE TABLE IF NOT EXISTS purchase_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_number TEXT UNIQUE NOT NULL,
  bill_number TEXT NOT NULL,
  bill_date DATE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT NOT NULL,
  supplier_gst TEXT,
  items JSONB NOT NULL,
  sub_total NUMERIC NOT NULL,
  total_discount NUMERIC DEFAULT 0,
  total_gst NUMERIC NOT NULL,
  grand_total NUMERIC NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC NOT NULL,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Operational Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL,
  paid_to TEXT NOT NULL,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Customer Memberships (Loyalty Program)
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  start_date DATE NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 12,
  duration_label TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED', 'CANCELLED')),
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Membership History & Audit Trail
CREATE TABLE IF NOT EXISTS membership_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
  date TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL CHECK (action IN ('CREATED', 'RENEWED', 'EXTENDED', 'SUSPENDED', 'REACTIVATED', 'CANCELLED', 'TIER_CHANGED', 'PURCHASE_APPLIED')),
  previous_expiry_date DATE,
  new_expiry_date DATE,
  previous_status TEXT,
  new_status TEXT,
  performed_by TEXT NOT NULL,
  notes TEXT,
  invoice_number TEXT,
  discount_amount NUMERIC DEFAULT 0
);

-- 13. Membership Settings & Discount Rules
CREATE TABLE IF NOT EXISTS membership_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_prefix TEXT NOT NULL DEFAULT 'MEM',
  next_number INTEGER NOT NULL DEFAULT 1001,
  default_duration_months INTEGER NOT NULL DEFAULT 12,
  available_durations JSONB NOT NULL DEFAULT '[{"months":1,"label":"1 Month"},{"months":3,"label":"3 Months"},{"months":6,"label":"6 Months"},{"months":12,"label":"12 Months"}]'::jsonb,
  qualification_period_months INTEGER NOT NULL DEFAULT 3,
  purchase_threshold NUMERIC NOT NULL DEFAULT 3000,
  lower_tier_discount_percent NUMERIC NOT NULL DEFAULT 10,
  higher_tier_discount_percent NUMERIC NOT NULL DEFAULT 20,
  allow_discount_stacking BOOLEAN NOT NULL DEFAULT false,
  excluded_categories JSONB DEFAULT '[]'::jsonb,
  excluded_schedule_types JSONB DEFAULT '[]'::jsonb,
  expiry_alert_days_warning INTEGER NOT NULL DEFAULT 30,
  expiry_alert_days_urgent INTEGER NOT NULL DEFAULT 7,
  auto_deactivate_on_expiry BOOLEAN NOT NULL DEFAULT true,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT NOT NULL,
  audit_log JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 14. Performance Indexes for Counter Lookup
CREATE INDEX IF NOT EXISTS idx_memberships_phone ON memberships(customer_phone);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_expiry ON memberships(expiry_date);
CREATE INDEX IF NOT EXISTS idx_memberships_mem_id ON memberships(membership_id);
CREATE INDEX IF NOT EXISTS idx_membership_history_mem_id ON membership_history(membership_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_phone ON sales_invoices(customer_phone);

-- 15. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB
);

-- 16. Enable Row Level Security (RLS)
ALTER TABLE pharmacy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 17. Permissive RLS Policies for Authenticated Staff
CREATE POLICY "Staff can view medicines" ON medicines FOR SELECT USING (true);
CREATE POLICY "Staff can insert/update medicines" ON medicines FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can view sales" ON sales_invoices FOR SELECT USING (true);
CREATE POLICY "Staff can insert sales" ON sales_invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can view memberships" ON memberships FOR SELECT USING (true);
CREATE POLICY "Staff can insert/update memberships" ON memberships FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can view membership history" ON membership_history FOR SELECT USING (true);
CREATE POLICY "Staff can insert membership history" ON membership_history FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can view membership settings" ON membership_settings FOR SELECT USING (true);
CREATE POLICY "Staff can update membership settings" ON membership_settings FOR ALL USING (auth.role() = 'authenticated');
`;
