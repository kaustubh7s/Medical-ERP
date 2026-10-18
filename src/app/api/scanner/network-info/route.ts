import { NextResponse } from 'next/server';
import { getLocalNetworkAddresses } from '@/lib/server/scannerSessions';

export async function GET() {
  const addresses = getLocalNetworkAddresses();
  const defaultIp = addresses[0]?.ip || 'localhost';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  return NextResponse.json({
    localIps: addresses,
    defaultIp,
    port,
    hostname: defaultIp,
  });
}
