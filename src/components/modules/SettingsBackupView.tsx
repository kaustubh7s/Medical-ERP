'use client';

import React, { useState } from 'react';
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

  const [copiedSchema, setCopiedSchema] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName,
      tagline,
      address,
      phone,
      email,
      drugLicenseNumber,
      gstNumber,
      invoiceFooterMessage,
    });
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

      {/* Backup & Disaster Recovery */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Database className="h-4 w-4 text-indigo-600" />
          Local Database Backup & Disaster Recovery (JSON Archive)
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
