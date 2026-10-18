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
  Crown,
  Pill,
  Sparkles,
  Layers,
} from 'lucide-react';

export const SalesInvoicesView: React.FC = () => {
  const { invoices, setActiveTab } = usePharmacy();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MEDICINE' | 'MEMBERSHIP' | 'COMBINED'>('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('ALL');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customerPhone && inv.customerPhone.includes(search)) ||
      (inv.membershipMemberId && inv.membershipMemberId.toLowerCase().includes(search.toLowerCase())) ||
      inv.items.some((i) => i.medicineName.toLowerCase().includes(search.toLowerCase()));

    // Sale Category Filter
    const cat = inv.saleCategory || (
      inv.items.every((i) => i.itemCategory === 'MEMBERSHIP')
        ? 'MEMBERSHIP'
        : inv.items.some((i) => i.itemCategory === 'MEMBERSHIP')
        ? 'COMBINED'
        : 'MEDICINE'
    );
    const matchesCategory = selectedCategory === 'ALL' || cat === selectedCategory;

    // Payment Status Filter
    const matchesStatus = selectedPaymentStatus === 'ALL' || inv.paymentStatus === selectedPaymentStatus;

    // Payment Mode Filter
    const matchesMode = selectedPaymentMode === 'ALL' || inv.paymentMode === selectedPaymentMode;

    // Date Range Filter
    const invDateOnly = inv.invoiceDate.substring(0, 10);
    const matchesStartDate = !startDate || invDateOnly >= startDate;
    const matchesEndDate = !endDate || invDateOnly <= endDate;

    return matchesSearch && matchesCategory && matchesStatus && matchesMode && matchesStartDate && matchesEndDate;
  });

  const handleOpenPrint = (inv: SalesInvoice) => {
    setSelectedInvoice(inv);
    setIsPrintModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = [
      'Invoice No',
      'Date',
      'Category',
      'Member ID',
      'Customer',
      'Phone',
      'Doctor',
      'Items Count',
      'Sub Total',
      'Discount',
      'GST',
      'Grand Total',
      'Membership Fee',
      'Mode',
      'Status',
    ];
    const rows = filteredInvoices.map((i) => {
      const cat = i.saleCategory || 'MEDICINE';
      return [
        i.invoiceNumber,
        i.invoiceDate,
        cat,
        i.membershipMemberId || '',
        `"${i.customerName}"`,
        `"${i.customerPhone || ''}"`,
        `"${i.doctorName || 'Self'}"`,
        i.items.length,
        i.subTotal.toFixed(2),
        i.totalDiscount.toFixed(2),
        (i.totalCgst + i.totalSgst + i.totalIgst).toFixed(2),
        i.grandTotal.toFixed(2),
        (i.membershipFeeAmount || 0).toFixed(2),
        i.paymentMode,
        i.paymentStatus,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Invoices_Report_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Financial Revenue Breakdowns (distinguishing medicines from membership fees)
  const totalBilled = filteredInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

  // Collected revenue (only PAID transactions to avoid treating pending/failed payments as revenue)
  const paidInvoices = filteredInvoices.filter((i) => i.paymentStatus === 'PAID');

  const membershipFeesCollected = paidInvoices.reduce((sum, inv) => {
    const memberItemAmt = inv.items
      .filter((item) => item.itemCategory === 'MEMBERSHIP')
      .reduce((s, it) => s + it.totalAmount, 0);
    return sum + (memberItemAmt || (inv.saleCategory === 'MEMBERSHIP' ? inv.amountPaid : 0));
  }, 0);

  const medicineSalesCollected = paidInvoices.reduce((sum, inv) => {
    const medItemAmt = inv.items
      .filter((item) => item.itemCategory !== 'MEMBERSHIP')
      .reduce((s, it) => s + it.totalAmount, 0);
    return sum + medItemAmt;
  }, 0);

  const pendingDuesTotal = filteredInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            Sales Invoices Register ({filteredInvoices.length} Records)
          </h2>
          <p className="text-xs text-slate-500">
            Real-time sales tracking with verified separation of medicine products and membership service fees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all"
          >
            + Create New POS Bill
          </button>
        </div>
      </div>

      {/* 4. Sales & Revenue Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Volume Billed</span>
          <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100">
            ₹{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">{filteredInvoices.length} invoices in view</span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block flex items-center gap-1">
            <Pill className="h-3 w-3" /> Medicine Revenue (Paid)
          </span>
          <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
            ₹{medicineSalesCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Dispensed pharmacy stock</span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block flex items-center gap-1">
            <Crown className="h-3 w-3" /> Membership Fees (Paid)
          </span>
          <span className="font-mono text-base font-black text-amber-700 dark:text-amber-400">
            ₹{membershipFeesCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Customer club service revenue</span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">Khata Balance Due</span>
          <span className="font-mono text-base font-black text-rose-700 dark:text-rose-400">
            ₹{pendingDuesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Unsettled credit receivables</span>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar */}
      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
          {/* Search Box */}
          <div className="relative sm:col-span-5">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, customer name, mobile, Member ID, drug..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-semibold"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Categories</option>
              <option value="MEDICINE">Medicine Sales Only</option>
              <option value="MEMBERSHIP">Membership Sales Only</option>
              <option value="COMBINED">Combined (Meds + Membership)</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-semibold"
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Paid Only</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="DUE">Khata Due</option>
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-semibold"
            >
              <option value="ALL">All Pay Modes</option>
              <option value="UPI">UPI / QR</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="POS_TERMINAL">Pine Labs Terminal</option>
              <option value="CREDIT">Khata Credit</option>
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-[11px] font-mono"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-[11px] font-mono"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[10px] text-rose-600 font-bold hover:underline"
              >
                Clear Dates
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().substring(0, 10);
                setStartDate(today);
                setEndDate(today);
              }}
              className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const past7 = new Date(now.getTime() - 7 * 86400000).toISOString().substring(0, 10);
                setStartDate(past7);
                setEndDate(now.toISOString().substring(0, 10));
              }}
              className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedCategory('ALL');
                setSelectedPaymentStatus('ALL');
                setSelectedPaymentMode('ALL');
                setSearch('');
              }}
              className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Data Table (Desktop View - Strictly Preserved for Laptop/PC) */}
      <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="p-3">Invoice & Category</th>
                <th className="p-3">Customer / Member</th>
                <th className="p-3">Doctor</th>
                <th className="p-3">Items & Services</th>
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
                filteredInvoices.map((inv) => {
                  const cat = inv.saleCategory || (
                    inv.items.every((i) => i.itemCategory === 'MEMBERSHIP')
                      ? 'MEMBERSHIP'
                      : inv.items.some((i) => i.itemCategory === 'MEMBERSHIP')
                      ? 'COMBINED'
                      : 'MEDICINE'
                  );

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {inv.invoiceNumber}
                        </div>
                        <p className="text-[10px] text-slate-500">{inv.invoiceDate}</p>
                        <div className="mt-1">
                          {cat === 'MEMBERSHIP' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              <Crown className="h-2.5 w-2.5" /> MEMBERSHIP
                            </span>
                          ) : cat === 'COMBINED' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <Sparkles className="h-2.5 w-2.5" /> COMBINED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                              <Pill className="h-2.5 w-2.5" /> MEDICINE
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {inv.customerName}
                        </div>
                        {inv.customerPhone && (
                          <p className="text-[10px] text-slate-500 font-mono">{inv.customerPhone}</p>
                        )}
                        {inv.membershipMemberId && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                              ★ {inv.membershipMemberId}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {inv.doctorName || <span className="text-slate-400 italic">Self / OTC</span>}
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {inv.items.length} line {inv.items.length === 1 ? 'item' : 'items'}
                        </span>
                        <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                          {inv.items.map((i) => i.medicineName).join(', ')}
                        </p>
                        {inv.membershipFeeAmount && inv.membershipFeeAmount > 0 ? (
                          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            Includes Membership: ₹{inv.membershipFeeAmount.toFixed(2)}
                          </p>
                        ) : null}
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
                  );
                })
              )}
            </tbody>
          </table>
      </div>
      </div>

      {/* Dedicated Mobile Invoice Cards List (md:hidden - Zero Horizontal Scroll Needed!) */}
      <div className="md:hidden space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30 text-emerald-600" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Invoices Found</p>
            <p className="text-xs text-slate-500 mt-1">Adjust search or filters above.</p>
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const cat = inv.saleCategory || (
              inv.items.every((i) => i.itemCategory === 'MEMBERSHIP')
                ? 'MEMBERSHIP'
                : inv.items.some((i) => i.itemCategory === 'MEMBERSHIP')
                ? 'COMBINED'
                : 'MEDICINE'
            );

            return (
              <div
                key={inv.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-2.5"
              >
                {/* Card Top: Invoice #, Date & Category */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-xs text-slate-950 dark:text-slate-50">
                        {inv.invoiceNumber}
                      </span>
                      {cat === 'MEMBERSHIP' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          <Crown className="h-2.5 w-2.5" /> CLUB
                        </span>
                      ) : cat === 'COMBINED' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          <Sparkles className="h-2.5 w-2.5" /> COMBO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Pill className="h-2.5 w-2.5" /> MEDS
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{inv.invoiceDate}</p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-base text-emerald-700 dark:text-emerald-400 block">
                      ₹{inv.grandTotal.toFixed(2)}
                    </span>
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
                </div>

                {/* Customer & Doctor details */}
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      👤 {inv.customerName}
                    </span>
                    {inv.customerPhone && (
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {inv.customerPhone}
                      </span>
                    )}
                  </div>
                  {inv.doctorName && (
                    <p className="text-[10px] text-slate-500 truncate">
                      🩺 Dr. {inv.doctorName}
                    </p>
                  )}
                  {inv.membershipMemberId && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                      ★ Member: {inv.membershipMemberId}
                    </span>
                  )}
                </div>

                {/* Items Summary */}
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {inv.items.length} item{inv.items.length === 1 ? '' : 's'}:
                  </span>{' '}
                  <span className="text-slate-500">
                    {inv.items.map((i) => i.medicineName).join(', ')}
                  </span>
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <PaymentModeBadge mode={inv.paymentMode} />

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenPrint(inv)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print / View</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('sales-returns')}
                      title="Process Return"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <PrintInvoiceModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
};
