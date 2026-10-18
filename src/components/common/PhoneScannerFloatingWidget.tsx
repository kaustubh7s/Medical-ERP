'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import {
  Smartphone,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  X,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const PhoneScannerFloatingWidget: React.FC = () => {
  const {
    phoneScannerSession,
    phoneScannerStatus,
    lastScannedItem,
    activeTab,
    setIsPhoneScannerModalOpen,
    disconnectPhoneScanner,
    setActiveTab,
  } = usePharmacy();

  const [isMinimized, setIsMinimized] = useState(false);

  // If disconnected and no last scan, show minimal pill
  const isConnected = phoneScannerStatus === 'CONNECTED';
  const isWaiting = phoneScannerStatus === 'WAITING';

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full transition-all">
      {/* Minimized Pill */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className={`ml-auto flex items-center gap-2 px-3 py-2 rounded-full shadow-xl border text-xs font-bold backdrop-blur-md transition-all active:scale-95 ${
            isConnected
              ? 'bg-emerald-600/90 text-white border-emerald-400/50 shadow-emerald-600/30'
              : isWaiting
              ? 'bg-amber-500/90 text-white border-amber-300 shadow-amber-500/30 animate-pulse'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>
            {isConnected
              ? `Phone: ${phoneScannerSession?.connectedDevice?.name || 'Connected'}`
              : isWaiting
              ? 'Phone Scanner Waiting...'
              : 'Phone QR Scanner'}
          </span>
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      ) : (
        /* Expanded Floating Card */
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl backdrop-blur-lg overflow-hidden text-xs">
          {/* Card Header */}
          <div className="p-3 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-white text-[11px] ${
                  isConnected ? 'bg-emerald-600' : isWaiting ? 'bg-amber-500' : 'bg-slate-600'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                  Wireless Phone Scanner
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isConnected
                        ? 'bg-emerald-500 animate-pulse'
                        : isWaiting
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-slate-400'
                    }`}
                  />
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Minimize widget"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-3 space-y-2.5">
            {/* Status / Device row */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Device Status:</span>
              <span className="font-bold font-mono">
                {isConnected ? (
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Wifi className="h-3 w-3" />
                    {phoneScannerSession?.connectedDevice?.name || 'iPhone'}
                  </span>
                ) : isWaiting ? (
                  <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Waiting for Phone...
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    <WifiOff className="h-3 w-3" />
                    Disconnected
                  </span>
                )}
              </span>
            </div>

            {/* Target Screen indicator */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Routing Mode:</span>
              <span
                className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                  activeTab === 'pos'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : activeTab === 'medicines'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {activeTab === 'pos'
                  ? 'POS Billing (Adds to Cart)'
                  : activeTab === 'medicines'
                  ? 'Medicine Master (Maps Code)'
                  : `${activeTab} (Idle)`}
              </span>
            </div>

            {/* Last Scan Feed */}
            {lastScannedItem ? (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="font-bold uppercase">Last Scan</span>
                  <span className="font-mono">
                    {new Date(lastScannedItem.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="font-mono text-xs font-black text-slate-900 dark:text-slate-100 break-all">
                  {lastScannedItem.value}
                </p>

                {lastScannedItem.status === 'MATCHED' && (
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>✓ Matched: {lastScannedItem.medicineName}</span>
                  </p>
                )}

                {lastScannedItem.status === 'UNKNOWN' && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>⚠ Unmapped Code (Not in database)</span>
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab('medicines');
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline flex items-center gap-0.5"
                    >
                      <span>Map this QR in Medicine Master</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {lastScannedItem.status === 'IGNORED_WORKFLOW' && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>Ignored: Switch to POS (F2) or Medicine Master (F3)</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center py-1">
                No scans received yet in this shift session.
              </p>
            )}

            {/* Quick Action Footer */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setIsPhoneScannerModalOpen(true)}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>{isConnected ? 'Scanner Details' : 'Pair Phone'}</span>
              </button>

              {isConnected && (
                <button
                  onClick={disconnectPhoneScanner}
                  className="py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-rose-50 text-rose-600 text-[11px] font-bold"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
