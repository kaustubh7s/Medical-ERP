/**
 * Server-side in-memory registry for Wireless Phone QR Scanner Sessions
 * Supports temporary pairing, Server-Sent Events (SSE) dispatch, and security validation.
 */

import { randomBytes } from 'crypto';
import os from 'os';

export interface ScannerSessionRecord {
  sessionId: string;
  pairingToken: string;
  pairingPin: string;
  expiresAt: number;
  createdAt: number;
  status: 'WAITING' | 'CONNECTED' | 'DISCONNECTED';
  activeWorkflow?: 'pos' | 'medicines' | 'other';
  connectedDevice?: {
    name: string;
    userAgent?: string;
    ip?: string;
    connectedAt: number;
  };
  lastScan?: {
    value: string;
    timestamp: number;
    matchedMedicineName?: string;
    status: 'MATCHED' | 'UNKNOWN' | 'IGNORED_WORKFLOW';
  };
  // Nonce history for duplicate suppression within a 5-second window
  recentNonces: Map<string, number>;
  // Rate limiting timestamps (max 10 scans / sec)
  scanTimestamps: number[];
}

// In-memory sessions storage (backed by globalThis to survive HMR and multi-route evaluation)
const globalForScanner = globalThis as unknown as {
  __careplus_scanner_sessions?: Map<string, ScannerSessionRecord>;
  __careplus_scanner_sse?: Map<string, Set<ReadableStreamDefaultController>>;
  __careplus_scanner_cleanup?: NodeJS.Timeout;
};

const sessions = globalForScanner.__careplus_scanner_sessions ?? new Map<string, ScannerSessionRecord>();
globalForScanner.__careplus_scanner_sessions = sessions;

const sseClients = globalForScanner.__careplus_scanner_sse ?? new Map<string, Set<ReadableStreamDefaultController>>();
globalForScanner.__careplus_scanner_sse = sseClients;

// Clean up expired sessions periodically (every 5 minutes)
if (typeof setInterval !== 'undefined' && !globalForScanner.__careplus_scanner_cleanup) {
  globalForScanner.__careplus_scanner_cleanup = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (session.expiresAt < now) {
        // Notify any open clients
        broadcastToSession(id, 'DISCONNECTED', { reason: 'SESSION_EXPIRED' });
        sessions.delete(id);
        sseClients.delete(id);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Detect reachable local IPv4 network addresses on this MacBook
 */
export function getLocalNetworkAddresses(): { iface: string; ip: string }[] {
  const addresses: { iface: string; ip: string }[] = [];
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      const netList = nets[name];
      if (!netList) continue;
      for (const net of netList) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push({ iface: name, ip: net.address });
        }
      }
    }
  } catch (err) {
    console.error('Error detecting network interfaces:', err);
  }
  return addresses;
}

/**
 * Create a new pairing session for the MacBook ERP
 */
