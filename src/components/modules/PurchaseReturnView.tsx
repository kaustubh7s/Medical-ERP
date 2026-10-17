'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { PurchaseReturn, PurchaseReturnItem } from '@/types/pharmacy';
import { Undo2, Plus, Building2, CheckCircle2, Trash2 } from 'lucide-react';

export const PurchaseReturnView: React.FC = () => {
  const { purchaseReturns, suppliers, medicines, processPurchaseReturn } = usePharmacy();

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [selectedMedId, setSelectedMedId] = useState(medicines[0]?.id || '');
  const [batchNumber, setBatchNumber] = useState(medicines[0]?.batches[0]?.batchNumber || '');
  const [returnQty, setReturnQty] = useState(10);
  const [returnRate, setReturnRate] = useState(25);
  const [returnReason, setReturnReason] = useState<PurchaseReturnItem['reason']>('EXPIRED_STOCK');
  const [returnItems, setReturnItems] = useState<PurchaseReturnItem[]>([]);
  const [notes, setNotes] = useState('');
  const [successNote, setSuccessNote] = useState<PurchaseReturn | null>(null);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId) || suppliers[0];

  const handleAddReturnItem = () => {
    const med = medicines.find((m) => m.id === selectedMedId);
    if (!med) return;

    const totalAmt = returnQty * returnRate * (1 + med.gstRate / 100);
    const item: PurchaseReturnItem = {
      medicineId: med.id,
      medicineName: med.name,
      batchNumber,
      expiryDate: '2026-08-15',
      returnQuantity: returnQty,
      purchaseRate: returnRate,
      gstRate: med.gstRate,
      totalAmount: Math.round(totalAmt * 100) / 100,
      reason: returnReason,
    };

    setReturnItems((prev) => [...prev, item]);
  };

  const handleRemoveItem = (idx: number) => {
    setReturnItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalDebit = returnItems.reduce((sum, i) => sum + i.totalAmount, 0);

  const handleSubmitDebitNote = () => {
    if (returnItems.length === 0) return;

    const result = processPurchaseReturn({
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      items: returnItems,
      totalDebitAmount: totalDebit,
      status: 'PENDING_APPROVAL',
      notes,
    });

    setSuccessNote(result);
    setReturnItems([]);
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-amber-600" />
            Purchase Return & Supplier Debit Notes
          </h2>
          <p className="text-xs text-slate-500">
            Return expired, damaged, or wrong medicine stock to distributors and offset supplier payables.
          </p>
        </div>
      </div>

      {successNote && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">Debit Note {successNote.debitNoteNumber} Issued!</p>
            <p className="text-xs">
              Amount of ₹{successNote.totalDebitAmount.toFixed(2)} deducted from {successNote.supplierName} ledger.
            </p>
          </div>
          <button onClick={() => setSuccessNote(null)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Return Creation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Create Supplier Return Claim
            </h3>

            <div>
              <label className="text-[11px] font-bold block mb-1">Select Supplier / Distributor</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Due: ₹{s.currentBalance})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1">Select Medicine</label>
              <select
                value={selectedMedId}
                onChange={(e) => {
                  setSelectedMedId(e.target.value);
                  const m = medicines.find((x) => x.id === e.target.value);
                  if (m?.batches[0]) {
                    setBatchNumber(m.batches[0].batchNumber);
                    setReturnRate(m.batches[0].purchaseRate);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.genericName})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold block mb-1">Batch Number</label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">Return Qty</label>
                <input
                  type="number"
                  value={returnQty}
                  onChange={(e) => setReturnQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold block mb-1">Cost Rate (₹)</label>
                <input
                  type="number"
                  value={returnRate}
                  onChange={(e) => setReturnRate(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-right"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">Reason</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value as PurchaseReturnItem['reason'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="EXPIRED_STOCK">Expired Stock Claim</option>
                  <option value="NEAR_EXPIRY_CLAIM">Near Expiry Return (90d)</option>
                  <option value="DAMAGED_SUPPLY">Damaged / Broken in Transit</option>
                  <option value="WRONG_DELIVERY">Wrong Medicine Supplied</option>
                  <option value="EXCESS_STOCK">Excess / Overstock Return</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAddReturnItem}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Item to Debit Note
            </button>
          </div>
        </div>

        {/* Selected Return Items & Submit */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Debit Note Draft for {selectedSupplier.name}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-slate-400 uppercase text-[10px]">
                    <th className="p-2">Medicine & Batch</th>
                    <th className="p-2 text-center">Return Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2">Reason</th>
                    <th className="p-2 text-right">Total (₹)</th>
                    <th className="p-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {returnItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No return items added.
                      </td>
                    </tr>
                  ) : (
                    returnItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-bold">{item.medicineName} ({item.batchNumber})</td>
                        <td className="p-2 text-center font-bold">{item.returnQuantity}</td>
                        <td className="p-2 text-right font-mono">₹{item.purchaseRate.toFixed(2)}</td>
                        <td className="p-2 text-[10px] text-slate-500">{item.reason}</td>
                        <td className="p-2 text-right font-mono font-bold text-amber-600">₹{item.totalAmount.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-rose-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Debit Claim:</span>
                <div className="text-xl font-black text-amber-600 font-mono">₹{totalDebit.toFixed(2)}</div>
              </div>

              <button
                onClick={handleSubmitDebitNote}
                disabled={returnItems.length === 0}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 disabled:opacity-40"
              >
                Issue Debit Note & Deduct Stock
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
