'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  IndianRupee,
  FileText,
  Filter,
  CheckCircle2,
} from 'lucide-react';

type ReportType =
  | 'SALES_REGISTER'
  | 'PURCHASE_REGISTER'
  | 'GST_REPORT'
  | 'PROFIT_REPORT'
  | 'STOCK_VALUATION'
  | 'CUSTOMER_LEDGER'
  | 'SUPPLIER_LEDGER'
  | 'CASH_BOOK';

export const ReportCenterView: React.FC = () => {
  const { medicines, invoices, purchases, expenses, customers, suppliers, payments, settings } = usePharmacy();

  const [activeReport, setActiveReport] = useState<ReportType>('SALES_REGISTER');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-31');

  const filteredInvoices = invoices.filter((i) => i.invoiceDate >= startDate && i.invoiceDate <= `${endDate} 23:59:59`);
  const filteredPurchases = purchases.filter((p) => p.billDate >= startDate && p.billDate <= endDate);
  const filteredExpenses = expenses.filter((e) => e.date >= startDate && e.date <= endDate);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeReport === 'SALES_REGISTER') {
      csvContent += 'Invoice Number,Date,Customer,Doctor,Taxable (₹),CGST (₹),SGST (₹),RoundOff (₹),Grand Total (₹),Mode,Status\n';
      filteredInvoices.forEach((i) => {
        csvContent += `"${i.invoiceNumber}","${i.invoiceDate}","${i.customerName}","${i.doctorName || 'Self'}",${(i.grandTotal - (i.totalCgst + i.totalSgst)).toFixed(2)},${i.totalCgst.toFixed(2)},${i.totalSgst.toFixed(2)},${i.roundOff},${i.grandTotal.toFixed(2)},"${i.paymentMode}","${i.paymentStatus}"\n`;
      });
    } else if (activeReport === 'PURCHASE_REGISTER') {
      csvContent += 'GRN Number,Bill Number,Date,Supplier,Supplier GST,Taxable (₹),Total GST (₹),Grand Total (₹),Status\n';
      filteredPurchases.forEach((p) => {
        csvContent += `"${p.grnNumber}","${p.billNumber}","${p.billDate}","${p.supplierName}","${p.supplierGst}",${p.subTotal.toFixed(2)},${p.totalGst.toFixed(2)},${p.grandTotal.toFixed(2)},"${p.paymentStatus}"\n`;
      });
    } else if (activeReport === 'STOCK_VALUATION') {
      csvContent += 'Medicine,Generic,HSN,Stock Units,Cost Price (₹),MRP (₹),Cost Valuation (₹),MRP Valuation (₹)\n';
      medicines.forEach((m) => {
        const costVal = m.batches.reduce((s, b) => s + b.availableQuantity * b.purchaseRate, 0);
        const mrpVal = m.batches.reduce((s, b) => s + b.availableQuantity * b.mrp, 0);
        csvContent += `"${m.name}","${m.genericName}","${m.hsnCode}",${m.totalStock},${m.batches[0]?.purchaseRate || 0},${m.batches[0]?.mrp || 0},${costVal.toFixed(2)},${mrpVal.toFixed(2)}\n`;
      });
    } else if (activeReport === 'CASH_BOOK') {
      csvContent += 'Date,Particulars,Voucher Type,Receipt/Debit (₹),Payment/Credit (₹)\n';
      filteredInvoices.filter((i) => i.paymentMode === 'CASH').forEach((i) => {
        csvContent += `"${i.invoiceDate}","Sales Cash: ${i.invoiceNumber} (${i.customerName})","SALES_RECEIPT",${i.grandTotal.toFixed(2)},0\n`;
      });
      filteredExpenses.filter((e) => e.paymentMode === 'CASH').forEach((e) => {
        csvContent += `"${e.date}","Expense: ${e.title} (${e.paidTo})","PAYMENT",0,${e.amount.toFixed(2)}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeReport}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportsList = [
    { id: 'SALES_REGISTER', title: '1. Sales Register (Bill-wise)' },
    { id: 'PURCHASE_REGISTER', title: '2. Purchase Register (Inward GRN)' },
    { id: 'GST_REPORT', title: '3. GST Output & ITC Summary' },
    { id: 'PROFIT_REPORT', title: '4. Item-wise Profit Margins' },
    { id: 'STOCK_VALUATION', title: '5. Stock Valuation Ledger' },
    { id: 'CUSTOMER_LEDGER', title: '6. Customer Dues & Aging' },
    { id: 'SUPPLIER_LEDGER', title: '7. Supplier Payables Ledger' },
    { id: 'CASH_BOOK', title: '8. Daily Cash Book' },
  ];

  return (
    <div className="space-y-3">
      {/* Top Controls Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            Accountant-Ready Financial & Tax Registers
          </h2>
          <p className="text-[11px] text-slate-500 font-mono">
            Tabular audited statements formatted for Chartered Accountants, Tax Auditors, and Internal Reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Register</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs & Date Range Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Register Tabs */}
        <div className="flex flex-wrap gap-1">
          {reportsList.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id as ReportType)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                activeReport === r.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {r.title}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 text-[11px]">Period:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
          />
        </div>
      </div>

      {/* PRINTABLE AUDIT STATEMENT TABLE */}
      <div id="printable-invoice" className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-xs">
        {/* Register Header */}
        <div className="border-b border-slate-300 dark:border-slate-700 pb-2 flex justify-between items-end">
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 uppercase">
              {settings.storeName} - {reportsList.find((r) => r.id === activeReport)?.title}
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              DL: {settings.drugLicenseNumber} | GSTIN: {settings.gstNumber} | Period: {startDate} to {endDate}
            </p>
          </div>
          <span suppressHydrationWarning className="text-[10px] font-mono text-slate-400">Printed: 30 Aug 2026</span>
        </div>

        {/* 1. SALES REGISTER */}
        {activeReport === 'SALES_REGISTER' && (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Inv #</th>
                  <th>Date & Time</th>
                  <th>Patient / Customer</th>
                  <th>Doctor Ref</th>
                  <th className="text-right">Taxable Value</th>
                  <th className="text-right">CGST</th>
                  <th className="text-right">SGST</th>
                  <th className="text-right">Net Amount</th>
                  <th className="text-center">Mode</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-mono font-bold text-slate-900 dark:text-slate-100">{inv.invoiceNumber}</td>
                    <td className="font-mono text-slate-500 text-[11px]">{inv.invoiceDate}</td>
                    <td className="font-bold">{inv.customerName}</td>
                    <td className="text-slate-500">{inv.doctorName || 'Self'}</td>
                    <td className="text-right font-mono">₹{(inv.grandTotal - (inv.totalCgst + inv.totalSgst)).toFixed(2)}</td>
                    <td className="text-right font-mono text-slate-600">₹{inv.totalCgst.toFixed(2)}</td>
                    <td className="text-right font-mono text-slate-600">₹{inv.totalSgst.toFixed(2)}</td>
                    <td className="text-right font-mono font-black text-emerald-700">₹{inv.grandTotal.toFixed(2)}</td>
                    <td className="text-center font-mono text-[10px]">{inv.paymentMode}</td>
                    <td className="text-center font-bold text-[10px]">{inv.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-slate-100 dark:bg-slate-800">
                  <td colSpan={7} className="text-right">Total Net Sales Dispensed:</td>
                  <td className="text-right font-mono font-black text-emerald-700 text-sm">
                    ₹{filteredInvoices.reduce((s, i) => s + i.grandTotal, 0).toFixed(2)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 2. PURCHASE REGISTER */}
        {activeReport === 'PURCHASE_REGISTER' && (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>GRN #</th>
                  <th>Bill #</th>
                  <th>Bill Date</th>
                  <th>Distributor Supplier</th>
                  <th>Supplier GSTIN</th>
                  <th className="text-right">Taxable Amt</th>
                  <th className="text-right">Total GST</th>
                  <th className="text-right">Net Payable</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((pur) => (
                  <tr key={pur.id}>
                    <td className="font-mono font-bold">{pur.grnNumber}</td>
                    <td className="font-mono font-semibold">{pur.billNumber}</td>
                    <td className="font-mono text-slate-500">{pur.billDate}</td>
                    <td className="font-bold">{pur.supplierName}</td>
                    <td className="font-mono text-slate-500 text-[11px]">{pur.supplierGst}</td>
                    <td className="text-right font-mono">₹{pur.subTotal.toFixed(2)}</td>
                    <td className="text-right font-mono text-slate-600">₹{pur.totalGst.toFixed(2)}</td>
                    <td className="text-right font-mono font-black text-indigo-700">₹{pur.grandTotal.toFixed(2)}</td>
                    <td className="text-center font-bold text-[10px]">{pur.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-slate-100 dark:bg-slate-800">
                  <td colSpan={7} className="text-right">Total Purchase Inwards:</td>
                  <td className="text-right font-mono font-black text-indigo-700 text-sm">
                    ₹{filteredPurchases.reduce((s, p) => s + p.grandTotal, 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 3. STOCK VALUATION LEDGER */}
        {activeReport === 'STOCK_VALUATION' && (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Medicine Brand</th>
                  <th>Generic Salt</th>
                  <th>HSN Code</th>
                  <th className="text-center">Total Stock</th>
                  <th className="text-right">Cost Price (₹)</th>
                  <th className="text-right">MRP (₹)</th>
                  <th className="text-right">Valuation @ Cost (₹)</th>
                  <th className="text-right">Valuation @ MRP (₹)</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => {
                  const costVal = m.batches.reduce((s, b) => s + b.availableQuantity * b.purchaseRate, 0);
                  const mrpVal = m.batches.reduce((s, b) => s + b.availableQuantity * b.mrp, 0);
                  return (
                    <tr key={m.id}>
                      <td className="font-bold text-slate-900 dark:text-slate-100">{m.name}</td>
                      <td className="text-slate-500 text-[11px]">{m.genericName}</td>
                      <td className="font-mono text-slate-500">{m.hsnCode}</td>
                      <td className="text-center font-mono font-bold">{m.totalStock}</td>
                      <td className="text-right font-mono text-slate-600">₹{m.batches[0]?.purchaseRate || 0}</td>
                      <td className="text-right font-mono text-slate-600">₹{m.batches[0]?.mrp || 0}</td>
                      <td className="text-right font-mono font-bold text-emerald-700">₹{costVal.toFixed(2)}</td>
                      <td className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">₹{mrpVal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-slate-100 dark:bg-slate-800">
                  <td colSpan={6} className="text-right">Total Pharmacy Stock Valuation @ Cost:</td>
                  <td className="text-right font-mono font-black text-emerald-700 text-sm">
                    ₹{medicines.reduce((s, m) => s + m.batches.reduce((bs, b) => bs + b.availableQuantity * b.purchaseRate, 0), 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 4. DAILY CASH BOOK */}
        {activeReport === 'CASH_BOOK' && (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Particulars / Ledger Account</th>
                  <th>Voucher Type</th>
                  <th className="text-right">Receipt / Inward (₹)</th>
                  <th className="text-right">Payment / Outward (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.filter((i) => i.paymentMode === 'CASH').map((i) => (
                  <tr key={i.id}>
                    <td className="font-mono text-slate-500">{i.invoiceDate}</td>
                    <td className="font-bold">Sales Counter: {i.invoiceNumber} ({i.customerName})</td>
                    <td className="font-mono text-[10px] text-emerald-700">CASH_RECEIPT</td>
                    <td className="text-right font-mono font-bold text-emerald-700">₹{i.grandTotal.toFixed(2)}</td>
                    <td className="text-right font-mono text-slate-400">0.00</td>
                  </tr>
                ))}
                {filteredExpenses.filter((e) => e.paymentMode === 'CASH').map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono text-slate-500">{e.date}</td>
                    <td className="font-bold text-slate-800 dark:text-slate-200">Shop Expense: {e.title} (Paid to: {e.paidTo})</td>
                    <td className="font-mono text-[10px] text-rose-700">EXPENSE_PAYMENT</td>
                    <td className="text-right font-mono text-slate-400">0.00</td>
                    <td className="text-right font-mono font-bold text-rose-700">₹{e.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. CUSTOMER LEDGER */}
        {activeReport === 'CUSTOMER_LEDGER' && (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Mobile Number</th>
                  <th>Doctor Association</th>
                  <th className="text-right">Credit Limit (₹)</th>
                  <th className="text-right">Outstanding Due (₹)</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="font-bold">{c.name}</td>
                    <td className="font-mono text-slate-500">{c.phone}</td>
                    <td className="text-slate-600">{c.doctorName || 'Self'}</td>
                    <td className="text-right font-mono text-slate-600">₹{c.creditLimit}</td>
                    <td className="text-right font-mono font-black text-rose-600">₹{c.currentDue.toFixed(2)}</td>
                    <td className="text-center font-bold text-[10px]">
                      {c.currentDue > 0 ? <span className="text-rose-600">DUE PENDING</span> : <span className="text-emerald-700">CLEARED</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. SUPPLIER LEDGER */}
        {activeReport === 'SUPPLIER_LEDGER' && (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Distributor Agency</th>
                  <th>Company Firm Name</th>
                  <th>GSTIN</th>
                  <th>Payment Credit Terms</th>
                  <th className="text-right">Payable Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="font-bold">{s.name}</td>
                    <td className="text-slate-500">{s.companyName}</td>
                    <td className="font-mono text-slate-500">{s.gstNumber}</td>
                    <td className="text-slate-600">{s.paymentTerms}</td>
                    <td className="text-right font-mono font-black text-indigo-700">₹{s.currentBalance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. GST REPORT */}
        {activeReport === 'GST_REPORT' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Outward GST Tax Liability (GSTR-1)</span>
                <span className="font-mono text-base font-black text-rose-600">
                  ₹{filteredInvoices.reduce((s, i) => s + (i.totalCgst + i.totalSgst), 0).toFixed(2)}
                </span>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Input Tax Credit Eligible (GSTR-2)</span>
                <span className="font-mono text-base font-black text-emerald-700">
                  ₹{filteredPurchases.reduce((s, p) => s + p.totalGst, 0).toFixed(2)}
                </span>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Net GST Payable in Cash (GSTR-3B)</span>
                <span className="font-mono text-base font-black text-indigo-700">
                  ₹{Math.max(
                    0,
                    filteredInvoices.reduce((s, i) => s + (i.totalCgst + i.totalSgst), 0) -
                      filteredPurchases.reduce((s, p) => s + p.totalGst, 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 8. PROFIT REPORT */}
        {activeReport === 'PROFIT_REPORT' && (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th className="text-right">Sales Amount (₹)</th>
                  <th className="text-right">Est. Cost of Goods (₹)</th>
                  <th className="text-right">Gross Profit (₹)</th>
                  <th className="text-center">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((i) => {
                  const cogs = i.items.reduce((sum, item) => sum + item.quantity * (item.costRate || item.rate * 0.8), 0);
                  const profit = i.grandTotal - cogs;
                  const marginPct = i.grandTotal > 0 ? ((profit / i.grandTotal) * 100).toFixed(1) : '0';
                  return (
                    <tr key={i.id}>
                      <td className="font-mono font-bold">{i.invoiceNumber}</td>
                      <td className="font-mono text-slate-500">{i.invoiceDate}</td>
                      <td className="font-bold">{i.customerName}</td>
                      <td className="text-right font-mono">₹{i.grandTotal.toFixed(2)}</td>
                      <td className="text-right font-mono text-slate-500">₹{cogs.toFixed(2)}</td>
                      <td className="text-right font-mono font-black text-emerald-700">₹{profit.toFixed(2)}</td>
                      <td className="text-center font-mono font-bold text-slate-800 dark:text-slate-200">{marginPct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
