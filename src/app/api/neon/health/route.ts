import { NextResponse } from 'next/server';
import { sql } from '@/lib/neonClient';

export async function GET() {
  const startTime = Date.now();
  try {
    const result = await sql`SELECT NOW() as server_time, version() as pg_version;`;
    const latency = Date.now() - startTime;

    // Get count of synced records
    const counts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM pharmacy_medicines) as medicines_count,
        (SELECT COUNT(*) FROM pharmacy_customers) as customers_count,
        (SELECT COUNT(*) FROM pharmacy_invoices) as invoices_count,
        (SELECT updated_at FROM pharmacy_sync_state WHERE key = 'careplus_erp_live' LIMIT 1) as last_synced_at
    `;

    return NextResponse.json({
      status: 'CONNECTED',
      latencyMs: latency,
      serverTime: result[0]?.server_time,
      pgVersion: result[0]?.pg_version,
      stats: counts[0] || {},
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'ERROR',
        message: error.message || 'Failed to connect to Neon database',
      },
      { status: 500 }
    );
  }
}
