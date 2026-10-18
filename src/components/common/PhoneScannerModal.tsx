'use client';

import React, { useState, useEffect } from 'react';
import { usePharmacy } from '@/lib/store';
import { Modal } from '@/components/common/Modal';
import { QRCodeSVG } from 'qrcode.react';
import {
  Smartphone,
  Wifi,
  WifiOff,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Info,
  ChevronDown,
  Layers,
  Camera,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface PhoneScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhoneScannerModal: React.FC<PhoneScannerModalProps> = ({ isOpen, onClose }) => {
  const {
    phoneScannerSession,
    phoneScannerStatus,
    startPhoneScannerSession,
    disconnectPhoneScanner,
    lastScannedItem,
    activeTab,
  } = usePharmacy();

  const [networkIps, setNetworkIps] = useState<{ iface: string; ip: string }[]>([
    { iface: 'en0', ip: '192.168.1.10' },
  ]);
  const [selectedIp, setSelectedIp] = useState<string>('192.168.1.10');
  const [customHost, setCustomHost] = useState<string>('');
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showHttpsGuide, setShowHttpsGuide] = useState(false);

  // Fetch local network IPs when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/scanner/network-info')
        .then((res) => res.json())
        .then((data) => {
          if (data.localIps && data.localIps.length > 0) {
            setNetworkIps(data.localIps);
            setSelectedIp(data.defaultIp);
          } else {
            setSelectedIp('192.168.1.10');
          }
        })
        .catch(() => {
          setSelectedIp('192.168.1.10');
        });

      // If no active session, start one
      if (!phoneScannerSession) {
        setIsLoadingSession(true);
        startPhoneScannerSession().finally(() => setIsLoadingSession(false));
      }
    }
  }, [isOpen]);

  // Construct Phone Scanner URL (Must always use reachable Wi-Fi IP, never localhost)
  const lanFallbackIp = selectedIp || networkIps[0]?.ip || '192.168.1.10';
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const activeHost = customHost.trim() || (!isLocalhost && typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : lanFallbackIp);
  const port = typeof window !== 'undefined' && window.location.port ? window.location.port : '3000';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';

  const phoneUrl = phoneScannerSession
    ? `${protocol}//${activeHost}:${port}/mobile-scanner?session=${encodeURIComponent(
        phoneScannerSession.sessionId
      )}&token=${encodeURIComponent(phoneScannerSession.pairingToken)}&pin=${encodeURIComponent(
        phoneScannerSession.pairingPin
      )}`
    : '';

  const handleCopy = () => {
    if (!phoneUrl) return;
    navigator.clipboard.writeText(phoneUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleRegenerateSession = async () => {
    setIsLoadingSession(true);
    await startPhoneScannerSession();
    setIsLoadingSession(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Wireless Phone QR / Barcode Scanner"
      subtitle="Turn your smartphone camera into a high-speed wireless medicine scanner for POS & Medicine Master"
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Connection Status Banner */}
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
            phoneScannerStatus === 'CONNECTED'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : phoneScannerStatus === 'WAITING'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                phoneScannerStatus === 'CONNECTED'
                  ? 'bg-emerald-600'
                  : phoneScannerStatus === 'WAITING'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-slate-500'
              }`}
            >
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-tight text-xs">
                  {phoneScannerStatus === 'CONNECTED'
                    ? `Paired with ${phoneScannerSession?.connectedDevice?.name || 'Mobile Phone'}`
                    : phoneScannerStatus === 'WAITING'
                    ? 'Waiting for Phone to Connect...'
                    : 'Scanner Disconnected'}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    phoneScannerStatus === 'CONNECTED'
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                      : phoneScannerStatus === 'WAITING'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-slate-400'
                  }`}
                />
              </div>
              <p className="text-[11px] opacity-80 font-mono">
                Active Target Screen: <strong className="uppercase">{activeTab}</strong>
                {phoneScannerSession?.connectedDevice?.connectedAt && (
                  <span>
                    {' '}
                    | Connected at{' '}
                    {new Date(phoneScannerSession.connectedDevice.connectedAt).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {phoneScannerStatus === 'CONNECTED' && (
              <button
                onClick={disconnectPhoneScanner}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs transition-colors"
              >
                Disconnect Phone
              </button>
            )}
            <button
              onClick={handleRegenerateSession}
              disabled={isLoadingSession}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors disabled:opacity-50"
              title="Generate new pairing QR code & session"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingSession ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Pairing Grid: QR Code on Left, Instructions on Right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Left: Pairing QR Code Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              1. Scan to Pair Phone
            </span>

            {isLoadingSession || !phoneScannerSession ? (
              <div className="h-48 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
              </div>
            ) : (
              <div className="inline-block p-3 bg-white rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-md">
                <QRCodeSVG
                  value={phoneUrl}
                  size={190}
                  level="M"
                  includeMargin={false}
                />
              </div>
            )}

            {/* 6-Digit PIN Badge */}
            {phoneScannerSession?.pairingPin && (
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Manual 6-Digit Pairing PIN:
                </span>
                <span className="font-mono text-base font-black tracking-widest text-emerald-600 dark:text-emerald-400">
                  {phoneScannerSession.pairingPin}
                </span>
              </div>
            )}
          </div>

          {/* Right: Step-by-Step Instructions & Network Controls */}
          <div className="space-y-3.5">
            {/* Mobile Wi-Fi Notice Banner */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-bold block">Important: Do not type "localhost" on your phone!</span>
                <span className="text-[11px] opacity-90 block mt-0.5">
                  &ldquo;localhost&rdquo; on a mobile phone points to the phone itself, not your MacBook.
                </span>
                <div className="mt-1.5 space-y-1 text-[11px]">
                  <p>
                    <strong>Option 1 (Instant):</strong> Point your iPhone/Android camera directly at the QR code on the left.
                  </p>
                  <p>
                    <strong>Option 2 (Manual Link):</strong> Open{' '}
                    <code className="bg-amber-500/20 dark:bg-amber-400/20 px-1 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white select-all">
                      http://{activeHost}:{port}/mobile-scanner
                    </code>{' '}
                    on your phone and enter 6-digit PIN{' '}
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black text-xs">
                      {phoneScannerSession?.pairingPin}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Step-by-Step Pairing Guide
              </span>

              <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Ensure your phone and this MacBook are connected to the <strong>same Wi-Fi network</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Open your phone's Camera app and point it at the QR code on the left to open{' '}
                    <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">
                      /mobile-scanner
                    </code>
                    .
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <span>
                    Tap <strong>"Start Live Camera Scanner"</strong> on your phone. Any scanned medicine QR code or packaging barcode will instantly add to your POS bill or Medicine Master!
                  </span>
                </li>
              </ol>
            </div>

            {/* Reachable Host Selector */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                  MacBook Reachable Wi-Fi Host IP:
                </label>
              </div>

              {networkIps.length > 0 ? (
                <select
                  value={selectedIp}
                  onChange={(e) => setSelectedIp(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono text-xs font-bold"
                >
                  {networkIps.map((n) => (
                    <option key={n.ip} value={n.ip}>
                      {n.ip} ({n.iface === 'en0' ? 'Wi-Fi' : n.iface})
                    </option>
                  ))}
                  <option value="localhost">localhost (Same Device Only)</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedIp}
                  onChange={(e) => setSelectedIp(e.target.value)}
                  placeholder="e.g. 192.168.1.7"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono text-xs font-bold"
                />
              )}

              {/* Direct Link Controls */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 dark:bg-black hover:bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Mobile URL'}</span>
                </button>
                <a
                  href={phoneUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1"
                  title="Open in new browser tab for immediate testing"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Test in Tab</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Last Scan Live Feed on MacBook */}
        {lastScannedItem && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase text-slate-500">Last Received Scan from Phone:</span>
              <span className="font-mono text-slate-400">
                {new Date(lastScannedItem.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {lastScannedItem.value}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  lastScannedItem.status === 'MATCHED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : lastScannedItem.status === 'UNKNOWN'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {lastScannedItem.status === 'MATCHED'
                  ? `✓ Matched: ${lastScannedItem.medicineName}`
                  : lastScannedItem.status === 'UNKNOWN'
                  ? '⚠ Unknown Code'
                  : 'Ignored (Different Screen)'}
              </span>
            </div>
          </div>
        )}

        {/* HTTPS & Mobile Camera Security Requirements Explanation */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <button
            onClick={() => setShowHttpsGuide((prev) => !prev)}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
              Camera Security & HTTPS Setup Guide for Mobile Browsers
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showHttpsGuide ? 'rotate-180' : ''}`}
            />
          </button>

          {showHttpsGuide && (
            <div className="p-3.5 bg-white dark:bg-slate-900 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
              <p>
                <strong>Modern Mobile Browser Security:</strong> iOS Safari and Android Chrome require a{' '}
                <strong>Secure Context (HTTPS or localhost)</strong> to stream live camera video through{' '}
                <code>navigator.mediaDevices.getUserMedia</code>.
              </p>
              <div className="space-y-1.5 pt-1">
                <p>
                  <strong>1. Universal Zero-Config Fallback:</strong> Our mobile scanner includes an instant{' '}
                  <strong>"Snap QR Photo"</strong> button that uses standard HTML camera capture. It works 100% on any mobile phone over plain HTTP without HTTPS or flags!
                </p>
                <p>
                  <strong>2. Live Streaming via Next.js HTTPS:</strong> Run{' '}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">
                    npm run dev -- --experimental-https
                  </code>{' '}
                  to generate a local trusted certificate.
                </p>
                <p>
                  <strong>3. Android Chrome Insecure Origin Flag:</strong> On Android Chrome, open{' '}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">
                    chrome://flags/#unsafely-treat-insecure-origin-as-secure
                  </code>
                  , add{' '}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">
                    http://{selectedIp}:{port}
                  </code>
                  , and click Relaunch.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
