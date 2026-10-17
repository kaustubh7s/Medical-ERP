'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { MembershipSettings, ScheduleType } from '@/types/pharmacy';
import { formatINR } from '@/lib/membershipUtils';
import {
  SlidersHorizontal,
  Save,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Percent,
  History,
  Calculator,
  AlertCircle,
  Tag,
  Layers,
} from 'lucide-react';

export const MembershipSettingsTab: React.FC = () => {
  const { membershipSettings, updateMembershipSettings, currentUser } = usePharmacy();

  // Local Form State
  const [idPrefix, setIdPrefix] = useState(membershipSettings.idPrefix);
  const [nextNumber, setNextNumber] = useState(membershipSettings.nextNumber);
  const [defaultDurationMonths, setDefaultDurationMonths] = useState(membershipSettings.defaultDurationMonths);
  const [qualificationPeriodMonths, setQualificationPeriodMonths] = useState(membershipSettings.qualificationPeriodMonths);
  const [purchaseThreshold, setPurchaseThreshold] = useState(membershipSettings.purchaseThreshold);
  const [lowerTierDiscountPercent, setLowerTierDiscountPercent] = useState(membershipSettings.lowerTierDiscountPercent);
  const [higherTierDiscountPercent, setHigherTierDiscountPercent] = useState(membershipSettings.higherTierDiscountPercent);
  const [allowDiscountStacking, setAllowDiscountStacking] = useState(membershipSettings.allowDiscountStacking);
  const [expiryAlertDaysWarning, setExpiryAlertDaysWarning] = useState(membershipSettings.expiryAlertDaysWarning);
  const [expiryAlertDaysUrgent, setExpiryAlertDaysUrgent] = useState(membershipSettings.expiryAlertDaysUrgent);
  const [autoDeactivateOnExpiry, setAutoDeactivateOnExpiry] = useState(membershipSettings.autoDeactivateOnExpiry);

  // Excluded categories and schedule types
  const [excludedCategoriesText, setExcludedCategoriesText] = useState(
    (membershipSettings.excludedCategories || []).join(', ')
  );
  const [excludedSchedules, setExcludedSchedules] = useState<ScheduleType[]>(
    membershipSettings.excludedScheduleTypes || ['NARCOTIC', 'SCHEDULE_X']
  );

  // Interactive Live Policy Simulator
  const [testAmount, setTestAmount] = useState<string>('3000');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Simulation calculations
  const parsedTest = parseFloat(testAmount) || 0;
  const simulatedTier = parsedTest >= purchaseThreshold ? `${higherTierDiscountPercent}% Tier` : `${lowerTierDiscountPercent}% Tier`;
  const simulatedDiscountPercent = parsedTest >= purchaseThreshold ? higherTierDiscountPercent : lowerTierDiscountPercent;
  const simulatedDiscountAmount = (parsedTest * simulatedDiscountPercent) / 100;
  const simulatedNetAmount = parsedTest - simulatedDiscountAmount;

  const toggleSchedule = (sched: ScheduleType) => {
    if (excludedSchedules.includes(sched)) {
      setExcludedSchedules(excludedSchedules.filter((s) => s !== sched));
    } else {
      setExcludedSchedules([...excludedSchedules, sched]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const categoriesList = excludedCategoriesText
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const updates: Partial<MembershipSettings> = {
      idPrefix: idPrefix.toUpperCase(),
      nextNumber: parseInt(String(nextNumber)) || 1001,
      defaultDurationMonths,
      qualificationPeriodMonths,
      purchaseThreshold: parseFloat(String(purchaseThreshold)) || 3000,
      lowerTierDiscountPercent: parseFloat(String(lowerTierDiscountPercent)) || 10,
      higherTierDiscountPercent: parseFloat(String(higherTierDiscountPercent)) || 20,
      allowDiscountStacking,
      expiryAlertDaysWarning: parseInt(String(expiryAlertDaysWarning)) || 30,
      expiryAlertDaysUrgent: parseInt(String(expiryAlertDaysUrgent)) || 7,
      autoDeactivateOnExpiry,
      excludedCategories: categoriesList,
      excludedScheduleTypes: excludedSchedules,
    };

    updateMembershipSettings(updates);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset membership configuration back to factory standard defaults (10% / 20% tiers, ₹3,000 threshold)?')) {
      setIdPrefix('MEM');
      setDefaultDurationMonths(12);
      setQualificationPeriodMonths(3);
      setPurchaseThreshold(3000);
      setLowerTierDiscountPercent(10);
      setHigherTierDiscountPercent(20);
      setAllowDiscountStacking(false);
      setExpiryAlertDaysWarning(30);
      setExpiryAlertDaysUrgent(7);
      setAutoDeactivateOnExpiry(true);
      setExcludedCategoriesText('Schedule X Narcotics, High Value Implants');
      setExcludedSchedules(['NARCOTIC', 'SCHEDULE_X']);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
            Membership Policy &amp; Discount Configuration
          </h2>
          <p className="text-xs text-slate-500">
            Configure rolling evaluation periods, discount thresholds, stacking rules, and automated expiry alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 animate-pulse">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Settings Updated
            </span>
          )}
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Configuration Columns (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* 1. Identification & Duration */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-emerald-600" />
                1. Membership ID &amp; Duration Rules
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ID Prefix
                  </label>
                  <input
                    type="text"
                    value={idPrefix}
                    onChange={(e) => setIdPrefix(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">e.g. MEM-2026-0001</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Next Sequence Number
                  </label>
                  <input
                    type="number"
                    value={nextNumber}
                    onChange={(e) => setNextNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Auto-incrementing</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Default Duration
                  </label>
                  <select
                    value={defaultDurationMonths}
                    onChange={(e) => setDefaultDurationMonths(parseInt(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months (Recommended)</option>
                  </select>
                  <span className="text-[10px] text-slate-400">Preset selection</span>
                </div>
              </div>
            </div>

            {/* 2. Rolling Purchase & Discount Tier Rules */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-emerald-600" />
                2. Rolling Purchase &amp; Discount Tier Rules
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Qualification Period
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={qualificationPeriodMonths}
                      onChange={(e) => setQualificationPeriodMonths(parseInt(e.target.value) || 3)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                    />
                    <span className="text-xs text-slate-500 shrink-0">Months</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Preceding 3 months</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Threshold (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={purchaseThreshold}
                    onChange={(e) => setPurchaseThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Exactly ₹3,000 qualifies for top tier</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lower Tier Discount (%)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={lowerTierDiscountPercent}
                      onChange={(e) => setLowerTierDiscountPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                    />
                    <span className="text-xs text-slate-500 shrink-0">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400">For purchases &lt; threshold</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Higher Tier Discount (%)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={higherTierDiscountPercent}
                      onChange={(e) => setHigherTierDiscountPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-purple-600 dark:text-purple-400"
                    />
                    <span className="text-xs text-slate-500 shrink-0">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400">For purchases ≥ threshold</span>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={allowDiscountStacking}
                      onChange={(e) => setAllowDiscountStacking(e.target.checked)}
                      className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Allow Discount Stacking
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400 ml-6">
                    If unchecked, prevents stacking membership discounts with manual bill discounts
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Exclusions & Product Categories */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-600" />
                3. Excluded Schedules &amp; Categories
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Excluded Regulatory Drug Schedules (Zero Membership Discount)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['SCHEDULE_H', 'SCHEDULE_H1', 'SCHEDULE_X', 'NARCOTIC'] as ScheduleType[]).map((sched) => (
                      <button
                        type="button"
                        key={sched}
                        onClick={() => toggleSchedule(sched)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                          excludedSchedules.includes(sched)
                            ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {sched.replace('_', ' ')} {excludedSchedules.includes(sched) ? '✓ Excluded' : ''}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Narcotics and Schedule X medicines should not receive retail promotional discounts per statutory norms.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Excluded Product Category Names (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={excludedCategoriesText}
                    onChange={(e) => setExcludedCategoriesText(e.target.value)}
                    placeholder="e.g. High Value Implants, Surgical Equipment"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 4. Expiry Alert Periods */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                4. Expiry Alerts &amp; Automation
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Warning Alert Window
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={expiryAlertDaysWarning}
                      onChange={(e) => setExpiryAlertDaysWarning(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                    />
                    <span className="text-xs text-slate-500 shrink-0">Days</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Default 30 days</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Urgent Alert Window
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={expiryAlertDaysUrgent}
                      onChange={(e) => setExpiryAlertDaysUrgent(parseInt(e.target.value) || 7)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-rose-600"
                    />
                    <span className="text-xs text-slate-500 shrink-0">Days</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Default 7 days</span>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={autoDeactivateOnExpiry}
                      onChange={(e) => setAutoDeactivateOnExpiry(e.target.checked)}
                      className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Auto-Pause Discounts
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400 ml-6">
                    Disallow discount immediately once expiry date passes
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Policy Simulator & Audit Trail (1 Col) */}
          <div className="space-y-4">
            {/* Live Policy Simulator Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-emerald-600" />
                Live Policy Simulator
              </h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                Test how a customer's rolling 3-month net purchases evaluate under your configured rules:
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Test Rolling 3-Mo Purchases (₹)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="e.g. 1500, 3000, 5000"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-black text-sm"
                  />
                </div>
              </div>

              {/* Simulation Result Box */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Evaluated Tier:</span>
                  <span className={`font-bold ${parsedTest >= purchaseThreshold ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {simulatedTier}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicable Discount:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{simulatedDiscountPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Discount on ₹1,000 Bill:</span>
                  <span className="font-bold text-emerald-600">-₹{(1000 * simulatedDiscountPercent) / 100}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-sans">
                  {parsedTest >= purchaseThreshold ? (
                    <span className="text-purple-700 dark:text-purple-300 font-semibold block">
                      ✓ ₹{parsedTest.toLocaleString('en-IN')} meets or exceeds threshold of ₹{purchaseThreshold.toLocaleString('en-IN')}. Eligible for {higherTierDiscountPercent}% elite discount.
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400 block">
                      Needs <strong>₹{(purchaseThreshold - parsedTest).toLocaleString('en-IN')}</strong> more eligible purchases to qualify for {higherTierDiscountPercent}%.
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTestAmount('1500')}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100"
                >
                  ₹1,500 (10%)
                </button>
                <button
                  type="button"
                  onClick={() => setTestAmount('2999')}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100"
                >
                  ₹2,999 (10%)
                </button>
                <button
                  type="button"
                  onClick={() => setTestAmount('3000')}
                  className="px-2 py-1 rounded border border-purple-200 dark:border-purple-800 bg-purple-50 text-purple-700 dark:bg-purple-950/40 hover:bg-purple-100"
                >
                  ₹3,000 (20%)
                </button>
                <button
                  type="button"
                  onClick={() => setTestAmount('5000')}
                  className="px-2 py-1 rounded border border-purple-200 dark:border-purple-800 bg-purple-50 text-purple-700 dark:bg-purple-950/40 hover:bg-purple-100"
                >
                  ₹5,000 (20%)
                </button>
              </div>
            </div>

            {/* Audit Trail Log of Changes */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <History className="h-4 w-4 text-slate-500" />
                Settings Audit Trail
              </h3>
              <p className="text-[10px] text-slate-400">
                Last modified: {membershipSettings.lastUpdated} by {membershipSettings.updatedBy}
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[160px] overflow-y-auto text-xs">
                {(membershipSettings.auditLog || []).map((log, idx) => (
                  <div key={idx} className="py-2 text-[11px]">
                    <div className="flex justify-between text-slate-400 font-mono text-[10px]">
                      <span>{log.date}</span>
                      <span className="font-sans font-bold text-slate-600 dark:text-slate-300">{log.updatedBy}</span>
                    </div>
                    <p className="mt-0.5 text-slate-700 dark:text-slate-300">{log.changes}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Membership Policy Configuration
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
