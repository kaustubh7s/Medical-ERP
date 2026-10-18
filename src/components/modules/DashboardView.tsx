'use client';

import React from 'react';
import { usePharmacy } from '@/lib/store';
import {
  IndianRupee,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Users,
  Building2,
  Boxes,
  TrendingUp,
  CreditCard,
  QrCode,
  Calendar,
  AlertOctagon,
  ArrowRight,
  Plus,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    medicines,
    invoices,
    purchases,
    customers,
    suppliers,
    expenses,
    heldBills,
    setActiveTab,
    getCashDrawerSummary,
  } = usePharmacy();

  const realToday = new Date().toISOString().substring(0, 10);
  const hasInvoicesToday = invoices.some((i) => i.invoiceDate.startsWith(realToday));
  const todayStr = hasInvoicesToday ? realToday : '2026-08-30';
  const todayInvoices = invoices.filter((i) => i.invoiceDate.startsWith(todayStr));
  const todayPurchases = purchases.filter((p) => p.billDate === todayStr);

  const cashDrawer = getCashDrawerSummary(todayStr);

  // Financial Operational Numbers
  const todaySalesTotal = todayInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const todaySalesCash = cashDrawer.totalSalesCash;
  const todaySalesUPI = todayInvoices.filter((i) => i.paymentMode === 'UPI').reduce((s, i) => s + i.amountPaid, 0);
  const todaySalesCard = todayInvoices.filter((i) => i.paymentMode === 'CARD').reduce((s, i) => s + i.amountPaid, 0);
  const todaySalesCredit = todayInvoices.filter((i) => i.paymentMode === 'CREDIT').reduce((s, i) => s + i.balanceDue, 0);

  // Profit Calculation (COGS vs Revenue)
  const todayCOGS = todayInvoices.reduce((sum, inv) => {
    return (
      sum +
      inv.items.reduce((itemSum, item) => itemSum + item.quantity * (item.costRate || item.rate * 0.8), 0)
    );
  }, 0);
  const todayGrossProfit = todaySalesTotal - todayCOGS;

  const totalCustomerDues = customers.reduce((sum, c) => sum + c.currentDue, 0);
  const totalSupplierPayables = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  // Inventory Health Counts
  const today = new Date();
  const lowStockMedicines = medicines.filter(
    (m) => m.batches.reduce((sum, b) => sum + b.availableQuantity, 0) <= m.reorderLevel
  );

  const nearExpiryBatches: { medicineName: string; batchNumber: string; expiryDate: string; daysLeft: number; stock: number; rack: string }[] = [];
  const expiredBatches: { medicineName: string; batchNumber: string; expiryDate: string; stock: number; rack: string }[] = [];

  medicines.forEach((m) => {
    m.batches.forEach((b) => {
      if (b.availableQuantity <= 0) return;
      const exp = new Date(b.expiryDate);
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 0) {
        expiredBatches.push({ medicineName: m.name, batchNumber: b.batchNumber, expiryDate: b.expiryDate, stock: b.availableQuantity, rack: b.rackLocation });
      } else if (diff <= 30) {
        nearExpiryBatches.push({ medicineName: m.name, batchNumber: b.batchNumber, expiryDate: b.expiryDate, daysLeft: diff, stock: b.availableQuantity, rack: b.rackLocation });
      }
    });
  });

  const dueCustomers = customers.filter((c) => c.currentDue > 0);
  const dueSuppliers = suppliers.filter((s) => s.currentBalance > 0);

  return (
    <div className="space-y-4">
      {/* Pharmacy Top Operational Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
            Rx
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Daily Pharmacy Operations Desk
            </h2>
            <p suppressHydrationWarning className="text-[11px] text-slate-500 font-mono">
              Date: 30 Aug 2026 | Shifts: Active Counter
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>F2 Billing</span>
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>F3 Inward GRN</span>
          </button>
          {heldBills.length > 0 && (
            <button
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold animate-pulse"
            >
              <span>F5 Parked ({heldBills.length})</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
            <span>Registers</span>
          </button>
        </div>
      </div>

      {/* 10 Operational Widgets Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {/* 1. Today's Sales */}
        <div className="erp-widget border-l-4 border-l-emerald-600">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Today's Sales</span>
          <p className="text-base font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5">
            ₹{todaySalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-mono text-slate-500 block">{todayInvoices.length} Invoices</span>
        </div>

        {/* 2. Cash In Hand */}
        <div className="erp-widget border-l-4 border-l-blue-600">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Cash in Drawer</span>
          <p className="text-base font-black font-mono text-blue-700 dark:text-blue-400 mt-0.5">
            ₹{cashDrawer.expectedCashInDrawer.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-mono text-slate-500 block">
            {cashDrawer.todaySalesReturnCashRefunds > 0
              ? `-₹${cashDrawer.todaySalesReturnCashRefunds.toFixed(2)} Refunds`
              : 'Counter 1 Active'}
          </span>
        </div>

        {/* 3. UPI Collection */}
        <div className="erp-widget border-l-4 border-l-purple-600">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">UPI / QR Digital</span>
          <p className="text-base font-black font-mono text-purple-700 dark:text-purple-400 mt-0.5">
            ₹{todaySalesUPI.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-mono text-slate-500 block">Direct Bank</span>
        </div>

        {/* 4. Customer Credit Given Today */}
        <div className="erp-widget border-l-4 border-l-amber-600">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Today Credit Given</span>
          <p className="text-base font-black font-mono text-amber-700 dark:text-amber-400 mt-0.5">
            ₹{todaySalesCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-mono text-slate-500 block">Patient Khata</span>
        </div>

        {/* 5. Today's Est. Profit */}
        <div className="erp-widget border-l-4 border-l-teal-600">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Today's Profit</span>
          <p className="text-base font-black font-mono text-teal-700 dark:text-teal-400 mt-0.5">
            ₹{todayGrossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-mono text-emerald-600 font-bold block">
            {todaySalesTotal > 0 ? `${((todayGrossProfit / todaySalesTotal) * 100).toFixed(1)}% Margin` : '0%'}
          </span>
        </div>

        {/* 6. Pending Customer Dues */}
        <div className="erp-widget border-l-4 border-l-rose-600">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Total Customer Dues</span>
          <p className="text-base font-black font-mono text-rose-700 dark:text-rose-400 mt-0.5">
            ₹{totalCustomerDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-mono text-slate-500 block">{dueCustomers.length} Patients with Dues</span>
        </div>

        {/* 7. Pending Supplier Payables */}
        <div className="erp-widget border-l-4 border-l-indigo-600">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Supplier Payables</span>
          <p className="text-base font-black font-mono text-indigo-700 dark:text-indigo-400 mt-0.5">
            ₹{totalSupplierPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-mono text-slate-500 block">{dueSuppliers.length} Distributors</span>
        </div>

        {/* 8. Low Stock Count */}
        <div className="erp-widget border-l-4 border-l-yellow-500">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Low Stock Items</span>
          <p className="text-base font-black font-mono text-yellow-700 dark:text-yellow-400 mt-0.5">
            {lowStockMedicines.length} Medicines
          </p>
          <span className="text-[10px] font-mono text-yellow-600 font-semibold block">&lt; Reorder Threshold</span>
        </div>

        {/* 9. Near Expiry (<= 30 Days) */}
        <div className="erp-widget border-l-4 border-l-orange-500">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Near Expiry (&le;30d)</span>
          <p className="text-base font-black font-mono text-orange-700 dark:text-orange-400 mt-0.5">
            {nearExpiryBatches.length} Batches
          </p>
          <span className="text-[10px] font-mono text-orange-600 font-semibold block">Action Needed</span>
        </div>

        {/* 10. Expired Stock Count */}
        <div className="erp-widget border-l-4 border-l-red-600">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Expired in Rack</span>
          <p className="text-base font-black font-mono text-red-700 dark:text-red-400 mt-0.5">
            {expiredBatches.length} Batches
          </p>
          <span className="text-[10px] font-mono text-red-600 font-semibold block">Quarantine / Return</span>
        </div>
      </div>

      {/* TODAY'S ATTENTION REQUIRED - 4 High-Density Operational Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 1. Medicines Expiring Within 30 Days */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              1. Medicines Expiring Within 30 Days ({nearExpiryBatches.length})
            </h3>
            <button
              onClick={() => setActiveTab('expiry')}
              className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              Open Expiry Desk <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Medicine Product</th>
                  <th>Batch</th>
                  <th>Rack</th>
                  <th className="text-center">Stock</th>
                  <th className="text-center">Days Left</th>
                  <th className="text-right">Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {nearExpiryBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-slate-400 text-xs">
                      No medicines expiring within next 30 days.
                    </td>
                  </tr>
                ) : (
                  nearExpiryBatches.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-bold text-slate-900 dark:text-slate-100">{item.medicineName}</td>
                      <td className="font-mono text-slate-600 dark:text-slate-300">{item.batchNumber}</td>
                      <td className="text-slate-500 font-mono text-[11px]">{item.rack}</td>
                      <td className="text-center font-mono font-bold text-slate-800 dark:text-slate-200">{item.stock}</td>
                      <td className="text-center font-mono font-bold text-orange-600">{item.daysLeft}d</td>
                      <td className="text-right font-mono text-slate-500">{item.expiryDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Stock Below Reorder Level */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              2. Stock Below Reorder Level ({lowStockMedicines.length})
            </h3>
            <button
              onClick={() => setActiveTab('purchases')}
              className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              Generate PO <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Packing</th>
                  <th className="text-center">Current Stock</th>
                  <th className="text-center">Reorder Min</th>
                  <th className="text-right">Manufacturer</th>
                </tr>
              </thead>
              <tbody>
                {lowStockMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-slate-400 text-xs">
                      All inventory stocks above minimum threshold.
                    </td>
                  </tr>
                ) : (
                  lowStockMedicines.map((m) => {
                    const total = m.batches.reduce((sum, b) => sum + b.availableQuantity, 0);
                    return (
                      <tr key={m.id}>
                        <td className="font-bold text-slate-900 dark:text-slate-100">{m.name}</td>
                        <td className="text-slate-500 text-[11px]">{m.packSize}</td>
                        <td className="text-center font-mono font-bold text-red-600">{total}</td>
                        <td className="text-center font-mono text-slate-600">{m.reorderLevel}</td>
                        <td className="text-right text-slate-500">{m.manufacturer}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Outstanding Customer Dues (Patient Khata) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              3. Outstanding Customer Dues ({dueCustomers.length})
            </h3>
            <button
              onClick={() => setActiveTab('payments')}
              className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              Collect Voucher <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Phone Number</th>
                  <th>Doctor Ref</th>
                  <th className="text-right">Credit Due (₹)</th>
                </tr>
              </thead>
              <tbody>
                {dueCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-slate-400 text-xs">
                      No pending customer credit balances.
                    </td>
                  </tr>
                ) : (
                  dueCustomers.map((c) => (
                    <tr key={c.id}>
                      <td className="font-bold text-slate-900 dark:text-slate-100">{c.name}</td>
                      <td className="font-mono text-slate-500 text-[11px]">{c.phone}</td>
                      <td className="text-slate-500">{c.doctorName || 'Self'}</td>
                      <td className="text-right font-mono font-bold text-rose-600">
                        ₹{c.currentDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Supplier Payments Due (Distributors) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              4. Supplier Distributor Payables ({dueSuppliers.length})
            </h3>
            <button
              onClick={() => setActiveTab('suppliers')}
              className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              Pay Distributor <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Distributor Agency</th>
                  <th>GSTIN</th>
                  <th>Credit Terms</th>
                  <th className="text-right">Balance Due (₹)</th>
                </tr>
              </thead>
              <tbody>
                {dueSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-slate-400 text-xs">
                      No outstanding distributor balances.
                    </td>
                  </tr>
                ) : (
                  dueSuppliers.map((s) => (
                    <tr key={s.id}>
                      <td className="font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                      <td className="font-mono text-slate-500 text-[11px]">{s.gstNumber}</td>
                      <td className="text-slate-600 text-[11px]">{s.paymentTerms}</td>
                      <td className="text-right font-mono font-bold text-indigo-600">
                        ₹{s.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
