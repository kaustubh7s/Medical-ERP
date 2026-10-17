'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import {
  CalendarCheck,
  IndianRupee,
  Banknote,
  QrCode,
  CreditCard,
  UserCheck,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  Trash2,
  Plus,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';

export const DayClosingView: React.FC = () => {
  const {
    invoices,
    expenses,
    payments,
    dayClosingRecords,
    damagedStock,
    currentUser,
    recordDayClosing,
    recordDamagedStock,
    medicines,
  } = usePharmacy();

  const todayStr = new Date().toISOString().substring(0, 10);
  const todayInvoices = invoices.filter((i) => i.invoiceDate.startsWith(todayStr));

  const totalSalesCash = todayInvoices.filter((i) => i.paymentMode === 'CASH').reduce((s, i) => s + i.amountPaid, 0);
  const totalSalesUPI = todayInvoices.filter((i) => i.paymentMode === 'UPI').reduce((s, i) => s + i.amountPaid, 0);
  const totalSalesCard = todayInvoices.filter((i) => i.paymentMode === 'CARD').reduce((s, i) => s + i.amountPaid, 0);
  const totalSalesCredit = todayInvoices.filter((i) => i.paymentMode === 'CREDIT').reduce((s, i) => s + i.balanceDue, 0);
  const totalGrossSales = todayInvoices.reduce((s, i) => s + i.grandTotal, 0);

  const todayCustomerDuesCollected = payments
    .filter((p) => p.date.startsWith(todayStr) && p.type === 'CUSTOMER_COLLECTION' && p.paymentMode === 'CASH')
    .reduce((s, p) => s + p.amount, 0);

  const todayExpensesCash = expenses
    .filter((e) => e.date === todayStr && e.paymentMode === 'CASH')
    .reduce((s, e) => s + e.amount, 0);

  const todaySupplierPayoutsCash = payments
    .filter((p) => p.date.startsWith(todayStr) && p.type === 'SUPPLIER_PAYMENT' && p.paymentMode === 'CASH')
    .reduce((s, p) => s + p.amount, 0);

  const expectedCashInDrawer = totalSalesCash + todayCustomerDuesCollected - todayExpensesCash - todaySupplierPayoutsCash;

  const [actualPhysicalCash, setActualPhysicalCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Damaged Stock Form Modal
  const [isDamagedModalOpen, setIsDamagedModalOpen] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState(medicines[0]?.id || '');
  const [dmgBatchNo, setDmgBatchNo] = useState(medicines[0]?.batches[0]?.batchNumber || '');
  const [dmgQty, setDmgQty] = useState(1);
  const [dmgReason, setDmgReason] = useState<'BROKEN_VIAL' | 'LEAKAGE' | 'CONTAMINATED' | 'STRIP_TORN'>('BROKEN_VIAL');

  const discrepancy = (parseFloat(actualPhysicalCash) || 0) - expectedCashInDrawer;

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const actual = parseFloat(actualPhysicalCash) || 0;
    recordDayClosing(actual, closingNotes);
    setIsSuccessModalOpen(true);
    setActualPhysicalCash('');
    setClosingNotes('');
  };

  const handleLogDamagedStock = (e: React.FormEvent) => {
    e.preventDefault();
    const med = medicines.find((m) => m.id === selectedMedId);
    if (!med) return;
    const batch = med.batches.find((b) => b.batchNumber === dmgBatchNo) || med.batches[0];
    const cost = batch ? batch.purchaseRate : 50;

    recordDamagedStock({
      medicineId: med.id,
      medicineName: med.name,
      batchNumber: dmgBatchNo,
      quantity: dmgQty,
      costRate: cost,
      totalLoss: cost * dmgQty,
      reason: dmgReason,
      disposedBy: currentUser.name,
    });
    setIsDamagedModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <CalendarCheck className="h-4 w-4 text-emerald-700" />
            Daily Shift Closing, Cash Reconciliation & Damaged Stock Register
          </h2>
          <p suppressHydrationWarning className="text-[11px] text-slate-500 font-mono">
            Date: {todayStr} | Cashier on Duty: {currentUser.name} ({currentUser.role})
          </p>
        </div>

        <button
          onClick={() => setIsDamagedModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Record Damaged / Broken Stock</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: Shift Cash Breakdown */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              1. Today's Collections by Payment Channel ({todayInvoices.length} Bills Dispensed)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cash Sales</span>
                <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100">
                  ₹{totalSalesCash.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">UPI / QR Digital</span>
                <span className="font-mono text-base font-black text-purple-700 dark:text-purple-400">
                  ₹{totalSalesUPI.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Card Terminal</span>
                <span className="font-mono text-base font-black text-blue-700 dark:text-blue-400">
                  ₹{totalSalesCard.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Khata Due</span>
                <span className="font-mono text-base font-black text-amber-700 dark:text-amber-400">
                  ₹{totalSalesCredit.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span>(+) Cash from Sales Billing:</span>
                <span className="font-bold">₹{totalSalesCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>(+) Customer Dues Recovered in Cash:</span>
                <span>₹{todayCustomerDuesCollected.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>(-) Counter Cash Expenses Paid:</span>
                <span>-₹{todayExpensesCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>(-) Supplier Cash Settlements:</span>
                <span>-₹{todaySupplierPayoutsCash.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-300 dark:border-slate-700 flex justify-between font-black text-sm">
                <span>(=) System Expected Cash in Drawer:</span>
                <span className="text-emerald-700">₹{expectedCashInDrawer.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Damaged Stock Register Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              2. Damaged / Broken / Leakage Stock Quarantine Log ({damagedStock.length})
            </h3>
            <div className="max-h-40 overflow-y-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Medicine Product</th>
                    <th>Batch</th>
                    <th className="text-center">Qty</th>
                    <th>Breakage Reason</th>
                    <th className="text-right">Loss Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {damagedStock.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-3 text-slate-400">No damaged stock reported.</td>
                    </tr>
                  ) : (
                    damagedStock.map((d) => (
                      <tr key={d.id}>
                        <td className="font-mono text-slate-500">{d.date}</td>
                        <td className="font-bold">{d.medicineName}</td>
                        <td className="font-mono">{d.batchNumber}</td>
                        <td className="text-center font-mono font-bold text-rose-600">{d.quantity}</td>
                        <td className="text-[10px]">{d.reason}</td>
                        <td className="text-right font-mono font-bold text-rose-700">₹{d.totalLoss.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Cash Drawer Closing Form */}
        <form onSubmit={handleCloseShift} className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-xs">
          <h3 className="font-bold text-xs uppercase text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
            <FileCheck2 className="h-4 w-4 text-emerald-700" />
            3. Final Day-End Reconciliation
          </h3>

          <div>
            <label className="text-[11px] font-bold block mb-1">Actual Physical Cash Count in Drawer (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={actualPhysicalCash}
              onChange={(e) => setActualPhysicalCash(e.target.value)}
              placeholder="e.g. 5240"
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 font-mono text-base font-black bg-slate-50 dark:bg-slate-800"
            />
          </div>

          {actualPhysicalCash && (
            <div className={`p-2.5 rounded border text-xs font-mono font-bold ${
              discrepancy === 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : discrepancy > 0
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}>
              <div className="flex justify-between">
                <span>Discrepancy (Actual - Expected):</span>
                <span>{discrepancy >= 0 ? `+₹${discrepancy.toFixed(2)}` : `-₹${Math.abs(discrepancy).toFixed(2)}`}</span>
              </div>
              <span className="text-[10px] font-normal block mt-0.5">
                {discrepancy === 0 ? '✓ Exact Match: Cash Drawer balanced.' : discrepancy > 0 ? '▲ Excess cash in drawer.' : '▼ Cash shortage detected.'}
              </span>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold block mb-1">Shift Handover Remarks / Notes</label>
            <textarea
              rows={3}
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="e.g. ₹500 float cash left for next shift cashier..."
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md"
          >
            Submit Day-End Cashier Closing
          </button>
        </form>
      </div>

      {/* MODAL: Record Damaged Stock */}
      <Modal
        isOpen={isDamagedModalOpen}
        onClose={() => setIsDamagedModalOpen(false)}
        title="Record Damaged / Broken Stock"
        subtitle="Deducts damaged inventory units and logs operational loss"
        maxWidth="md"
      >
        <form onSubmit={handleLogDamagedStock} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold block mb-1">Select Medicine *</label>
            <select
              value={selectedMedId}
              onChange={(e) => {
                setSelectedMedId(e.target.value);
                const med = medicines.find((m) => m.id === e.target.value);
                if (med && med.batches[0]) setDmgBatchNo(med.batches[0].batchNumber);
              }}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.genericName})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold block mb-1">Batch Number</label>
              <input
                type="text"
                required
                value={dmgBatchNo}
                onChange={(e) => setDmgBatchNo(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">Broken / Damaged Units *</label>
              <input
                type="number"
                min="1"
                required
                value={dmgQty}
                onChange={(e) => setDmgQty(parseInt(e.target.value) || 1)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1">Damage Reason</label>
            <select
              value={dmgReason}
              onChange={(e) => setDmgReason(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
            >
              <option value="BROKEN_VIAL">Broken Glass Ampoule / Bottle</option>
              <option value="LEAKAGE">Syrup Leakage / Seal Broken</option>
              <option value="STRIP_TORN">Blister Strip Torn / Crushed</option>
              <option value="CONTAMINATED">Contaminated / Storage Failure</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-sm"
          >
            Record Damaged Stock Entry
          </button>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Day-End Shift Closing Recorded"
        subtitle="Daily cash book summary saved successfully."
        maxWidth="sm"
      >
        <div className="text-center py-3 space-y-2">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Shift closed and audit trail updated.
          </p>
          <button
            onClick={() => setIsSuccessModalOpen(false)}
            className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-bold"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};
