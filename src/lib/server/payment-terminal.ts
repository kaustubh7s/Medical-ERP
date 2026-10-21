/**
 * Server-Side Integration Layer for External Pine Labs-Style POS Terminal Simulator
 * 
 * Communicates with the external terminal simulator over HTTP/REST.
 * Auth tokens and pairing secrets are managed server-side.
 */

import fs from 'fs';
import path from 'path';
import {
  PosTerminalHealthResponse,
  TerminalPaymentRequestPayload,
  TerminalPaymentResponse,
} from '@/types/pharmacy';

export interface TerminalConfig {
  baseUrl: string;
  token?: string;
  deviceId: string;
  merchantName: string;
}

export function getStoredConfig(): Partial<TerminalConfig> {
  try {
    const configFile = path.join(process.cwd(), 'data', 'terminal_config.json');
    if (fs.existsSync(configFile)) {
      const content = fs.readFileSync(configFile, 'utf-8');
      return JSON.parse(content) || {};
    }
  } catch {}
  return {};
}

export function saveTerminalConfig(config: Partial<TerminalConfig>) {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = getStoredConfig();
    const merged = { ...current, ...config, updatedAt: new Date().toISOString() };
    const configFile = path.join(dir, 'terminal_config.json');
    fs.writeFileSync(configFile, JSON.stringify(merged, null, 2), 'utf-8');
  } catch {}
}

export function getStoredToken(): string | null {
  try {
    const tokenFile = path.join(process.cwd(), 'data', 'terminal_token.json');
    if (fs.existsSync(tokenFile)) {
      const content = fs.readFileSync(tokenFile, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.token) {
        return parsed.token;
      }
    }
  } catch {}
  return null;
}

