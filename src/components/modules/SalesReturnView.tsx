'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { SalesInvoice, SalesReturn, SalesReturnItem } from '@/types/pharmacy';
import { RotateCcw, Search, CheckCircle2, AlertTriangle, FileText, ArrowRight, User } from 'lucide-react';

export const SalesReturnView: React.FC = () => {
  const { invoices, salesReturns, processSalesReturn } = usePharmacy();

  const [searchInv, setSearchInv] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [returnItems, setReturnItems] = useState<{ [itemId: string]: { qty: number; reason: SalesReturnItem['reason'] } }>({});
  const [refundMode, setRefundMode] = useState<'CASH' | 'CREDIT_NOTE' | 'BANK_TRANSFER'>('CASH');
  const [returnNotes, setReturnNotes] = useState('');
  const [successReturn, setSuccessReturn] = useState<SalesReturn | null>(null);

  const handleSelectInvoice = (inv: SalesInvoice) => {
    setSelectedInvoice(inv);
    setSuccessReturn(null);
    const initialMap: typeof returnItems = {};
    inv.items.forEach((item) => {
      initialMap[item.id] = { qty: 0, reason: 'PATIENT_RECOVERED' };
    });
    setReturnItems(initialMap);
  };

  const handleQtyChange = (itemId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(0, Math.min(qty, maxQty));
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], qty: validQty },
    }));
  };

  const handleReasonChange = (itemId: string, reason: SalesReturnItem['reason']) => {
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], reason },
    }));
  };

  // Calculate refund amount
  const itemsToReturn: SalesReturnItem[] = [];
  let calculatedRefund = 0;

  if (selectedInvoice) {
    selectedInvoice.items.forEach((item) => {
      const config = returnItems[item.id];
      if (config && config.qty > 0) {
        const itemRefund = (item.rate * config.qty) * (1 - item.discountPercent / 100) * (1 + item.gstRate / 100);
        calculatedRefund += itemRefund;
        itemsToReturn.push({
          invoiceItemId: item.id,
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          batchNumber: item.batchNumber,
          returnQuantity: config.qty,
          refundRate: item.rate,
          gstRate: item.gstRate,
          refundAmount: Math.round(itemRefund * 100) / 100,
          reason: config.reason,
        });
      }
    });
  }

  const handleSubmitReturn = () => {
    if (!selectedInvoice || itemsToReturn.length === 0) {
      alert('Please select at least 1 item and quantity to return.');
      return;
    }

    const returnResult = processSalesReturn({
      originalInvoiceId: selectedInvoice.id,
      originalInvoiceNumber: selectedInvoice.invoiceNumber,
      customerId: selectedInvoice.customerId,
      customerName: selectedInvoice.customerName,
      items: itemsToReturn,
      totalRefundAmount: Math.round(calculatedRefund * 100) / 100,
      refundMode,
      creditNoteNumber: refundMode === 'CREDIT_NOTE' ? `CN-${Date.now().toString().slice(-6)}` : undefined,
      notes: returnNotes,
      processedBy: 'Pharmacist',
    });

    setSuccessReturn(returnResult);
    setSelectedInvoice(null);
    setSearchInv('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-rose-500" />
            Sales Return & Credit Note Management
          </h2>
          <p className="text-xs text-slate-500">
            Process item returns against sales bills, issue credit notes, and auto-adjust medicine inventory.
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {successReturn && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in zoom-in-95">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                Sales Return {successReturn.returnNumber} Processed Successfully!
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Refund Amount: ₹{successReturn.totalRefundAmount.toFixed(2)} via {successReturn.refundMode}. Stock has been restored.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccessReturn(null)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Lookup Original Invoice */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Step 1: Search Invoice to Return
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchInv}
                onChange={(e) => setSearchInv(e.target.value)}
                placeholder="Type invoice # (e.g. INV-2026) or customer..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pt-1">
              {invoices
                .filter(
                  (i) =>
                    i.invoiceNumber.toLowerCase().includes(searchInv.toLowerCase()) ||
                    i.customerName.toLowerCase().includes(searchInv.toLowerCase())
                )
                .map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => handleSelectInvoice(inv)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedInvoice?.id === inv.id
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                        {inv.invoiceNumber}
                      </span>
                      <span className="font-mono font-bold text-xs text-emerald-600">
                        ₹{inv.grandTotal.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {inv.customerName} • {inv.items.length} items • {inv.invoiceDate.split(' ')[0]}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Return Items Configuration */}
        <div className="lg:col-span-8 space-y-4">
          {selectedInvoice ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                    Invoice Items: {selectedInvoice.invoiceNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: {selectedInvoice.customerName} | Original Billed: ₹{selectedInvoice.grandTotal.toFixed(2)}
                  </p>
                </div>
                <span className="text-xs font-bold text-rose-600 bg-rose-500/10 px-2.5 py-1 rounded-full">
                  Step 2: Select Items
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {selectedInvoice.items.map((item) => {
                  const config = returnItems[item.id] || { qty: 0, reason: 'PATIENT_RECOVERED' };

                  // Calculate already returned quantities on this invoice to prevent returning more than billed
                  const alreadyReturnedQty = salesReturns
                    .filter((sr) => sr.originalInvoiceId === selectedInvoice.id || sr.originalInvoiceNumber === selectedInvoice.invoiceNumber)
                    .flatMap((sr) => sr.items)
                    .filter((ri) => ri.invoiceItemId === item.id || (ri.medicineId === item.medicineId && ri.batchNumber === item.batchNumber))
                    .reduce((sum, ri) => sum + ri.returnQuantity, 0);

                  const maxReturnable = Math.max(0, item.quantity - alreadyReturnedQty);
                  const isFullyReturned = maxReturnable === 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isFullyReturned
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/20 opacity-60'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{item.medicineName}</p>
                          {isFullyReturned && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Fully Returned
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Batch: {item.batchNumber} • Billed Qty: {item.quantity} {alreadyReturnedQty > 0 ? `(${alreadyReturnedQty} previously returned)` : ''} • Rate: ₹{item.rate.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                            Return Qty {maxReturnable > 0 ? `(Max: ${maxReturnable})` : ''}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={maxReturnable}
                            disabled={isFullyReturned}
                            value={config.qty}
                            onChange={(e) => handleQtyChange(item.id, Number(e.target.value), maxReturnable)}
                            className="w-24 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-center disabled:opacity-40"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Condition / Reason</label>
                          <select
                            value={config.reason}
                            disabled={isFullyReturned}
                            onChange={(e) => handleReasonChange(item.id, e.target.value as SalesReturnItem['reason'])}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold disabled:opacity-40"
                          >
                            <option value="PATIENT_RECOVERED">Patient Recovered (Restock)</option>
                            <option value="WRONG_MEDICINE">Wrong Medicine (Restock)</option>
                            <option value="DAMAGED">Damaged / Broken (Quarantine)</option>
                            <option value="EXPIRED">Expired Medicine (Quarantine)</option>
                            <option value="OTHER">Other Reason (Restock)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Settlement Mode */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1">Refund / Settlement Mode:</label>
                  <select
                    value={refundMode}
                    onChange={(e) => setRefundMode(e.target.value as typeof refundMode)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="CASH">Cash Refund at Counter (Deducts from Cash Drawer)</option>
                    <option value="CREDIT_NOTE">Issue Credit Note / Due Deduction (No Cash Payout)</option>
                    <option value="BANK_TRANSFER">Bank Transfer / UPI Refund (Digital Settlement)</option>
                  </select>
                  <p className="text-[11px] font-medium mt-1">
                    {refundMode === 'CASH' && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        ✓ Deducts cash from system cash drawer balance immediately.
                      </span>
                    )}
                    {refundMode === 'CREDIT_NOTE' && (
                      <span className="text-purple-700 dark:text-purple-400 font-bold">
                        ✓ Deducts patient ledger dues; no cash paid out.
                      </span>
                    )}
                    {refundMode === 'BANK_TRANSFER' && (
                      <span className="text-blue-700 dark:text-blue-400 font-bold">
                        ✓ Bank/UPI digital payout; does not affect physical drawer cash.
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Return Notes:</label>
                  <input
                    type="text"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Reason details or doctor prescription update..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Refund Amount:</span>
                  <div className="text-xl font-black text-rose-600 font-mono">
                    ₹{calculatedRefund.toFixed(2)}
                  </div>
                </div>

                <button
                  onClick={handleSubmitReturn}
                  disabled={itemsToReturn.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 disabled:opacity-40 transition-all"
                >
                  Confirm Return & Settle Refund
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400">
              <RotateCcw className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-xs">No invoice selected</p>
              <p className="text-[11px] mt-0.5">Please select an invoice from the left list to initiate return.</p>
            </div>
          )}
        </div>
      </div>

      {/* Return History Table */}
      {salesReturns.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Recent Sales Returns History ({salesReturns.length})
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500">
              Total Cash Refunded: ₹{salesReturns.filter((s) => s.refundMode === 'CASH').reduce((sum, s) => sum + s.totalRefundAmount, 0).toFixed(2)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-slate-400 uppercase text-[10px]">
                  <th className="p-2.5">Return #</th>
                  <th className="p-2.5">Date & Time</th>
                  <th className="p-2.5">Original Invoice</th>
                  <th className="p-2.5">Customer</th>
                  <th className="p-2.5">Items Returned</th>
                  <th className="p-2.5 text-right">Refund (₹)</th>
                  <th className="p-2.5 text-center">Settlement Mode</th>
                  <th className="p-2.5 text-center">Cash Drawer Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {salesReturns.map((sr) => (
                  <tr key={sr.id}>
                    <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">{sr.returnNumber}</td>
                    <td className="p-2.5 font-mono text-slate-500 text-[11px]">{sr.returnDate}</td>
                    <td className="p-2.5 font-mono text-slate-600 font-semibold">{sr.originalInvoiceNumber}</td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-slate-100">{sr.customerName}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">
                      {sr.items.map((i) => `${i.medicineName} (x${i.returnQuantity})`).join(', ')}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-rose-600">₹{sr.totalRefundAmount.toFixed(2)}</td>
                    <td className="p-2.5 text-center font-semibold text-[10px]">
                      <span className={`px-2 py-0.5 rounded ${
                        sr.refundMode === 'CASH'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : sr.refundMode === 'CREDIT_NOTE'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {sr.refundMode}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-mono text-[10px]">
                      {sr.refundMode === 'CASH' ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          -₹{sr.totalRefundAmount.toFixed(2)} Drawer OUT
                        </span>
                      ) : (
                        <span className="text-slate-400">No Cash Payout</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
