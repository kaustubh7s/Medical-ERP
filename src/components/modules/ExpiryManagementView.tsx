'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { Medicine, Batch } from '@/types/pharmacy';
import { Badge } from '@/components/common/Badge';
import {
  Clock,
  AlertTriangle,
  AlertOctagon,
  Percent,
  Undo2,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface ExpiryItem {
  medicine: Medicine;
  batch: Batch;
  daysRemaining: number;
  tier: 'EXPIRED' | '30_DAYS' | '60_DAYS' | '90_DAYS' | '180_DAYS';
}

export const ExpiryManagementView: React.FC = () => {
  const { medicines, applyNearExpiryDiscount, setActiveTab } = usePharmacy();
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [discountPct, setDiscountPct] = useState<number>(30);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const today = new Date();

  const allExpiryItems: ExpiryItem[] = [];

  medicines.forEach((med) => {
    med.batches.forEach((b) => {
      if (b.availableQuantity <= 0) return;
      const exp = new Date(b.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let tier: ExpiryItem['tier'] = '180_DAYS';
      if (diffDays <= 0) tier = 'EXPIRED';
      else if (diffDays <= 30) tier = '30_DAYS';
      else if (diffDays <= 60) tier = '60_DAYS';
      else if (diffDays <= 90) tier = '90_DAYS';
      else if (diffDays <= 180) tier = '180_DAYS';
      else return; // Beyond 180 days is safe

      allExpiryItems.push({
        medicine: med,
        batch: b,
        daysRemaining: diffDays,
        tier,
      });
    });
  });

  allExpiryItems.sort((a, b) => a.daysRemaining - b.daysRemaining);

  const filtered = allExpiryItems.filter((item) => {
    if (selectedTier === 'ALL') return true;
    return item.tier === selectedTier;
  });

  const expiredCount = allExpiryItems.filter((i) => i.tier === 'EXPIRED').length;
  const under30Count = allExpiryItems.filter((i) => i.tier === '30_DAYS').length;
  const under90Count = allExpiryItems.filter((i) => i.tier === '60_DAYS' || i.tier === '90_DAYS').length;

  const handleApplyDiscount = (medicineId: string, batchId: string, disc: number) => {
    applyNearExpiryDiscount(medicineId, batchId, disc);
    setSuccessToast(`Applied ${disc}% clearance discount successfully! Rate updated on POS.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Expiry & Near-Expiry Radar Module
          </h2>
          <p className="text-xs text-slate-500">
            Categorized multi-tier alerts for medicines nearing expiry. Liquidate stock with clearance discounts or file distributor debit note claims.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('purchase-returns')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all"
        >
          <Undo2 className="h-4 w-4" />
          Supplier Expiry Claim (Debit Note)
        </button>
      </div>

      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          {successToast}
        </div>
      )}

      {/* Tier Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setSelectedTier('ALL')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            selectedTier === 'ALL'
              ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block opacity-70">All Alerts</span>
          <span className="text-xl font-black">{allExpiryItems.length}</span>
        </button>

        <button
          onClick={() => setSelectedTier('EXPIRED')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            selectedTier === 'EXPIRED'
              ? 'border-rose-600 bg-rose-600 text-white shadow-md'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block opacity-80">Expired Stock</span>
          <span className="text-xl font-black">{expiredCount}</span>
        </button>

        <button
          onClick={() => setSelectedTier('30_DAYS')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            selectedTier === '30_DAYS'
              ? 'border-amber-600 bg-amber-600 text-white shadow-md'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block opacity-80">Critical (≤30 Days)</span>
          <span className="text-xl font-black">{under30Count}</span>
        </button>

        <button
          onClick={() => setSelectedTier('60_DAYS')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            selectedTier === '60_DAYS'
              ? 'border-yellow-600 bg-yellow-600 text-white shadow-md'
              : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block opacity-80">Near (≤60 Days)</span>
          <span className="text-xl font-black">
            {allExpiryItems.filter((i) => i.tier === '60_DAYS').length}
          </span>
        </button>

        <button
          onClick={() => setSelectedTier('90_DAYS')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            selectedTier === '90_DAYS'
              ? 'border-blue-600 bg-blue-600 text-white shadow-md'
              : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block opacity-80">Warning (≤90 Days)</span>
          <span className="text-xl font-black">
            {allExpiryItems.filter((i) => i.tier === '90_DAYS').length}
          </span>
        </button>
      </div>

      {/* Expiry Items List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="p-3">Medicine & Salt</th>
                <th className="p-3">Batch & Rack</th>
                <th className="p-3 text-center">Expiry Date</th>
                <th className="p-3 text-center">Days Remaining</th>
                <th className="p-3 text-center">Stock Qty</th>
                <th className="p-3 text-right">Cost vs MRP</th>
                <th className="p-3 text-right">Stock Valuation</th>
                <th className="p-3 text-center">Clearance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    No medicines matching selected expiry alert tier.
                  </td>
                </tr>
              ) : (
                filtered.map(({ medicine, batch, daysRemaining, tier }) => {
                  const isExp = tier === 'EXPIRED';
                  const isCritical = tier === '30_DAYS';
                  const totalBatchValue = batch.availableQuantity * batch.purchaseRate;

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                        isExp ? 'bg-rose-500/5' : isCritical ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="p-3">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{medicine.name}</p>
                        <p className="text-[10px] text-slate-500">{medicine.genericName}</p>
                      </td>

                      <td className="p-3">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{batch.batchNumber}</span>
                        <p className="text-[10px] text-slate-400">📍 {batch.rackLocation}</p>
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {batch.expiryDate}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            isExp
                              ? 'bg-rose-600 text-white animate-pulse'
                              : isCritical
                              ? 'bg-rose-500/20 text-rose-600 font-black'
                              : 'bg-amber-500/20 text-amber-600'
                          }`}
                        >
                          {daysRemaining <= 0 ? 'EXPIRED' : `${daysRemaining} days left`}
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono font-black text-slate-900 dark:text-slate-100">
                        {batch.availableQuantity} units
                      </td>

                      <td className="p-3 text-right font-mono text-[11px]">
                        <div>MRP: ₹{batch.mrp.toFixed(2)}</div>
                        <div className="text-slate-500">Cost: ₹{batch.purchaseRate.toFixed(2)}</div>
                        {batch.saleRate < batch.mrp && (
                          <div className="text-emerald-600 font-bold">Promo: ₹{batch.saleRate.toFixed(2)}</div>
                        )}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{totalBatchValue.toFixed(2)}
                      </td>

                      <td className="p-3 text-center">
                        {isExp ? (
                          <button
                            onClick={() => setActiveTab('purchase-returns')}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold"
                          >
                            Return to Supplier
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleApplyDiscount(medicine.id, batch.id, 25)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                            >
                              -25%
                            </button>
                            <button
                              onClick={() => handleApplyDiscount(medicine.id, batch.id, 40)}
                              className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold"
                            >
                              -40%
                            </button>
                          </div>
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
    </div>
  );
};
