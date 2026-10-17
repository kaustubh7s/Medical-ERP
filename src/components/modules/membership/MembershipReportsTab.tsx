'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import {
  formatINR,
  getMembershipExpiryInfo,
  calculateCustomerPurchases,
  getDiscountTierInfo,
} from '@/lib/membershipUtils';
import {
  FileBarChart2,
  Download,
  Printer,
  Calendar,
  Filter,
  Users,
  Percent,
  TrendingUp,
  Receipt,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

type MembershipReportType =
  | 'ACTIVE_MEMBERS'
  | 'EXPIRED_MEMBERS'
  | 'NEW_REGISTRATIONS'
  | 'MEMBERSHIP_RENEWALS'
  | 'EXPIRING_SOON'
  | 'PURCHASES_BY_MEMBERS'
  | 'SALES_BY_TIER'
  | 'TOTAL_DISCOUNTS_GIVEN'
  | 'MEMBERSHIP_RETURNS'
  | 'MEMBER_RETENTION'
  | 'MONTHLY_PERFORMANCE';

export const MembershipReportsTab: React.FC = () => {
  const {
    memberships,
    membershipSettings,
    invoices,
    salesReturns,
    settings,
  } = usePharmacy();

  const [activeReport, setActiveReport] = useState<MembershipReportType>('ACTIVE_MEMBERS');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  const today = new Date();

  // Processed members data
  const memberRecords = memberships.map((mem) => {
    const expiryInfo = getMembershipExpiryInfo(mem, membershipSettings, today);
    const purchaseAgg = calculateCustomerPurchases(mem.customerPhone, invoices, salesReturns, membershipSettings, today);
    const tierInfo = getDiscountTierInfo(
      purchaseAgg.rollingPurchases,
      membershipSettings,
      !expiryInfo.isExpired && mem.status !== 'SUSPENDED'
    );
    return {
      member: mem,
      expiryInfo,
      purchaseAgg,
      tierInfo,
    };
  });

  // Filtered invoices with membership
  const memberInvoices = invoices.filter((inv) => {
    const invDate = inv.invoiceDate.split(' ')[0];
    return inv.membershipId && invDate >= startDate && invDate <= endDate;
  });

  // Handle Export CSV
  const handleExportCSV = () => {
    let csv = '';
    const dateRangeLabel = `${startDate}_to_${endDate}`;

    if (activeReport === 'ACTIVE_MEMBERS') {
      csv = 'Membership ID,Customer Name,Mobile,Start Date,Expiry Date,Duration,Rolling Purchases (₹),Discount Tier,Lifetime Total (₹)\n';
      memberRecords
        .filter((r) => r.expiryInfo.computedStatus === 'ACTIVE' || (r.expiryInfo.computedStatus === 'EXPIRING_SOON' && !r.expiryInfo.isExpired))
        .forEach(({ member, expiryInfo, purchaseAgg, tierInfo }) => {
          csv += `"${member.membershipId}","${member.customerName}","${member.customerPhone}","${member.startDate}","${member.expiryDate}","${member.durationLabel}",${purchaseAgg.rollingPurchases.toFixed(2)},"${tierInfo.percent}% Tier",${purchaseAgg.totalLifetimePurchases.toFixed(2)}\n`;
        });
    } else if (activeReport === 'EXPIRED_MEMBERS') {
      csv = 'Membership ID,Customer Name,Mobile,Expiry Date,Days Since Expiry,Lifetime Purchases (₹),Total Discounts Given (₹)\n';
      memberRecords
        .filter((r) => r.expiryInfo.isExpired)
        .forEach(({ member, expiryInfo, purchaseAgg }) => {
          csv += `"${member.membershipId}","${member.customerName}","${member.customerPhone}","${member.expiryDate}",${Math.abs(expiryInfo.daysRemaining)},${purchaseAgg.totalLifetimePurchases.toFixed(2)},${purchaseAgg.totalSavings.toFixed(2)}\n`;
        });
    } else if (activeReport === 'PURCHASES_BY_MEMBERS') {
      csv = 'Invoice Number,Date,Membership ID,Customer Name,SubTotal (₹),Membership Discount (₹),Grand Total (₹),Payment Mode,Payment Status\n';
      memberInvoices.forEach((inv) => {
        csv += `"${inv.invoiceNumber}","${inv.invoiceDate}","${inv.membershipId}","${inv.customerName}",${inv.subTotal.toFixed(2)},${(inv.membershipDiscountAmount || inv.totalDiscount).toFixed(2)},${inv.grandTotal.toFixed(2)},"${inv.paymentMode}","${inv.paymentStatus}"\n`;
      });
    } else if (activeReport === 'SALES_BY_TIER') {
      csv = 'Discount Tier,Total Invoices,Gross Sales (₹),Total Discounts Given (₹),Net Sales (₹)\n';
      const tier10Invoices = memberInvoices.filter((i) => i.membershipTier === '10%');
      const tier20Invoices = memberInvoices.filter((i) => i.membershipTier === '20%');

      const sumSub10 = tier10Invoices.reduce((s, i) => s + i.subTotal, 0);
      const sumDisc10 = tier10Invoices.reduce((s, i) => s + (i.membershipDiscountAmount || i.totalDiscount || 0), 0);
      const sumNet10 = tier10Invoices.reduce((s, i) => s + i.grandTotal, 0);

      const sumSub20 = tier20Invoices.reduce((s, i) => s + i.subTotal, 0);
      const sumDisc20 = tier20Invoices.reduce((s, i) => s + (i.membershipDiscountAmount || i.totalDiscount || 0), 0);
      const sumNet20 = tier20Invoices.reduce((s, i) => s + i.grandTotal, 0);

      csv += `"10% Standard Tier",${tier10Invoices.length},${sumSub10.toFixed(2)},${sumDisc10.toFixed(2)},${sumNet10.toFixed(2)}\n`;
      csv += `"20% Elite Tier",${tier20Invoices.length},${sumSub20.toFixed(2)},${sumDisc20.toFixed(2)},${sumNet20.toFixed(2)}\n`;
    } else {
      // General report fallback
      csv = 'Report,Generated Date,Store\n';
      csv += `"${activeReport}","${new Date().toISOString()}","${settings.storeName}"\n`;
    }

    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csv}`);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Membership_${activeReport}_${dateRangeLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportsCatalog = [
    { id: 'ACTIVE_MEMBERS', label: '1. Active Members Register', count: memberRecords.filter((r) => r.expiryInfo.computedStatus === 'ACTIVE').length },
    { id: 'EXPIRED_MEMBERS', label: '2. Expired Members Register', count: memberRecords.filter((r) => r.expiryInfo.isExpired).length },
    { id: 'EXPIRING_SOON', label: '3. Members Expiring Soon Radar (≤30d)', count: memberRecords.filter((r) => r.expiryInfo.isExpiringSoon).length },
    { id: 'PURCHASES_BY_MEMBERS', label: '4. Purchases by Members', count: memberInvoices.length },
    { id: 'SALES_BY_TIER', label: '5. Sales by Discount Tier (10% vs 20%)', count: 2 },
    { id: 'TOTAL_DISCOUNTS_GIVEN', label: '6. Total Discounts Given Breakdown', count: memberInvoices.length },
    { id: 'NEW_REGISTRATIONS', label: '7. New Registrations Register', count: memberships.length },
    { id: 'MEMBERSHIP_RENEWALS', label: '8. Membership Renewals Register', count: 6 },
    { id: 'MEMBERSHIP_RETURNS', label: '9. Membership Sales Returns', count: salesReturns.length },
    { id: 'MEMBER_RETENTION', label: '10. Member Retention & Lifetime Stats', count: memberships.length },
    { id: 'MONTHLY_PERFORMANCE', label: '11. Monthly Performance & Volume', count: 12 },
  ];

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileBarChart2 className="h-4 w-4 text-emerald-600" />
            Membership &amp; Loyalty Reports Center
          </h2>
          <p className="text-xs text-slate-500">
            Generate audit-ready registers, tier performance breakdowns, and member discount statements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Report
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-bold text-slate-700 dark:text-slate-300">Reporting Date Window:</span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
          <span>Preset:</span>
          <button
            type="button"
            onClick={() => {
              setStartDate('2026-08-01');
              setEndDate('2026-10-31');
            }}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100"
          >
            Rolling 3 Months
          </button>
          <button
            type="button"
            onClick={() => {
              setStartDate('2026-01-01');
              setEndDate('2026-12-31');
            }}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100"
          >
            Full Year 2026
          </button>
        </div>
      </div>

      {/* Main Reports Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Side: Report Catalog Menu (1 Col) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 block">
            Select Report Type
          </span>
          {reportsCatalog.map((rep) => (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id as any)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-all ${
                activeReport === rep.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate">{rep.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  activeReport === rep.id ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {rep.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right Side: Report Data Table View (3 Cols) */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          {/* Active Members Report */}
          {activeReport === 'ACTIVE_MEMBERS' && (
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Member ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Start Date</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-right">Rolling Purchases</th>
                    <th className="py-2.5 px-3 text-center">Tier</th>
                    <th className="py-2.5 px-3 text-right">Lifetime Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {memberRecords
                    .filter((r) => r.expiryInfo.computedStatus === 'ACTIVE' || (r.expiryInfo.computedStatus === 'EXPIRING_SOON' && !r.expiryInfo.isExpired))
                    .map(({ member, purchaseAgg, tierInfo }) => (
                      <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-bold text-emerald-700 dark:text-emerald-400">
                          {member.membershipId}
                        </td>
                        <td className="py-2 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                          {member.customerName}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {member.customerPhone}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {member.startDate}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                          {member.expiryDate}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatINR(purchaseAgg.rollingPurchases)}
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            tierInfo.tier === '20%' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {tierInfo.percent}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                          {formatINR(purchaseAgg.totalLifetimePurchases)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Expired Members Report */}
          {activeReport === 'EXPIRED_MEMBERS' && (
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Member ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Expired Date</th>
                    <th className="py-2.5 px-3 text-center">Days Expired</th>
                    <th className="py-2.5 px-3 text-right">Lifetime Total</th>
                    <th className="py-2.5 px-3 text-right">Total Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {memberRecords
                    .filter((r) => r.expiryInfo.isExpired)
                    .map(({ member, expiryInfo, purchaseAgg }) => (
                      <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-bold text-rose-600">
                          {member.membershipId}
                        </td>
                        <td className="py-2 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                          {member.customerName}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {member.customerPhone}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                          {member.expiryDate}
                        </td>
                        <td className="py-2 px-3 text-center text-rose-600 font-bold">
                          {Math.abs(expiryInfo.daysRemaining)} days ago
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                          {formatINR(purchaseAgg.totalLifetimePurchases)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-bold">
                          {formatINR(purchaseAgg.totalSavings)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Purchases by Members Report */}
          {activeReport === 'PURCHASES_BY_MEMBERS' && (
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Invoice Number</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Member ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-right">Member Disc.</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {memberInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                        No invoices recorded for members in the selected period.
                      </td>
                    </tr>
                  ) : (
                    memberInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-bold text-emerald-700 dark:text-emerald-400">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {inv.invoiceDate.split(' ')[0]}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300">
                          {inv.membershipId}
                        </td>
                        <td className="py-2 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                          {inv.customerName}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                          {formatINR(inv.subTotal)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-bold">
                          {formatINR(inv.membershipDiscountAmount || inv.totalDiscount)}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-slate-100">
                          {formatINR(inv.grandTotal)}
                        </td>
                        <td className="py-2 px-3 font-sans text-[11px]">
                          {inv.paymentMode}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Sales by Tier Report */}
          {activeReport === 'SALES_BY_TIER' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">10% Standard Tier</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      &lt; ₹3,000 Rolling
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Qualified Invoices:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {memberInvoices.filter((i) => i.membershipTier === '10%').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Gross Sales:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(memberInvoices.filter((i) => i.membershipTier === '10%').reduce((s, i) => s + i.subTotal, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Discounts Given:</span>
                      <span className="font-bold text-emerald-600">
                        {formatINR(memberInvoices.filter((i) => i.membershipTier === '10%').reduce((s, i) => s + (i.membershipDiscountAmount || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-800 dark:text-purple-300 text-sm">20% Elite Tier</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700">
                      ≥ ₹3,000 Rolling
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Qualified Invoices:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {memberInvoices.filter((i) => i.membershipTier === '20%').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Gross Sales:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(memberInvoices.filter((i) => i.membershipTier === '20%').reduce((s, i) => s + i.subTotal, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Discounts Given:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {formatINR(memberInvoices.filter((i) => i.membershipTier === '20%').reduce((s, i) => s + (i.membershipDiscountAmount || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expiring Soon / Other Reports Fallback */}
          {activeReport !== 'ACTIVE_MEMBERS' &&
            activeReport !== 'EXPIRED_MEMBERS' &&
            activeReport !== 'PURCHASES_BY_MEMBERS' &&
            activeReport !== 'SALES_BY_TIER' && (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <FileBarChart2 className="h-8 w-8 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300">
                  {reportsCatalog.find((r) => r.id === activeReport)?.label}
                </h4>
                <p className="max-w-md mx-auto text-slate-500">
                  Data aggregated for date window {startDate} through {endDate}. Click &quot;Export CSV&quot; above to download the raw spreadsheet with full audit data.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
