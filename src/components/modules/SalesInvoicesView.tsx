'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { SalesInvoice } from '@/types/pharmacy';
import { PaymentModeBadge } from '@/components/common/Badge';
import { PrintInvoiceModal } from '@/components/common/PrintInvoiceModal';
import {
  Search,
  Receipt,
  Printer,
  Share2,
  RotateCcw,
  Download,
  Calendar,
  Filter,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';

export const SalesInvoicesView: React.FC = () => {
  const { invoices, setActiveTab } = usePharmacy();
  const [search, setSearch] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.items.some((i) => i.medicineName.toLowerCase().includes(search.toLowerCase()));

    const matchesMode = selectedPaymentMode === 'ALL' || inv.paymentMode === selectedPaymentMode;
    return matchesSearch && matchesMode;
  });

  const handleOpenPrint = (inv: SalesInvoice) => {
    setSelectedInvoice(inv);
    setIsPrintModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Invoice No', 'Date', 'Customer', 'Doctor', 'Items Count', 'Sub Total', 'Discount', 'GST', 'Grand Total', 'Mode', 'Status'];
    const rows = filteredInvoices.map((i) => [
      i.invoiceNumber,
      i.invoiceDate,
      `"${i.customerName}"`,
      `"${i.doctorName || 'Self'}"`,
      i.items.length,
      i.subTotal.toFixed(2),
      i.totalDiscount.toFixed(2),
      (i.totalCgst + i.totalSgst + i.totalIgst).toFixed(2),
      i.grandTotal.toFixed(2),
      i.paymentMode,
      i.paymentStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Invoices_Report_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalBilled = filteredInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            Sales Invoices Register ({filteredInvoices.length})
          </h2>
          <p className="text-xs text-slate-500">
            Total Billed Volume: <strong className="text-emerald-600 font-mono">₹{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            + Create New Invoice
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice #, customer name, medicine..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
          />
        </div>

        <div>
          <select
            value={selectedPaymentMode}
            onChange={(e) => setSelectedPaymentMode(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="UPI">UPI / QR</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="CREDIT">Credit (Due)</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="p-3">Invoice Details</th>
                <th className="p-3">Customer / Patient</th>
                <th className="p-3">Doctor</th>
                <th className="p-3">Items Summary</th>
                <th className="p-3 text-right">Taxable</th>
                <th className="p-3 text-right">GST</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3 text-center">Payment</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    No sales invoices matching current filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{inv.invoiceNumber}</div>
                      <p className="text-[10px] text-slate-500">{inv.invoiceDate}</p>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{inv.customerName}</div>
                      {inv.customerPhone && <p className="text-[10px] text-slate-400">{inv.customerPhone}</p>}
                    </td>

                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {inv.doctorName || <span className="text-slate-400 italic">Self / OTC</span>}
                    </td>

                    <td className="p-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {inv.items.length} items
                      </span>
                      <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {inv.items.map((i) => i.medicineName).join(', ')}
                      </p>
                    </td>

                    <td className="p-3 text-right font-mono font-semibold">
                      ₹{(inv.subTotal - inv.totalDiscount).toFixed(2)}
                    </td>

                    <td className="p-3 text-right font-mono text-slate-500">
                      ₹{(inv.totalCgst + inv.totalSgst + inv.totalIgst).toFixed(2)}
                    </td>

                    <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ₹{inv.grandTotal.toFixed(2)}
                    </td>

                    <td className="p-3 text-center space-y-1">
                      <PaymentModeBadge mode={inv.paymentMode} />
                      <div>
                        <span
                          className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            inv.paymentStatus === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenPrint(inv)}
                          title="Print / Export Invoice"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setActiveTab('sales-returns')}
                          title="Process Return Against Bill"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PrintInvoiceModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
};
