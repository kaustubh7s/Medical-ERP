'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { FileSpreadsheet, Download, FileText, CheckCircle2, DollarSign } from 'lucide-react';

export const GSTTaxModuleView: React.FC = () => {
  const { invoices, purchases, settings } = usePharmacy();
  const [activeReport, setActiveReport] = useState<'GSTR1' | 'GSTR2' | 'GSTR3B' | 'HSN'>('GSTR3B');

  // Output GST from Sales (GSTR-1)
  const totalTaxableSales = invoices.reduce((sum, i) => sum + (i.subTotal - i.totalDiscount), 0);
  const totalCgstOutput = invoices.reduce((sum, i) => sum + i.totalCgst, 0);
  const totalSgstOutput = invoices.reduce((sum, i) => sum + i.totalSgst, 0);
  const totalGstOutput = totalCgstOutput + totalSgstOutput;

  // Input GST from Purchases (GSTR-2 ITC)
  const totalTaxablePurchases = purchases.reduce((sum, p) => sum + p.subTotal, 0);
  const totalCgstInput = purchases.reduce((sum, p) => sum + p.totalCgst, 0);
  const totalSgstInput = purchases.reduce((sum, p) => sum + p.totalSgst, 0);
  const totalGstInput = totalCgstInput + totalSgstInput;

  // Net Tax Liability (Output - Input)
  const netCgstPayable = Math.max(0, totalCgstOutput - totalCgstInput);
  const netSgstPayable = Math.max(0, totalSgstOutput - totalSgstInput);
  const netTotalPayable = netCgstPayable + netSgstPayable;

  // HSN Breakdown
  const hsnMap: Record<string, { hsn: string; desc: string; totalQty: number; taxableVal: number; cgst: number; sgst: number; totalTax: number }> = {};

  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (!hsnMap[item.hsnCode]) {
        hsnMap[item.hsnCode] = {
          hsn: item.hsnCode,
          desc: 'Medicaments / Pharmaceutical preparations',
          totalQty: 0,
          taxableVal: 0,
          cgst: 0,
          sgst: 0,
          totalTax: 0,
        };
      }
      const itemTaxable = item.rate * item.quantity - item.discountAmount;
      hsnMap[item.hsnCode].totalQty += item.quantity;
      hsnMap[item.hsnCode].taxableVal += itemTaxable;
      hsnMap[item.hsnCode].cgst += item.cgstAmount;
      hsnMap[item.hsnCode].sgst += item.sgstAmount;
      hsnMap[item.hsnCode].totalTax += item.cgstAmount + item.sgstAmount;
    });
  });

  const hsnList = Object.values(hsnMap);

  const handleExportJSON = () => {
    const exportObj = {
      gstin: settings.gstNumber,
      fp: '082026',
      gt: totalTaxableSales,
      cur_gt: totalTaxableSales,
      b2cs: invoices.map((i) => ({
        inv_no: i.invoiceNumber,
        inv_dt: i.invoiceDate,
        val: i.grandTotal,
        txval: i.subTotal - i.totalDiscount,
        camt: i.totalCgst,
        samt: i.totalSgst,
      })),
      hsn: hsnList,
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', jsonStr);
    a.setAttribute('download', `GSTR1_Government_Portal_Export_${settings.gstNumber}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            GST Compliance & Tax Module (GSTIN: {settings.gstNumber})
          </h2>
          <p className="text-xs text-slate-500">
            Generate government-compliant GSTR-1, GSTR-2 ITC, and GSTR-3B tax returns with HSN summaries.
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
        >
          <Download className="h-4 w-4" />
          Export Govt Portal JSON (GSTR-1)
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {(['GSTR3B', 'GSTR1', 'GSTR2', 'HSN'] as const).map((rep) => (
          <button
            key={rep}
            onClick={() => setActiveReport(rep)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeReport === rep
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {rep === 'GSTR3B' && 'GSTR-3B Tax Summary & Net Liability'}
            {rep === 'GSTR1' && 'GSTR-1 Outward Supplies (Sales)'}
            {rep === 'GSTR2' && 'GSTR-2 Inward (Purchase ITC Claims)'}
            {rep === 'HSN' && 'HSN-wise Summary Table'}
          </button>
        ))}
      </div>

      {/* Content based on Report */}
      {activeReport === 'GSTR3B' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-xs font-bold uppercase text-emerald-600">Total Output GST (Sales)</span>
              <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1 font-mono">
                ₹{totalGstOutput.toFixed(2)}
              </div>
              <p className="text-xs text-emerald-600 mt-1">Tax collected on medicines</p>
            </div>

            <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
              <span className="text-xs font-bold uppercase text-blue-600">Total Input Tax Credit (Purchases)</span>
              <div className="text-2xl font-black text-blue-800 dark:text-blue-300 mt-1 font-mono">
                ₹{totalGstInput.toFixed(2)}
              </div>
              <p className="text-xs text-blue-600 mt-1">Eligible ITC claim from bills</p>
            </div>

            <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30">
              <span className="text-xs font-bold uppercase text-purple-600">Net Tax Payable to Govt</span>
              <div className="text-2xl font-black text-purple-800 dark:text-purple-300 mt-1 font-mono">
                ₹{netTotalPayable.toFixed(2)}
              </div>
              <p className="text-xs text-purple-600 mt-1">CGST: ₹{netCgstPayable.toFixed(2)} | SGST: ₹{netSgstPayable.toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-4">
              GSTR-3B Tax Computation Schedule
            </h3>
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="p-2.5">Schedule</th>
                  <th className="p-2.5 text-right">Taxable Value (₹)</th>
                  <th className="p-2.5 text-right">Central Tax (CGST)</th>
                  <th className="p-2.5 text-right">State Tax (SGST)</th>
                  <th className="p-2.5 text-right">Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="p-2.5 font-sans font-bold">3.1 Outward Taxable Supplies (Retail & Wholesale)</td>
                  <td className="p-2.5 text-right">₹{totalTaxableSales.toFixed(2)}</td>
                  <td className="p-2.5 text-right">₹{totalCgstOutput.toFixed(2)}</td>
                  <td className="p-2.5 text-right">₹{totalSgstOutput.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-600">₹{totalGstOutput.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-bold">4.0 Eligible Input Tax Credit (ITC Available)</td>
                  <td className="p-2.5 text-right">₹{totalTaxablePurchases.toFixed(2)}</td>
                  <td className="p-2.5 text-right">₹{totalCgstInput.toFixed(2)}</td>
                  <td className="p-2.5 text-right">₹{totalSgstInput.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-bold text-blue-600">₹{totalGstInput.toFixed(2)}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800 font-bold">
                  <td className="p-2.5 font-sans">5.0 Net Tax Payable in Cash / Electronic Ledger</td>
                  <td className="p-2.5 text-right">-</td>
                  <td className="p-2.5 text-right">₹{netCgstPayable.toFixed(2)}</td>
                  <td className="p-2.5 text-right">₹{netSgstPayable.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-black text-purple-600">₹{netTotalPayable.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReport === 'HSN' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">
            HSN-Wise Summary of Outward Supplies
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-slate-400 uppercase text-[10px]">
                  <th className="p-2.5">HSN Code</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-center">Total Units Sold</th>
                  <th className="p-2.5 text-right">Total Taxable (₹)</th>
                  <th className="p-2.5 text-right">CGST (₹)</th>
                  <th className="p-2.5 text-right">SGST (₹)</th>
                  <th className="p-2.5 text-right">Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {hsnList.map((h, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-mono font-bold text-emerald-600">{h.hsn}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{h.desc}</td>
                    <td className="p-2.5 text-center font-bold font-mono">{h.totalQty}</td>
                    <td className="p-2.5 text-right font-mono font-semibold">₹{h.taxableVal.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono">₹{h.cgst.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono">₹{h.sgst.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₹{h.totalTax.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(activeReport === 'GSTR1' || activeReport === 'GSTR2') && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">
            {activeReport === 'GSTR1' ? 'GSTR-1 Invoices Stream' : 'GSTR-2 Purchase Bills Stream'}
          </h3>
          <p className="text-xs text-slate-500">
            {activeReport === 'GSTR1' ? `${invoices.length} retail & wholesale bills filed` : `${purchases.length} supplier inward GRNs filed`}
          </p>
        </div>
      )}
    </div>
  );
};
