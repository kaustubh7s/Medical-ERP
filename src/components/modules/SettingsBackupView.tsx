'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePharmacy } from '@/lib/store';
import { SUPABASE_SQL_SCHEMA } from '@/lib/supabaseClient';
import {
  Settings,
  Database,
  Download,
  Upload,
  RotateCcw,
  Cloud,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Building,
  SmartphoneNfc,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Radio,
  CloudLightning,
  Server,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';

export const SettingsBackupView: React.FC = () => {
  const {
    settings,
    updateSettings,
    exportDataBackup,
    importDataBackup,
    resetToDemoData,
  } = usePharmacy();

  const [storeName, setStoreName] = useState(settings.storeName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [drugLicenseNumber, setDrugLicenseNumber] = useState(settings.drugLicenseNumber);
  const [gstNumber, setGstNumber] = useState(settings.gstNumber);
  const [invoiceFooterMessage, setInvoiceFooterMessage] = useState(settings.invoiceFooterMessage);

  // POS Terminal Settings State
  const [posTerminalBaseUrl, setPosTerminalBaseUrl] = useState(settings.posTerminalBaseUrl || 'http://localhost:3001');
  const [posTerminalDeviceId, setPosTerminalDeviceId] = useState(settings.posTerminalDeviceId || 'PINELABS-POS-M884');
  const [posTerminalMerchantName, setPosTerminalMerchantName] = useState(settings.posTerminalMerchantName || 'CarePlus Pharmacy & Wellness');
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [terminalHealthData, setTerminalHealthData] = useState<any | null>(null);
  const [isPingingTerminal, setIsPingingTerminal] = useState(false);
  const [isPairingTerminal, setIsPairingTerminal] = useState(false);
  const [terminalPairingMsg, setTerminalPairingMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('CAREPLUS_TERMINAL_PAYMENT_ATTEMPTS_V1');
      if (stored) {
        setRecentAttempts(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Neon Cloud PostgreSQL State & Handlers
  const [neonHealth, setNeonHealth] = useState<any | null>(null);
  const [isPingingNeon, setIsPingingNeon] = useState(false);
  const [isSyncingToNeon, setIsSyncingToNeon] = useState(false);
  const [isPullingFromNeon, setIsPullingFromNeon] = useState(false);
  const [neonSyncToast, setNeonSyncToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePingNeon = useCallback(async () => {
    setIsPingingNeon(true);
    try {
      const res = await fetch('/api/neon/health', { cache: 'no-store' });
      const data = await res.json();
      setNeonHealth(data);
    } catch {
      setNeonHealth({ status: 'ERROR', message: 'Failed to connect to Neon' });
    } finally {
      setIsPingingNeon(false);
    }
  }, []);

  useEffect(() => {
    handlePingNeon();
  }, [handlePingNeon]);

  const handlePushToNeon = async () => {
    setIsSyncingToNeon(true);
    setNeonSyncToast(null);
    try {
      const jsonStr = exportDataBackup();
      const payload = JSON.parse(jsonStr);
      const res = await fetch('/api/neon/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload, cashierName: storeName || 'CarePlus Pharmacist' }),
      });
      const data = await res.json();
      if (data.success) {
        setNeonSyncToast({
          type: 'success',
          text: `Synced ${data.medicinesCount} medicines & ${data.invoicesCount} invoices to Neon Cloud Database!`,
        });
        handlePingNeon();
      } else {
        setNeonSyncToast({ type: 'error', text: data.error || 'Failed to sync to Neon' });
      }
    } catch (e: any) {
      setNeonSyncToast({ type: 'error', text: e.message || 'Sync failed' });
    } finally {
      setIsSyncingToNeon(false);
    }
  };

  const handlePullFromNeon = async () => {
    if (!confirm('Pull latest data from Neon Cloud? This will update local items and invoices to match the cloud database.')) {
      return;
    }
    setIsPullingFromNeon(true);
    setNeonSyncToast(null);
    try {
      const res = await fetch('/api/neon/sync', { cache: 'no-store' });
      const data = await res.json();
      if (data.hasData && data.data) {
        importDataBackup(JSON.stringify(data.data));
        setNeonSyncToast({
          type: 'success',
          text: `Pulled from Neon Cloud! (Last updated: ${new Date(data.updatedAt).toLocaleString()})`,
        });
        handlePingNeon();
      } else {
        setNeonSyncToast({ type: 'error', text: data.message || 'No data found in Neon Cloud yet.' });
      }
    } catch (e: any) {
      setNeonSyncToast({ type: 'error', text: e.message || 'Pull failed' });
    } finally {
      setIsPullingFromNeon(false);
    }
  };

  const [copiedSchema, setCopiedSchema] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const handleTestPing = async () => {
    setIsPingingTerminal(true);
    setTerminalPairingMsg(null);
    try {
      const cleanUrl = posTerminalBaseUrl.trim().replace(/\/+$/, '');
      // Sync config first so server immediately uses this URL
      await fetch('/api/terminal/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: cleanUrl,
          deviceId: posTerminalDeviceId.trim(),
          merchantName: posTerminalMerchantName.trim(),
        }),
      });

      const res = await fetch(`/api/terminal/health?baseUrl=${encodeURIComponent(cleanUrl)}`, { cache: 'no-store' });
      const data = await res.json();
      setTerminalHealthData(data);
      if (data.status === 'HEALTHY') {
        const isRemote = cleanUrl.includes('ngrok') || cleanUrl.startsWith('https://');
        setTerminalPairingMsg({
          type: 'success',
          text: `Connected to ${data.simulator} (${data.deviceId}) • Status: ${data.terminalStatus} • Paired: ${data.isPaired ? 'YES' : 'NO'}${isRemote ? ' (🌐 Remote Tunnel)' : ''}`,
        });
        updateSettings({
          posTerminalBaseUrl: cleanUrl,
          posTerminalLastPingAt: new Date().toISOString(),
          posTerminalIsPaired: data.isPaired,
        });
      } else {
        setTerminalPairingMsg({
          type: 'error',
          text: `Simulator reported ${data.status} / ${data.terminalStatus}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ping failed';
      setTerminalHealthData({ status: 'DISCONNECTED', terminalStatus: 'OFFLINE' });
      setTerminalPairingMsg({
        type: 'error',
        text: `Cannot reach terminal at ${posTerminalBaseUrl}: ${msg}`,
      });
    } finally {
      setIsPingingTerminal(false);
    }
  };

  const handleRequestPairingCode = async () => {
    setIsPairingTerminal(true);
    try {
      const cleanUrl = posTerminalBaseUrl.trim().replace(/\/+$/, '');
      const res = await fetch(`/api/terminal/pair?baseUrl=${encodeURIComponent(cleanUrl)}`);
      const data = await res.json();
      if (data.success && data.pairingCode) {
        setPairingCodeInput(data.pairingCode);
        setTerminalPairingMsg({
          type: 'info',
          text: `Pairing code '${data.pairingCode}' generated by terminal. Click 'Pair Device Now' to complete.`,
        });
      } else {
        setTerminalPairingMsg({
          type: 'error',
          text: data.error || 'Failed to obtain pairing code from terminal.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      setTerminalPairingMsg({ type: 'error', text: `Failed: ${msg}` });
    } finally {
      setIsPairingTerminal(false);
    }
  };

  const handlePairDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCodeInput.trim()) return;
    setIsPairingTerminal(true);
    setTerminalPairingMsg(null);

    try {
      const cleanUrl = posTerminalBaseUrl.trim().replace(/\/+$/, '');
      const res = await fetch('/api/terminal/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: cleanUrl,
          pairingCode: pairingCodeInput.trim(),
          clientName: 'CarePlus-Pharmacy-Counter-1',
        }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        updateSettings({
          posTerminalToken: data.token,
          posTerminalIsPaired: true,
          posTerminalDeviceId: data.deviceId || posTerminalDeviceId,
          posTerminalMerchantName: data.merchantName || posTerminalMerchantName,
        });
        setTerminalPairingMsg({
          type: 'success',
          text: `Successfully paired with ${data.deviceId}! Token secured server-side.`,
        });
        setPairingCodeInput('');
        handleTestPing();
      } else {
        setTerminalPairingMsg({
          type: 'error',
          text: data.error || 'Pairing rejected by terminal. Please verify code.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pairing failed';
      setTerminalPairingMsg({ type: 'error', text: `Pairing error: ${msg}` });
    } finally {
      setIsPairingTerminal(false);
    }
  };

  const handleDisconnectTerminal = () => {
    if (confirm('Disconnect POS terminal pairing? The ERP will need to re-pair before accepting card/UPI terminal payments.')) {
      updateSettings({
        posTerminalToken: '',
        posTerminalIsPaired: false,
      });
      setTerminalPairingMsg({
        type: 'info',
        text: 'POS Terminal disconnected. Enter a new pairing code to reconnect.',
      });
      handleTestPing();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = posTerminalBaseUrl.trim().replace(/\/+$/, '');
    updateSettings({
      storeName,
      tagline,
      address,
      phone,
      email,
      drugLicenseNumber,
      gstNumber,
      invoiceFooterMessage,
      posTerminalBaseUrl: cleanUrl,
      posTerminalDeviceId,
      posTerminalMerchantName,
    });

    try {
      await fetch('/api/terminal/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: cleanUrl,
          deviceId: posTerminalDeviceId.trim(),
          merchantName: posTerminalMerchantName.trim(),
        }),
      });
    } catch {}

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleDownloadJSON = () => {
    const jsonStr = exportDataBackup();
    const dataUri = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `BHALERAO_MEDICAL_BACKUP_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        if (event.target?.result) {
          const ok = importDataBackup(event.target.result as string);
          if (ok) {
            alert('Database backup restored successfully!');
          } else {
            alert('Invalid backup JSON file.');
          }
        }
      };
    }
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-600" />
            Store Profile, Backup & Cloud Supabase Integration
          </h2>
          <p className="text-xs text-slate-500">
            Configure pharmacy drug licenses, bill headers, download local JSON backups, and sync PostgreSQL schema.
          </p>
        </div>
      </div>

      {saveToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Settings and invoice branding updated successfully!
        </div>
      )}

      {/* Pharmacy Header Profile Form */}
      <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Building className="h-4 w-4 text-emerald-600" />
          Pharmacy Store Profile & Invoice Header Branding
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold block mb-1">Store / Medical Name *</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Drug License Number (DL No) *</label>
            <input
              type="text"
              required
              value={drugLicenseNumber}
              onChange={(e) => setDrugLicenseNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">GSTIN Tax Registration Number *</label>
            <input
              type="text"
              required
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Phone / Helpline Numbers</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Official Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold block mb-1">Full Shop Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold block mb-1">Invoice Footer Return Policy / Message</label>
            <input
              type="text"
              value={invoiceFooterMessage}
              onChange={(e) => setInvoiceFooterMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
          >
            Save Store Profile & Settings
          </button>
        </div>
      </form>

      {/* Dedicated Pine Labs POS Terminal Integration Card */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <SmartphoneNfc className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Pine Labs POS Terminal Integration
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  External Simulator
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Direct integration with independently running POS Terminal Simulator over REST API & SSE.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestPing}
              disabled={isPingingTerminal}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPingingTerminal ? 'animate-spin' : ''}`} />
              <span>Ping Terminal</span>
            </button>

            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                terminalHealthData?.status === 'HEALTHY'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  terminalHealthData?.status === 'HEALTHY' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>
                {terminalHealthData?.status === 'HEALTHY'
                  ? `Connected • ${terminalHealthData.terminalStatus || 'READY'}`
                  : 'Disconnected / Offline'}
              </span>
            </div>
          </div>
        </div>

        {terminalPairingMsg && (
          <div
            className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
              terminalPairingMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : terminalPairingMsg.type === 'info'
                ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {terminalPairingMsg.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : terminalPairingMsg.type === 'info' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-blue-600" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{terminalPairingMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold block">Simulator API Base URL</label>
              {(posTerminalBaseUrl.includes('ngrok') || posTerminalBaseUrl.startsWith('https://')) && (
                <span className="text-[10px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                  🌐 Remote
                </span>
              )}
            </div>
            <input
              type="text"
              value={posTerminalBaseUrl}
              onChange={(e) => setPosTerminalBaseUrl(e.target.value)}
              placeholder="http://localhost:3001 or https://xxxx.ngrok-free.dev"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Local: http://localhost:3001 | Remote: https://xxxx.ngrok-free.dev</span>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Terminal Device ID</label>
            <input
              type="text"
              value={posTerminalDeviceId}
              onChange={(e) => setPosTerminalDeviceId(e.target.value)}
              placeholder="PINELABS-POS-M884"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Configured Merchant Name</label>
            <input
              type="text"
              value={posTerminalMerchantName}
              onChange={(e) => setPosTerminalMerchantName(e.target.value)}
              placeholder="CarePlus Pharmacy & Wellness"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>
        </div>

        {/* Pairing Handshake Section */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-emerald-600" />
                Device Pairing & Token Security
              </h4>
              <p className="text-[11px] text-slate-500">
                Pair counter client with the standalone POS device using a 6-digit one-time code.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRequestPairingCode}
                disabled={isPairingTerminal}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100"
              >
                Fetch Pairing Code
              </button>

              {settings.posTerminalIsPaired && (
                <button
                  type="button"
                  onClick={handleDisconnectTerminal}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold"
                >
                  Disconnect / Unpair
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handlePairDevice} className="flex gap-2 max-w-md">
            <input
              type="text"
              maxLength={8}
              value={pairingCodeInput}
              onChange={(e) => setPairingCodeInput(e.target.value)}
              placeholder="Enter 6-digit code (e.g. 800261)"
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 font-mono text-sm font-bold bg-white dark:bg-slate-900 flex-1"
            />
            <button
              type="submit"
              disabled={isPairingTerminal || !pairingCodeInput.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isPairingTerminal && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Pair Device</span>
            </button>
          </form>
        </div>

        {/* Recent Terminal Payment Attempts Log */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
              Recent Terminal Payment Attempts & Audit Trail
            </h4>
            <span className="text-[10px] text-slate-400">Persisted locally in ERP</span>
          </div>

          {recentAttempts.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              No terminal transactions recorded yet. Initiate a payment in POS Billing to see live transactions.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[9.5px]">
                  <tr>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Invoice</th>
                    <th className="p-2.5">Txn ID / Req ID</th>
                    <th className="p-2.5">Amount</th>
                    <th className="p-2.5">Method</th>
                    <th className="p-2.5">Auth Code</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {recentAttempts.slice(0, 10).map((att) => (
                    <tr key={att.requestId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5 text-slate-500">{new Date(att.createdAt).toLocaleTimeString()}</td>
                      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{att.invoiceNumber}</td>
                      <td className="p-2.5 text-[10px] text-slate-600 dark:text-slate-400">
                        {att.transactionId || att.requestId}
                      </td>
                      <td className="p-2.5 font-black text-emerald-600">₹{att.amount.toFixed(2)}</td>
                      <td className="p-2.5 text-slate-600">
                        {att.cardLast4 ? `Card *${att.cardLast4}` : att.upiVpa || att.paymentMethod || 'DEMO'}
                      </td>
                      <td className="p-2.5 text-slate-500">{att.authCode || '—'}</td>
                      <td className="p-2.5 font-sans font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            att.state === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : att.state === 'PROCESSING'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                          }`}
                        >
                          {att.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Live Neon Cloud PostgreSQL Database Card */}
      <div className="p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 dark:border-emerald-900/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <CloudLightning className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                  Neon Cloud PostgreSQL Database
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Live Cloud
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Serverless PostgreSQL in Singapore (1 GB Free Tier) with instant sync across mobile &amp; laptop.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePingNeon}
              disabled={isPingingNeon}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPingingNeon ? 'animate-spin' : ''}`} />
              <span>Ping Neon</span>
            </button>

            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                neonHealth?.status === 'CONNECTED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  neonHealth?.status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>
                {neonHealth?.status === 'CONNECTED'
                  ? `Connected • ${neonHealth.latencyMs}ms (Singapore)`
                  : 'Connecting to Neon...'}
              </span>
            </div>
          </div>
        </div>

        {neonSyncToast && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              neonSyncToast.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300'
                : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-300'
            }`}
          >
            {neonSyncToast.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{neonSyncToast.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                <ArrowUpCircle className="h-4 w-4" />
                <span>Push Local Data to Neon Cloud</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Upload all current medicines, batches, customers, and dispensed invoices to your secure cloud database.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePushToNeon}
              disabled={isSyncingToNeon}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              {isSyncingToNeon ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Syncing to Neon Cloud...</span>
                </>
              ) : (
                <>
                  <CloudLightning className="h-4 w-4" />
                  <span>Push &amp; Sync to Neon Cloud</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-teal-100 dark:border-teal-900/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-xs">
                <ArrowDownCircle className="h-4 w-4" />
                <span>Pull &amp; Restore from Neon Cloud</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Download the latest cloud state onto this device. Perfect when opening on a new phone, tablet, or cashier laptop.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePullFromNeon}
              disabled={isPullingFromNeon}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-teal-700 dark:hover:bg-teal-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 transition-all"
            >
              {isPullingFromNeon ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Pulling from Neon Cloud...</span>
                </>
              ) : (
                <>
                  <Server className="h-4 w-4" />
                  <span>Pull Latest from Neon Cloud</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Backup & Disaster Recovery */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Database className="h-4 w-4 text-indigo-600" />
          Local Database Backup &amp; Disaster Recovery (JSON Archive)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Download Full System Snapshot</h4>
              <p className="text-[11px] text-slate-500 mt-1">Export medicines, batches, bills, customers, and ledger states.</p>
            </div>
            <button
              onClick={handleDownloadJSON}
              className="mt-3 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Download className="h-4 w-4" /> Download Backup JSON
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Restore from Backup File</h4>
              <p className="text-[11px] text-slate-500 mt-1">Upload previously exported JSON file to restore database.</p>
            </div>
            <label className="mt-3 w-full py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-100">
              <Upload className="h-4 w-4" /> Upload JSON File
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-xs text-rose-700 dark:text-rose-400">Reset to Factory Demo Data</h4>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-300 mt-1">Re-seed clean demo dataset with 40+ products.</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure? This will wipe all unsaved custom entries and reload initial demo dataset.')) {
                  resetToDemoData();
                }
              }}
              className="mt-3 w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" /> Reset Demo Dataset
            </button>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Sync Schema Exporter */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Cloud className="h-4 w-4 text-teal-600" />
            Supabase PostgreSQL Cloud Schema & RLS Generator
          </h3>

          <button
            onClick={handleCopySchema}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            {copiedSchema ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedSchema ? 'Copied SQL' : 'Copy SQL Schema'}
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Run this SQL script in your Supabase SQL editor to provision the production PostgreSQL tables, UUID keys, and Row Level Security (RLS) policies.
        </p>

        <div className="max-h-48 overflow-y-auto p-3 rounded-2xl bg-slate-950 text-slate-300 font-mono text-[10px] leading-relaxed border border-slate-800">
          <pre>{SUPABASE_SQL_SCHEMA}</pre>
        </div>
      </div>
    </div>
  );
};