export function saveStoredToken(token: string) {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tokenFile = path.join(dir, 'terminal_token.json');
    fs.writeFileSync(
      tokenFile,
      JSON.stringify({ token, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch {}
}

export function buildTerminalHeaders(
  token?: string,
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...extra,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function getTerminalConfig(): TerminalConfig {
  const stored = getStoredConfig();
  return {
    baseUrl:
      stored.baseUrl ||
      process.env.POS_TERMINAL_API_BASE_URL ||
      'http://localhost:3001',
    token:
      getStoredToken() ||
      stored.token ||
      process.env.POS_TERMINAL_TOKEN ||
      'pos_live_a835119957a4d1dad3bd47ebec98bad50494f51ee05a4292',
    deviceId:
      stored.deviceId ||
      process.env.POS_TERMINAL_DEVICE_ID ||
      'PINELABS-POS-M884',
    merchantName:
      stored.merchantName ||
      process.env.POS_TERMINAL_MERCHANT_NAME ||
      'CarePlus Pharmacy & Wellness',
  };
}

/**
 * Health check & readiness ping against the simulator
 */
export async function checkTerminalHealth(customConfig?: Partial<TerminalConfig>): Promise<PosTerminalHealthResponse> {
  const config = { ...getTerminalConfig(), ...customConfig };
  const url = `${config.baseUrl.replace(/\/+$/, '')}/api/terminal/health`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: buildTerminalHeaders(),
      cache: 'no-store',
      // Short timeout so ERP UI remains responsive if simulator is offline
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return {
        status: 'UNHEALTHY',
        deviceId: config.deviceId,
        merchantName: config.merchantName,
        environment: 'DEMO',
        terminalStatus: 'UNAVAILABLE',
        isPaired: false,
      };
    }

    const data = await res.json();
    return {
      status: data.status || 'HEALTHY',
      simulator: data.simulator || 'Pine Labs-Style POS Terminal Simulator',
      deviceId: data.deviceId || config.deviceId,
      merchantName: data.merchantName || config.merchantName,
      environment: data.environment || 'DEMO',
      terminalStatus: data.terminalStatus || 'READY',
      isPaired: Boolean(data.isPaired),
      pairedClientId: data.pairedClientId,
      firmwareVersion: data.firmwareVersion,
      timestamp: data.timestamp || new Date().toISOString(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return {
      status: 'DISCONNECTED',
      simulator: 'Pine Labs-Style POS Terminal Simulator',
      deviceId: config.deviceId,
      merchantName: config.merchantName,
      environment: 'DEMO',
      terminalStatus: 'OFFLINE',
      isPaired: false,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Request a 6-digit pairing code from the simulator screen
 */
export async function requestPairingCode(customConfig?: Partial<TerminalConfig>) {
  const config = { ...getTerminalConfig(), ...customConfig };
  const url = `${config.baseUrl.replace(/\/+$/, '')}/api/device/pair`;

  const res = await fetch(url, {
    method: 'GET',
    headers: buildTerminalHeaders(),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to request pairing code: ${res.status} ${text}`);
  }

  return await res.json();
}

/**
 * Complete pairing with the terminal using a pairing code
 */
export async function pairTerminal(pairingCode: string, clientName?: string, customConfig?: Partial<TerminalConfig>) {
  const config = { ...getTerminalConfig(), ...customConfig };
  const url = `${config.baseUrl.replace(/\/+$/, '')}/api/device/pair`;

  const res = await fetch(url, {
    method: 'POST',
    headers: buildTerminalHeaders(undefined, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      pairingCode: pairingCode.trim(),
      clientName: clientName || 'CarePlus-Pharmacy-Counter-1',
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.message || `Pairing failed with status ${res.status}`);
  }

  if (data.token) {
    saveStoredToken(data.token);
  }

  return data;
}

/**
 * Automatically fetch pairing code from terminal and pair to obtain a valid Bearer token
 */
export async function autoPairWithTerminal(customConfig?: Partial<TerminalConfig>): Promise<string | null> {
  try {
    const codeData = await requestPairingCode(customConfig);
    if (codeData && codeData.pairingCode) {
      const pairData = await pairTerminal(codeData.pairingCode, 'CarePlus-Pharmacy-Counter-1', customConfig);
      if (pairData && pairData.token) {
        saveStoredToken(pairData.token);
        return pairData.token;
      }
    }
  } catch (err) {
    console.warn('Auto-pair with terminal failed:', err);
  }
  return null;
}

/**
 * Submit an authoritative payment request to the external terminal simulator
 */
export async function submitPaymentRequest(
  payload: TerminalPaymentRequestPayload,
  customConfig?: Partial<TerminalConfig>
): Promise<TerminalPaymentResponse> {
  const config = { ...getTerminalConfig(), ...customConfig };
  const url = `${config.baseUrl.replace(/\/+$/, '')}/api/terminal/payment-requests`;

  if (!payload.requestId || !payload.invoiceReference || payload.amount <= 0) {
    throw new Error('Invalid payment request parameters: requestId, invoiceReference and positive amount are required.');
  }

  // The simulator contract strictly forbids status, success, or isSuccess in client payload
  const cleanBody = {
    requestId: payload.requestId,
    amount: Number(payload.amount.toFixed(2)),
    currency: payload.currency || 'INR',
    invoiceReference: payload.invoiceReference,
    paymentMethod: payload.paymentMethod || 'CUSTOMER_CHOICE',
  };

  const headers = buildTerminalHeaders(config.token, {
    'Content-Type': 'application/json',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(cleanBody),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });

  const data = await res.json();

  if (!res.ok) {
    let errorMsg = data.error || data.message || `Payment request rejected by terminal (HTTP ${res.status})`;

    // Auto-heal on expired/invalid Bearer token
    if (res.status === 401 || (typeof errorMsg === 'string' && errorMsg.includes('Bearer token'))) {
      const newToken = await autoPairWithTerminal(config);
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(cleanBody),
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
        const retryData = await retryRes.json();
        if (retryRes.ok && retryData.success) {
          return {
            success: true,
            message: retryData.message,
            transactionId: retryData.transactionId,
            requestId: retryData.requestId,
            invoiceReference: retryData.invoiceReference,
            amount: retryData.amount,
            currency: retryData.currency,
            status: retryData.status || 'PAYMENT_REQUESTED',
            isDemo: retryData.isDemo,
          };
        } else if (retryData.error) {
          errorMsg = retryData.error;
        }
      }
    }

    return {
      success: false,
      error: errorMsg,
      status: 'FAILED',
      failureReason: errorMsg,
    };
  }

  return {
    success: true,
    message: data.message,
    transactionId: data.transactionId,
    requestId: data.requestId,
    invoiceReference: data.invoiceReference,
    amount: data.amount,
    currency: data.currency,
    status: data.status || 'PAYMENT_REQUESTED',
    isDemo: data.isDemo,
  };
}

/**
 * Query transaction status by Transaction ID or Request ID
 */
export async function getPaymentStatus(
  identifier: string,
  customConfig?: Partial<TerminalConfig>
): Promise<TerminalPaymentResponse> {
  const config = { ...getTerminalConfig(), ...customConfig };
  const headers = buildTerminalHeaders(config.token);

  // First try direct lookup by identifier (as transactionId)
  const directUrl = `${config.baseUrl.replace(/\/+$/, '')}/api/terminal/payment-requests/${encodeURIComponent(identifier)}`;
  try {
    const res = await fetch(directUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          transactionId: data.transactionId,
          requestId: data.requestId,
          invoiceReference: data.invoiceReference,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          authCode: data.authCode,
          rrn: data.rrn,
          cardLast4: data.cardLast4,
          cardNetwork: data.cardNetwork,
          cardEntryMode: data.cardEntryMode,
          upiVpa: data.upiVpa,
          failureReason: data.failureReason,
          isDemo: data.isDemo,
          receipt: data.receipt,
          createdAt: data.createdAt,
          completedAt: data.completedAt,
        };
      }
    }
  } catch {
    // Fall through to active transaction check
  }

  // If not found directly, check active transaction on terminal
  const activeUrl = `${config.baseUrl.replace(/\/+$/, '')}/api/terminal/payment-requests`;
  try {
    const res = await fetch(activeUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const activeData = await res.json();
      const active = activeData.activeTransaction;
      if (active && (active.id === identifier || active.requestId === identifier || active.invoiceReference === identifier)) {
        return {
          success: true,
          transactionId: active.id,
          requestId: active.requestId,
          invoiceReference: active.invoiceReference,
          amount: active.amount,
          currency: active.currency,
          status: active.status,
          authCode: active.authCode,
          rrn: active.rrn,
          cardLast4: active.cardLast4,
          cardNetwork: active.cardNetwork,
          cardEntryMode: active.cardEntryMode,
          upiVpa: active.upiVpa,
          failureReason: active.failureReason,
          isDemo: active.isDemo,
          receipt: active.receiptData,
          createdAt: active.createdAt,
          completedAt: active.completedAt,
        };
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Status check failed';
    return {
      success: false,
      error: `Terminal communication error: ${msg}`,
      status: 'FAILED',
    };
  }

  return {
    success: false,
    error: `Transaction not found for identifier '${identifier}'`,
    status: 'FAILED',
  };
}

/**
 * Cancel an in-flight payment request
 */
export async function cancelPayment(
  identifier: string,
  customConfig?: Partial<TerminalConfig>
): Promise<{ success: boolean; message?: string; status?: string; error?: string }> {
  const config = { ...getTerminalConfig(), ...customConfig };
  const headers = buildTerminalHeaders(config.token);

  let transactionId = identifier;

  // If identifier does not start with TXN-, resolve via status check
  if (!identifier.startsWith('TXN-')) {
    const statusResult = await getPaymentStatus(identifier, customConfig);
    if (statusResult.transactionId) {
      transactionId = statusResult.transactionId;
    }
  }

  const cancelUrl = `${config.baseUrl.replace(/\/+$/, '')}/api/terminal/payment-requests/${encodeURIComponent(transactionId)}/cancel`;

  try {
    const res = await fetch(cancelUrl, {
      method: 'POST',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    if (!res.ok && res.status === 401) {
      const newToken = await autoPairWithTerminal(config);
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(cancelUrl, {
          method: 'POST',
          headers,
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        const retryData = await retryRes.json();
        return {
          success: retryRes.ok && retryData.success,
          message: retryData.message,
          status: retryData.status,
          error: retryData.error,
        };
      }
    }

    return {
      success: res.ok && data.success,
      message: data.message,
      status: data.status,
      error: data.error,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cancel request failed';
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Authoritative Server-to-Server Verification of Terminal Payment
 * Checks status strictly equals 'SUCCESS', amounts match, invoice references match, and request IDs match.
 */
export async function verifyPaymentAuthoritatively(params: {
  transactionId?: string;
  requestId: string;
  expectedAmount: number;
  expectedInvoiceReference: string;
  expectedCurrency?: string;
  customConfig?: Partial<TerminalConfig>;
}): Promise<{
  verified: boolean;
  reason?: string;
  transaction?: TerminalPaymentResponse;
}> {
  const identifier = params.transactionId || params.requestId;
  const statusRes = await getPaymentStatus(identifier, params.customConfig);

  if (!statusRes.success) {
    return {
      verified: false,
      reason: statusRes.error || 'Transaction could not be found on POS Terminal.',
    };
  }

  if (statusRes.status !== 'SUCCESS') {
    return {
      verified: false,
      reason: `Transaction is not marked as SUCCESS. Current terminal status is: ${statusRes.status}${statusRes.failureReason ? ` (${statusRes.failureReason})` : ''}`,
      transaction: statusRes,
    };
  }

  // Verify requestId matches
  if (statusRes.requestId && statusRes.requestId !== params.requestId) {
    return {
      verified: false,
      reason: `Security mismatch: payment request ID '${statusRes.requestId}' does not match expected '${params.requestId}'.`,
      transaction: statusRes,
    };
  }

  // Verify invoiceReference matches
  if (statusRes.invoiceReference && statusRes.invoiceReference !== params.expectedInvoiceReference) {
    return {
      verified: false,
      reason: `Security mismatch: invoice reference '${statusRes.invoiceReference}' does not match expected '${params.expectedInvoiceReference}'.`,
      transaction: statusRes,
    };
  }

  // Decimal-safe amount verification (tolerance within 0.01)
  const actualAmount = Number(statusRes.amount || 0);
  const expectedAmount = Number(params.expectedAmount);
  if (Math.abs(actualAmount - expectedAmount) > 0.01) {
    return {
      verified: false,
      reason: `Amount mismatch: terminal settled ₹${actualAmount.toFixed(2)}, but expected invoice amount is ₹${expectedAmount.toFixed(2)}.`,
      transaction: statusRes,
    };
  }

  // Verify currency matches
  const expectedCurrency = params.expectedCurrency || 'INR';
  if (statusRes.currency && statusRes.currency !== expectedCurrency) {
    return {
      verified: false,
      reason: `Currency mismatch: terminal used '${statusRes.currency}', expected '${expectedCurrency}'.`,
      transaction: statusRes,
    };
  }

  return {
    verified: true,
    transaction: statusRes,
  };
}
