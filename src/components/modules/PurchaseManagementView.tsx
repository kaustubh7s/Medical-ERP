'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { PurchaseEntry, PurchaseItem } from '@/types/pharmacy';
import { Modal } from '@/components/common/Modal';
import {
  PackageCheck,
  Plus,
  Search,
  Building2,
  Trash2,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

export const PurchaseManagementView: React.FC = () => {
  const {
    purchases,
    suppliers,
    medicines,
    createPurchase,
  } = usePharmacy();

  const [search, setSearch] = useState('');
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);

  // New Purchase Form State
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

  // Item Line state
  const [selectedMedicineId, setSelectedMedicineId] = useState(medicines[0]?.id || '');
  const [batchNumber, setBatchNumber] = useState('');
  const [mfgDate, setMfgDate] = useState('2025-10-01');
  const [expiryDate, setExpiryDate] = useState('2027-09-30');
  const [quantity, setQuantity] = useState<number>(100);
  const [freeQuantity, setFreeQuantity] = useState<number>(0);
  const [purchaseRate, setPurchaseRate] = useState<number>(20);
  const [mrp, setMrp] = useState<number>(30);
  const [saleRate, setSaleRate] = useState<number>(28);
  const [rackLocation, setRackLocation] = useState('Rack A-1');

  const selectedSupplier = suppliers.find((s) => s.id === supplierId) || suppliers[0];

  const handleAddLineItem = () => {
    const med = medicines.find((m) => m.id === selectedMedicineId);
    if (!med || !batchNumber) {
      alert('Please fill Medicine and Batch Number.');
      return;
    }

    const taxableAmount = purchaseRate * quantity;
    const gstRate = med.gstRate;
    const gstAmt = (taxableAmount * gstRate) / 100;
    const totalAmount = taxableAmount + gstAmt;

    const newItem: PurchaseItem = {
      id: `pi-${Date.now()}`,
      medicineId: med.id,
      medicineName: med.name,
      hsnCode: med.hsnCode,
      batchNumber,
      mfgDate,
      expiryDate,
      quantity,
      freeQuantity,
      purchaseRate,
      mrp,
      saleRate,
      discountPercent: 0,
      gstRate,
      taxableAmount,
      cgstAmount: gstAmt / 2,
      sgstAmount: gstAmt / 2,
      totalAmount,
      rackLocation,
    };

    setPurchaseItems((prev) => [...prev, newItem]);
    setBatchNumber('');
  };

  const handleRemoveLineItem = (id: string) => {
    setPurchaseItems((prev) => prev.filter((i) => i.id !== id));
  };

  const subTotal = purchaseItems.reduce((sum, i) => sum + i.taxableAmount, 0);
  const totalCgst = purchaseItems.reduce((sum, i) => sum + i.cgstAmount, 0);
  const totalSgst = purchaseItems.reduce((sum, i) => sum + i.sgstAmount, 0);
  const totalGst = totalCgst + totalSgst;
  const grandTotal = Math.round(subTotal + totalGst);

  const handleSubmitPurchase = () => {
    if (!billNumber || purchaseItems.length === 0) {
      alert('Please enter supplier bill number and at least 1 item.');
      return;
    }

    createPurchase({
      billNumber,
      billDate,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      supplierGst: selectedSupplier.gstNumber,
      items: purchaseItems,
      subTotal,
      totalDiscount: 0,
      totalCgst,
      totalSgst,
      totalGst,
      roundOff: grandTotal - (subTotal + totalGst),
      grandTotal,
      paymentStatus: 'UNPAID',
      amountPaid: 0,
      balanceDue: grandTotal,
      dueDate: dueDate || billDate,
    });

    setIsNewPurchaseModalOpen(false);
    setPurchaseItems([]);
    setBillNumber('');
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-blue-600" />
            Purchase Management & Goods Receipt Notes (GRN)
          </h2>
          <p className="text-xs text-slate-500">
            Track inward medicine consignments, supplier invoices, Input Tax Credit (ITC), and batch expiration dates.
          </p>
        </div>

        <button
          onClick={() => setIsNewPurchaseModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Purchase Inward (GRN)
        </button>
      </div>

      {/* Purchases Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="p-3">GRN #</th>
                <th className="p-3">Bill Details</th>
                <th className="p-3">Distributor / Supplier</th>
                <th className="p-3">Items Received</th>
                <th className="p-3 text-right">Taxable</th>
                <th className="p-3 text-right">GST (ITC)</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3 text-center">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {purchases.map((pur) => (
                <tr key={pur.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {pur.grnNumber}
                  </td>
                  <td className="p-3">
                    <p className="font-mono font-bold text-slate-900 dark:text-slate-100">{pur.billNumber}</p>
                    <p className="text-[10px] text-slate-400">Date: {pur.billDate}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{pur.supplierName}</p>
                    <p className="text-[10px] text-slate-400">GST: {pur.supplierGst}</p>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold">{pur.items.length} items</span>
                    <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                      {pur.items.map((i) => `${i.medicineName} (${i.quantity + (i.freeQuantity || 0)})`).join(', ')}
                    </p>
                  </td>
                  <td className="p-3 text-right font-mono font-semibold">₹{pur.subTotal.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono text-emerald-600 font-semibold">₹{pur.totalGst.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                    ₹{pur.grandTotal.toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        pur.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {pur.paymentStatus} (Due: ₹{pur.balanceDue.toFixed(2)})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Inward Modal */}
      <Modal
        isOpen={isNewPurchaseModalOpen}
        onClose={() => setIsNewPurchaseModalOpen(false)}
        title="Record New Inward Purchase Bill (GRN)"
        subtitle="Add multi-batch stock, calculate landed cost, and claim GST Input Tax Credit"
        maxWidth="5xl"
      >
        <div className="space-y-5">
          {/* Top Info */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1">Distributor / Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Supplier Bill / Invoice # *</label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="e.g. MS-99124"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Bill Date</label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Payment Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Add Line Item Box */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
            <h4 className="text-xs font-black uppercase text-blue-700 dark:text-blue-300">
              Add Medicine Batch Consignment
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-bold block mb-0.5">Medicine Product</label>
                <select
                  value={selectedMedicineId}
                  onChange={(e) => setSelectedMedicineId(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.genericName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold block mb-0.5">Batch No *</label>
                <input
                  type="text"
                  placeholder="e.g. DL-889"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold block mb-0.5">Exp Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold block mb-0.5">Qty (Billed)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold block mb-0.5">Free Qty</label>
                <input
                  type="number"
                  value={freeQuantity}
                  onChange={(e) => setFreeQuantity(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold block mb-0.5">Purchase Rate (₹)</label>
                <input
                  type="number"
                  value={purchaseRate}
                  onChange={(e) => setPurchaseRate(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-right"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold block mb-0.5">MRP (₹)</label>
                <input
                  type="number"
                  value={mrp}
                  onChange={(e) => setMrp(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-right"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleAddLineItem}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Batch to Bill
              </button>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">Medicine</th>
                  <th className="p-2.5">Batch</th>
                  <th className="p-2.5">Exp</th>
                  <th className="p-2.5 text-center">Qty + Free</th>
                  <th className="p-2.5 text-right">Cost Rate</th>
                  <th className="p-2.5 text-right">Taxable</th>
                  <th className="p-2.5 text-right">GST</th>
                  <th className="p-2.5 text-right">Total</th>
                  <th className="p-2.5 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchaseItems.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2.5 font-bold">{item.medicineName}</td>
                    <td className="p-2.5 font-mono">{item.batchNumber}</td>
                    <td className="p-2.5 text-slate-500">{item.expiryDate}</td>
                    <td className="p-2.5 text-center font-bold">
                      {item.quantity} {item.freeQuantity > 0 ? `(+${item.freeQuantity})` : ''}
                    </td>
                    <td className="p-2.5 text-right font-mono">₹{item.purchaseRate.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono">₹{item.taxableAmount.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono text-emerald-600">₹{(item.cgstAmount + item.sgstAmount).toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono font-bold">₹{item.totalAmount.toFixed(2)}</td>
                    <td className="p-2.5 text-center">
                      <button onClick={() => handleRemoveLineItem(item.id)} className="text-slate-400 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer & Submit */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Grand Total Inward:</span>
              <div className="text-2xl font-black text-blue-600 font-mono">
                ₹{grandTotal.toFixed(2)}
              </div>
            </div>

            <button
              onClick={handleSubmitPurchase}
              disabled={purchaseItems.length === 0}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 disabled:opacity-40"
            >
              Confirm Purchase & Restock Inventory
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
