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
  Crown,
  Pill,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  ShieldAlert,
  History,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';

export const DayClosingView: React.FC = () => {
  const {
    invoices,
    expenses,
    payments,
    salesReturns,
    cashDrawerTransactions,
    dayClosingRecords,
    damagedStock,
    currentUser,
    recordDayClosing,
    recordDamagedStock,
    medicines,
    getCashDrawerSummary,
    reconcileCashDrawerReturns,
    updateSalesReturnRefundStatus,
  } = usePharmacy();

  // Detect available demo dates or today
  const realToday = new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // If there are invoices on realToday use it, otherwise default to demo date 2026-08-30
    const hasToday = invoices.some((i) => i.invoiceDate.startsWith(realToday));
    return hasToday ? realToday : '2026-08-30';
  });

  const isAllDates = selectedDate === 'ALL';
  const summary = getCashDrawerSummary(selectedDate);

  const dayInvoices = isAllDates
    ? invoices
    : invoices.filter((i) => i.invoiceDate.startsWith(selectedDate));

  // Distinguish medicine revenue from membership service revenue (PAID strictly)
  const paidInvoices = dayInvoices.filter((i) => i.paymentStatus === 'PAID');

  const shiftMembershipRevenue = paidInvoices.reduce((sum, inv) => {
    const memberItemAmt = inv.items
      .filter((item) => item.itemCategory === 'MEMBERSHIP')
      .reduce((s, it) => s + it.totalAmount, 0);
    return sum + (memberItemAmt || (inv.saleCategory === 'MEMBERSHIP' ? inv.amountPaid : 0));
  }, 0);

  const shiftMedicineGrossSales = paidInvoices.reduce((sum, inv) => {
    const medItemAmt = inv.items
      .filter((item) => item.itemCategory !== 'MEMBERSHIP')
      .reduce((s, it) => s + it.totalAmount, 0);
    return sum + medItemAmt;
  }, 0);

  // Cash refunds paid list for the selected date
  const refundTxs = isAllDates
    ? cashDrawerTransactions.filter(
        (t) => t.type === 'SALES_RETURN_REFUND' && t.paymentMethod === 'CASH'
      )
    : cashDrawerTransactions.filter(
        (t) =>
          t.date.startsWith(selectedDate) &&
          t.type === 'SALES_RETURN_REFUND' &&
          t.paymentMethod === 'CASH'
      );

  // Unreconciled or historical returns on this date
  const dateReturns = isAllDates
    ? salesReturns
    : salesReturns.filter((sr) => sr.returnDate.startsWith(selectedDate));

  const [actualPhysicalCash, setActualPhysicalCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [reconcileFeedback, setReconcileFeedback] = useState<string | null>(null);

  // Damaged Stock Form Modal
  const [isDamagedModalOpen, setIsDamagedModalOpen] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState(medicines[0]?.id || '');
  const [dmgBatchNo, setDmgBatchNo] = useState(medicines[0]?.batches[0]?.batchNumber || '');
  const [dmgQty, setDmgQty] = useState(1);
  const [dmgReason, setDmgReason] = useState<'BROKEN_VIAL' | 'LEAKAGE' | 'CONTAMINATED' | 'STRIP_TORN'>('BROKEN_VIAL');

  const discrepancy = (parseFloat(actualPhysicalCash) || 0) - summary.expectedCashInDrawer;

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const actual = parseFloat(actualPhysicalCash) || 0;
    recordDayClosing(actual, closingNotes, isAllDates ? undefined : selectedDate);
    setIsSuccessModalOpen(true);
    setActualPhysicalCash('');
    setClosingNotes('');
  };

  const handleManualReconciliation = () => {
    const count = reconcileCashDrawerReturns();
    if (count > 0) {
      setReconcileFeedback(`Successfully reconciled ${count} historical cash return(s) into cash drawer.`);
    } else {
      setReconcileFeedback('All cash returns are already reconciled with drawer entries. No duplicate entries created.');
    }
    setTimeout(() => setReconcileFeedback(null), 4000);
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
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded bg-emerald-700 text-white flex items-center justify-center font-bold">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              Day Closing & Cash Drawer Management
            </h2>
            <p suppressHydrationWarning className="text-[11px] text-slate-500 font-mono">
              Cashier: {currentUser.name} ({currentUser.role}) | Shift Status:{' '}
              <span className="text-emerald-700 font-bold">ACTIVE COUNTER</span>
            </p>
          </div>
        </div>

        {/* Date Filter & Preset Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-300 dark:border-slate-700 text-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 px-1">Shift Date:</span>
            <input
              type="date"
              value={isAllDates ? '' : selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold"
            />
            <button
              onClick={() => setSelectedDate('2026-08-30')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${
                selectedDate === '2026-08-30'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
              title="Audit historical shift featuring SR-2026-0001 & SR-2026-0002"
            >
              2026-08-30 (Historical)
            </button>
            <button
              onClick={() => setSelectedDate(realToday)}
              className={`px-2 py-1 rounded text-[11px] font-bold ${
                selectedDate === realToday
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
          </div>

          <button
            onClick={handleManualReconciliation}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            title="Scan sales returns and verify corresponding cash drawer entries exist"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reconcile Returns</span>
          </button>

          <button
            onClick={() => setIsDamagedModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Record Damaged Stock</span>
          </button>
        </div>
      </div>

      {/* Reconciliation Feedback Alert */}
      {reconcileFeedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{reconcileFeedback}</span>
        </div>
      )}

      {/* Informational Shift Banner for Historical Dates */}
      {selectedDate === '2026-08-30' && (
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-blue-700 shrink-0" />
            <span>
              <strong>Historical Shift Audit: 2026-08-30</strong> — Contains original invoice{' '}
              <code className="font-mono font-bold bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">
                INV-2026-00019
              </code>{' '}
              with sales returns{' '}
              <code className="font-mono font-bold bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">
                SR-2026-0001
              </code>{' '}
              (₹385.28) and{' '}
              <code className="font-mono font-bold bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">
                SR-2026-0002
              </code>{' '}
              (₹1,926.40). Total cash refund deduction:{' '}
              <strong className="text-rose-700">₹2,311.68</strong>.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: Shift Cash Breakdown & Outflow Register */}
        <div className="lg:col-span-2 space-y-3">
          {/* 1. Cash Collections & Revenue Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-emerald-700" />
                1. Shift Collections & Payment Mode Breakdown ({dayInvoices.length} Bills Dispensed)
              </h3>
              <span className="text-[11px] font-mono text-slate-500 font-bold">
                Date: {selectedDate}
              </span>
            </div>

            {/* Revenue Stream Distinction (Medicine vs Membership Services) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <Pill className="h-3 w-3" /> Medicine Sales (Gross Paid)
                </span>
                <span className="font-mono text-sm font-black text-emerald-800 dark:text-emerald-200">
                  ₹{shiftMedicineGrossSales.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800">
                <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <Crown className="h-3 w-3" /> Membership Fees (Paid)
                </span>
                <span className="font-mono text-sm font-black text-amber-800 dark:text-amber-200">
                  ₹{shiftMembershipRevenue.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  Total Shift Gross Billed
                </span>
                <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">
                  ₹{summary.totalGrossSales.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cash Sales</span>
                <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
                  ₹{summary.totalSalesCash.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">UPI / QR Digital</span>
                <span className="font-mono text-base font-black text-purple-700 dark:text-purple-400">
                  ₹{summary.totalSalesUPI.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Pine Labs POS</span>
                <span className="font-mono text-base font-black text-blue-700 dark:text-blue-400">
                  ₹{summary.totalSalesTerminal.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Card Terminal</span>
                <span className="font-mono text-base font-black text-indigo-700 dark:text-indigo-400">
                  ₹{summary.totalSalesCard.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Khata Due</span>
                <span className="font-mono text-base font-black text-amber-700 dark:text-amber-400">
                  ₹{summary.totalSalesCredit.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Canonical Physical Cash Movement Equation */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-300 dark:border-slate-700 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-700">
                <span className="font-bold flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5 text-slate-500" /> Opening Cash in Drawer:
                </span>
                <span className="font-bold">₹{summary.openingCash.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5" /> (+) Cash Sales Received:
                </span>
                <span className="font-bold">+₹{summary.totalSalesCash.toFixed(2)}</span>
              </div>

              {/* CASH REFUNDS SECTION */}
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/30 p-1.5 rounded border border-rose-200 dark:border-rose-900">
                <span className="flex items-center gap-1">
                  <ArrowDownRight className="h-4 w-4" /> (-) Cash Refunds Paid (Medicine Returns):
                </span>
                <span>
                  {summary.todaySalesReturnCashRefunds > 0
                    ? `-₹${summary.todaySalesReturnCashRefunds.toFixed(2)}`
                    : '₹0.00'}
                </span>
              </div>

              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5" /> (+) Other Cash Inflows (Customer Dues Recovered):
                </span>
                <span className="font-bold">
                  +₹{(summary.todayCustomerDuesCollected + summary.otherCashInflows).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                <span className="flex items-center gap-1">
                  <ArrowDownRight className="h-3.5 w-3.5" /> (-) Other Cash Outflows (Expenses & Supplier Settlements):
                </span>
                <span className="font-bold">
                  -₹{(summary.todayExpensesCash + summary.todaySupplierPayoutsCash + summary.otherCashOutflows).toFixed(2)}
                </span>
              </div>

              <div className="pt-2 border-t-2 border-slate-400 dark:border-slate-600 flex items-center justify-between font-black text-sm">
                <span className="text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4 text-emerald-700" /> (=) Expected Cash in Drawer:
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 text-base font-black">
                  ₹{summary.expectedCashInDrawer.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Auditable Cash Refunds & Sales Returns Outflow Register */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ArrowDownRight className="h-4 w-4 text-rose-600" />
                2. Cash Refunds Paid Out Register (Cash Drawer Deductions)
              </h3>
              <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                Total Refund Outflow: ₹{summary.todaySalesReturnCashRefunds.toFixed(2)}
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Only returns settled in <strong>CASH</strong> generate physical cash drawer deductions. Non-cash settlements (UPI, Card, Credit Note) do not affect physical cash on hand.
            </p>

            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Return ID</th>
                    <th>Original Invoice</th>
                    <th>Customer Name</th>
                    <th>Date & Time</th>
                    <th>Cashier</th>
                    <th>Reason</th>
                    <th className="text-center">Mode</th>
                    <th className="text-right">Refund Amount (₹)</th>
                    <th className="text-center">Drawer Status</th>
                    <th className="text-center">Audit Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dateReturns.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-4 text-slate-400">
                        No sales returns recorded for this shift date.
                      </td>
                    </tr>
                  ) : (
                    dateReturns.map((sr) => {
                      const isCash = sr.refundMode === 'CASH';
                      const isPaid = sr.isCashRefundPaid !== false;
                      const hasDrawerTx = cashDrawerTransactions.some(
                        (t) =>
                          t.returnId === sr.returnNumber ||
                          t.referenceNumber === sr.returnNumber ||
                          t.referenceId === sr.id
                      );

                      return (
                        <tr
                          key={sr.id}
                          className={
                            isCash && isPaid
                              ? 'bg-rose-50/40 dark:bg-rose-950/20'
                              : ''
                          }
                        >
                          <td className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {sr.returnNumber}
                          </td>
                          <td className="font-mono font-bold text-blue-700 dark:text-blue-400">
                            {sr.originalInvoiceNumber}
                          </td>
                          <td className="font-medium">{sr.customerName || 'Walk-in'}</td>
                          <td className="font-mono text-slate-500 text-[10px]">{sr.returnDate}</td>
                          <td className="text-[11px]">{sr.processedBy || 'Cashier'}</td>
                          <td className="text-[10px] text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {sr.notes || 'Medicine sales return'}
                          </td>
                          <td className="text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isCash
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              }`}
                            >
                              {sr.refundMode}
                            </span>
                          </td>
                          <td className="text-right font-mono font-bold text-rose-600">
                            {isCash && isPaid ? `-₹${sr.totalRefundAmount.toFixed(2)}` : `₹${sr.totalRefundAmount.toFixed(2)}`}
                          </td>
                          <td className="text-center">
                            {isCash ? (
                              isPaid ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/60 dark:text-rose-300 px-1.5 py-0.5 rounded">
                                  ✓ Cash Deducted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                  ⚠ Flagged Unpaid
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                No Drawer Effect
                              </span>
                            )}
                          </td>
                          <td className="text-center">
                            {isCash && (
                              <button
                                onClick={() => updateSalesReturnRefundStatus(sr.id, !isPaid)}
                                className={`text-[10px] px-2 py-0.5 rounded font-bold border transition-colors ${
                                  isPaid
                                    ? 'border-amber-300 text-amber-800 hover:bg-amber-100'
                                    : 'border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                                }`}
                                title={
                                  isPaid
                                    ? 'Mark refund as not actually paid in cash (removes cash deduction)'
                                    : 'Verify that cash was paid out (records drawer OUT transaction)'
                                }
                              >
                                {isPaid ? 'Flag as Unpaid' : 'Verify Paid'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Damaged Stock Quarantine Log */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              3. Damaged / Broken / Leakage Stock Quarantine Log ({damagedStock.length})
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
                      <td colSpan={6} className="text-center py-3 text-slate-400">
                        No damaged stock reported.
                      </td>
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

        {/* Right: Cash Drawer Closing Form & Reconciliation */}
        <div className="space-y-3">
          <form
            onSubmit={handleCloseShift}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-xs"
          >
            <h3 className="font-bold text-xs uppercase text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
              <FileCheck2 className="h-4 w-4 text-emerald-700" />
              4. Final Day-End Reconciliation
            </h3>

            {/* Shift Audit Summary Badges */}
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Opening Cash:</span>
                <span className="font-bold">₹{summary.openingCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cash Sales:</span>
                <span className="font-bold text-emerald-700">+₹{summary.totalSalesCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cash Refunds Paid:</span>
                <span className="font-bold text-rose-600">
                  {summary.todaySalesReturnCashRefunds > 0
                    ? `-₹${summary.todaySalesReturnCashRefunds.toFixed(2)}`
                    : '₹0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Other Inflows / Outflows:</span>
                <span className="font-bold">
                  {summary.todayCustomerDuesCollected - summary.todayExpensesCash >= 0 ? '+' : ''}
                  ₹{(summary.todayCustomerDuesCollected - summary.todayExpensesCash).toFixed(2)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-300 dark:border-slate-700 flex justify-between font-black text-sm">
                <span>Expected in Drawer:</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  ₹{summary.expectedCashInDrawer.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1">
                Actual Counted Physical Cash in Drawer (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={actualPhysicalCash}
                onChange={(e) => setActualPhysicalCash(e.target.value)}
                placeholder={`Expected: ₹${summary.expectedCashInDrawer.toFixed(2)}`}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 font-mono text-base font-black bg-slate-50 dark:bg-slate-800"
              />
            </div>

            {actualPhysicalCash && (
              <div
                className={`p-2.5 rounded border text-xs font-mono font-bold ${
                  Math.abs(discrepancy) < 0.01
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : discrepancy > 0
                    ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200'
                    : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200'
                }`}
              >
                <div className="flex justify-between">
                  <span>Cash Difference (Actual - Expected):</span>
                  <span>
                    {discrepancy >= 0
                      ? `+₹${discrepancy.toFixed(2)}`
                      : `-₹${Math.abs(discrepancy).toFixed(2)}`}
                  </span>
                </div>
                <span className="text-[10px] font-normal block mt-0.5">
                  {Math.abs(discrepancy) < 0.01
                    ? '✓ Exact Match: Cash Drawer balanced.'
                    : discrepancy > 0
                    ? '▲ Excess cash counted in drawer.'
                    : '▼ Cash shortage detected in drawer.'}
                </span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold block mb-1">Shift Handover Remarks / Notes</label>
              <textarea
                rows={3}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="e.g. ₹5,000 float left in drawer for morning shift..."
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition-colors"
            >
              Submit Day-End Cashier Closing
            </button>
          </form>

          {/* Past Day Closing History */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-3 space-y-2">
            <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-slate-500" />
              Recent Closing Audit History ({dayClosingRecords.length})
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono">
              {dayClosingRecords.length === 0 ? (
                <p className="text-slate-400 text-center py-2 text-[11px]">No previous shift closures.</p>
              ) : (
                dayClosingRecords.map((r) => (
                  <div
                    key={r.id}
                    className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-0.5"
                  >
                    <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100">
                      <span>{r.date}</span>
                      <span>₹{r.actualCashInDrawer.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Closed by: {r.closedBy}</span>
                      <span
                        className={
                          r.discrepancyAmount === 0
                            ? 'text-emerald-600 font-bold'
                            : r.discrepancyAmount > 0
                            ? 'text-blue-600 font-bold'
                            : 'text-rose-600 font-bold'
                        }
                      >
                        Diff: {r.discrepancyAmount >= 0 ? `+₹${r.discrepancyAmount.toFixed(2)}` : `-₹${Math.abs(r.discrepancyAmount).toFixed(2)}`}
                      </span>
                    </div>
                    {r.totalCashRefunds !== undefined && r.totalCashRefunds > 0 && (
                      <div className="text-[10px] text-rose-600 font-bold">
                        Cash Refunds: -₹{r.totalCashRefunds.toFixed(2)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
                <option key={m.id} value={m.id}>
                  {m.name} ({m.genericName})
                </option>
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
