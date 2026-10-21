import { NextRequest, NextResponse } from 'next/server';
import {
  getTerminalConfig,
  saveTerminalConfig,
  checkTerminalHealth,
  saveStoredToken,
} from '@/lib/server/payment-terminal';

export async function GET() {
  try {
    const config = getTerminalConfig();
    const isRemote =
      config.baseUrl.includes('ngrok') ||
      config.baseUrl.startsWith('https://') ||
      !config.baseUrl.includes('localhost') && !config.baseUrl.includes('127.0.0.1');

    return NextResponse.json({
      success: true,
      baseUrl: config.baseUrl,
      deviceId: config.deviceId,
      merchantName: config.merchantName,
      hasToken: Boolean(config.token),
      isRemote,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch terminal config';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseUrl, deviceId, merchantName, token, testConnection } = body;

    const updates: Record<string, string> = {};
    if (baseUrl && typeof baseUrl === 'string') {
      updates.baseUrl = baseUrl.trim().replace(/\/+$/, '');
    }
    if (deviceId && typeof deviceId === 'string') {
      updates.deviceId = deviceId.trim();
    }
    if (merchantName && typeof merchantName === 'string') {
      updates.merchantName = merchantName.trim();
    }
    if (token && typeof token === 'string') {
      updates.token = token.trim();
      saveStoredToken(token.trim());
    }

    if (Object.keys(updates).length > 0) {
      saveTerminalConfig(updates);
    }

    const updatedConfig = getTerminalConfig();

    let health = null;
    if (testConnection) {
      health = await checkTerminalHealth(updatedConfig);
    }

    return NextResponse.json({
      success: true,
      message: 'Terminal configuration updated successfully',
      config: {
        baseUrl: updatedConfig.baseUrl,
        deviceId: updatedConfig.deviceId,
        merchantName: updatedConfig.merchantName,
        hasToken: Boolean(updatedConfig.token),
      },
      health,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update terminal config';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