export function createScannerSession(activeWorkflow: 'pos' | 'medicines' | 'other' = 'pos'): ScannerSessionRecord {
  const sessionId = `sess_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const pairingToken = randomBytes(16).toString('hex');
  // 6-digit numeric PIN for easy manual entry if needed
  const pairingPin = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + 60 * 60 * 1000; // 60 minutes

  const session: ScannerSessionRecord = {
    sessionId,
    pairingToken,
    pairingPin,
    expiresAt,
    createdAt: now,
    status: 'WAITING',
    activeWorkflow,
    recentNonces: new Map(),
    scanTimestamps: [],
  };

  sessions.set(sessionId, session);
  return session;
}

/**
 * Retrieve session by ID (if not expired)
 */
export function getScannerSession(sessionId: string): ScannerSessionRecord | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    sseClients.delete(sessionId);
    return null;
  }
  return session;
}

/**
 * Update session's active ERP workflow (pos, medicines, other)
 */
export function updateSessionWorkflow(sessionId: string, workflow: 'pos' | 'medicines' | 'other'): boolean {
  const session = getScannerSession(sessionId);
  if (!session) return false;
  session.activeWorkflow = workflow;
  broadcastToSession(sessionId, 'WORKFLOW_CHANGED', { activeWorkflow: workflow });
  return true;
}

/**
 * Register SSE stream controller for a session
 */
export function registerSSEClient(sessionId: string, controller: ReadableStreamDefaultController) {
  let clientSet = sseClients.get(sessionId);
  if (!clientSet) {
    clientSet = new Set();
    sseClients.set(sessionId, clientSet);
  }
  clientSet.add(controller);

  // Send initial session state
  const session = getScannerSession(sessionId);
  if (session) {
    const data = JSON.stringify({
      sessionId: session.sessionId,
      connectedDevice: session.connectedDevice || null,
      activeWorkflow: session.activeWorkflow,
    });
    controller.enqueue(new TextEncoder().encode(`event: INIT\ndata: ${data}\n\n`));
  }
}

/**
 * Unregister SSE stream controller
 */
export function unregisterSSEClient(sessionId: string, controller: ReadableStreamDefaultController) {
  const clientSet = sseClients.get(sessionId);
  if (clientSet) {
    clientSet.delete(controller);
    if (clientSet.size === 0) {
      sseClients.delete(sessionId);
    }
  }
}

/**
 * Broadcast event to all SSE listeners of a specific session
 */
export function broadcastToSession(sessionId: string, event: string, data: any) {
  const clientSet = sseClients.get(sessionId);
  if (!clientSet || clientSet.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);

  for (const controller of clientSet) {
    try {
      controller.enqueue(encoded);
    } catch (err) {
      // If controller stream closed, remove it
      clientSet.delete(controller);
    }
  }
}

/**
 * Pair a phone to the session
 */
export function pairPhoneToSession(
  sessionId: string | undefined,
  tokenOrPin: string,
  deviceInfo: { name: string; userAgent?: string; ip?: string }
): { success: boolean; error?: string; session?: ScannerSessionRecord } {
  const cleanInput = (tokenOrPin || '').trim();
  if (!cleanInput) {
    return { success: false, error: 'Please enter a 6-digit PIN or scan the pairing QR code.' };
  }

  let session = sessionId ? getScannerSession(sessionId) : null;

  // If no session found by ID (e.g. user manually opened /mobile-scanner and typed PIN)
  if (!session) {
    const now = Date.now();
    for (const s of sessions.values()) {
      if (s.expiresAt > now && (s.pairingPin === cleanInput || s.pairingToken === cleanInput)) {
        session = s;
        break;
      }
    }
  }

  if (!session) {
    return { success: false, error: 'Session not found or has expired. Please check the 6-digit PIN on your MacBook or scan the QR code.' };
  }

  // Validate token or PIN
  const tokenMatch = cleanInput === session.pairingToken;
  const pinMatch = cleanInput === session.pairingPin;

  if (!tokenMatch && !pinMatch) {
    return { success: false, error: 'Invalid pairing PIN or token. Please check the 6-digit PIN shown on your MacBook.' };
  }

  // Register device
  session.status = 'CONNECTED';
  session.connectedDevice = {
    name: deviceInfo.name || 'Mobile Phone',
    userAgent: deviceInfo.userAgent,
    ip: deviceInfo.ip,
    connectedAt: Date.now(),
  };

  // Extend session expiry on activity (30 more minutes)
  session.expiresAt = Date.now() + 30 * 60 * 1000;

  // Broadcast to MacBook
  broadcastToSession(session.sessionId, 'DEVICE_CONNECTED', {
    deviceName: session.connectedDevice.name,
    connectedAt: session.connectedDevice.connectedAt,
    activeWorkflow: session.activeWorkflow,
  });

  return { success: true, session };
}

/**
 * Submit a scan from the phone
 */
export function submitPhoneScan(
  sessionId: string,
  token: string,
  scanData: { scanValue: string; scanType?: string; nonce?: string; timestamp?: number }
): { success: boolean; error?: string; processedScan?: any } {
  const session = getScannerSession(sessionId);
  if (!session) {
    return { success: false, error: 'Scanner session has expired. Please re-pair your phone.' };
  }

  if (session.status === 'DISCONNECTED') {
    return { success: false, error: 'Session has been disconnected. Please re-pair your phone.' };
  }

  if (session.pairingToken !== token.trim()) {
    return { success: false, error: 'Authentication failed. Device token does not match active session.' };
  }

  if (!scanData.scanValue || typeof scanData.scanValue !== 'string') {
    return { success: false, error: 'Scan value cannot be empty.' };
  }

  const cleanValue = scanData.scanValue.trim();
  if (cleanValue.length === 0 || cleanValue.length > 512) {
    return { success: false, error: 'Invalid QR / Barcode data length (max 512 chars).' };
  }

  const now = Date.now();

  // Rate Limiting: Max 10 scans per 3 seconds
  session.scanTimestamps = session.scanTimestamps.filter((t) => now - t < 3000);
  if (session.scanTimestamps.length >= 10) {
    return { success: false, error: 'Scanning too fast. Please wait a moment between scans.' };
  }
  session.scanTimestamps.push(now);

  // Nonce duplicate check
  if (scanData.nonce) {
    const lastNonceTime = session.recentNonces.get(scanData.nonce);
    if (lastNonceTime && now - lastNonceTime < 5000) {
      return { success: false, error: 'Duplicate scan packet suppressed.' };
    }
    session.recentNonces.set(scanData.nonce, now);

    // Clean old nonces
    for (const [n, time] of session.recentNonces.entries()) {
      if (now - time > 10000) session.recentNonces.delete(n);
    }
  }

  // Extend session expiry
  session.expiresAt = now + 30 * 60 * 1000;

  const payload = {
    value: cleanValue,
    scanType: scanData.scanType || 'QR_CODE',
    timestamp: scanData.timestamp || now,
    nonce: scanData.nonce || randomBytes(4).toString('hex'),
    senderDevice: session.connectedDevice?.name || 'Mobile Phone',
  };

  // Broadcast to MacBook SSE listener
  broadcastToSession(sessionId, 'SCAN_RECEIVED', payload);

  return { success: true, processedScan: payload };
}

/**
 * Disconnect phone from session
 */
export function disconnectSession(sessionId: string, reason = 'USER_DISCONNECTED'): boolean {
  const session = getScannerSession(sessionId);
  if (!session) return false;

  session.status = 'DISCONNECTED';
  session.connectedDevice = undefined;
  broadcastToSession(sessionId, 'DEVICE_DISCONNECTED', { reason });
  return true;
}

/**
 * Clear all sessions (for unit/integration testing)
 */
export function clearAllSessionsForTesting(): void {
  sessions.clear();
  sseClients.clear();
}
