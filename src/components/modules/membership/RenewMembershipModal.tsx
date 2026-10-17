'use client';

import React, { useState, useEffect } from 'react';
import { Membership, PaymentMode } from '@/types/pharmacy';
import { usePharmacy } from '@/lib/store';
import { Modal } from '@/components/common/Modal';
import { calculateExpiryDate, formatINR, getMembershipExpiryInfo } from '@/lib/membershipUtils';
import { RotateCcw, Calendar, CheckCircle2, Clock, IndianRupee, CreditCard, Banknote, QrCode } from 'lucide-react';

interface RenewMembershipModalProps {
  member: Membership | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RenewMembershipModal: React.FC<RenewMembershipModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  const { renewMembership, membershipSettings } = usePharmacy();
  const [selectedDuration, setSelectedDuration] = useState<number>(12);
  const [customMonths, setCustomMonths] = useState<string>('12');
  const [feePaid, setFeePaid] = useState<number>(149);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [startRule, setStartRule] = useState<'EXTEND' | 'TODAY'>('EXTEND');
  const [notes, setNotes] = useState<string>('');
  const [previewExpiry, setPreviewExpiry] = useState<string>('');

  useEffect(() => {
    if (!member) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const isPast = member.expiryDate < todayStr;
    const effectiveStartRule = isPast ? 'TODAY' : 'EXTEND';
    setStartRule(effectiveStartRule);

    const baseDate = effectiveStartRule === 'EXTEND' && !isPast ? member.expiryDate : todayStr;
    const months = selectedDuration === -1 ? (parseInt(customMonths) || 1) : selectedDuration;
    setPreviewExpiry(calculateExpiryDate(baseDate, months));
  }, [member, selectedDuration, customMonths, startRule]);

  if (!member) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const isExpired = member.expiryDate < todayStr;
  const expiryInfo = getMembershipExpiryInfo(member, membershipSettings);

  const handleDurationSelect = (months: number, price?: number) => {
    setSelectedDuration(months);
    if (price !== undefined) {
      setFeePaid(price);
    }
    const baseDate = startRule === 'EXTEND' && !isExpired ? member.expiryDate : todayStr;
    const effMonths = months === -1 ? (parseInt(customMonths) || 1) : months;
    setPreviewExpiry(calculateExpiryDate(baseDate, effMonths));
  };

  const handleStartRuleChange = (rule: 'EXTEND' | 'TODAY') => {
    setStartRule(rule);
    const baseDate = rule === 'EXTEND' && !isExpired ? member.expiryDate : todayStr;
    const effMonths = selectedDuration === -1 ? (parseInt(customMonths) || 1) : selectedDuration;
    setPreviewExpiry(calculateExpiryDate(baseDate, effMonths));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effMonths = selectedDuration === -1 ? (parseInt(customMonths) || 1) : selectedDuration;
    renewMembership(member.id, effMonths, notes, feePaid, paymentMode);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Renew Customer Membership"
      subtitle={`Extend membership privileges for ${member.customerName} (${member.membershipId})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Status Box */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Current Membership Status:</span>
            <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {expiryInfo.statusLabel}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono">
            <span className="text-slate-500">Current Expiry: {member.expiryDate}</span>
            <span className="text-slate-500">{expiryInfo.daysRemaining} days left</span>
          </div>
        </div>

        {/* Start Date Rule */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Renewal Start Date Rule
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleStartRuleChange('EXTEND')}
              disabled={isExpired}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                startRule === 'EXTEND' && !isExpired
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              } ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="block font-semibold">Extend From Current Expiry</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Continuous seamless coverage</span>
            </button>

            <button
              type="button"
              onClick={() => handleStartRuleChange('TODAY')}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                startRule === 'TODAY'
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <span className="block font-semibold">Start Fresh From Today</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Reset counter as of {todayStr}</span>
            </button>
          </div>
        </div>

        {/* Renewal Duration Choice */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Select Renewal Duration
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {membershipSettings.availableDurations.map((opt) => (
              <button
                type="button"
                key={opt.months}
                onClick={() => handleDurationSelect(opt.months, opt.price)}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                  selectedDuration === opt.months
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>{opt.label}</div>
                <div className={`text-[10px] ${selectedDuration === opt.months ? 'text-emerald-100' : 'text-emerald-600 font-extrabold'}`}>
                  ₹{opt.price ?? (opt.months === 12 ? 149 : opt.months === 6 ? 99 : opt.months === 3 ? 59 : 29)}
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleDurationSelect(-1)}
              className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                selectedDuration === -1
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>Custom</div>
              <div className={`text-[10px] ${selectedDuration === -1 ? 'text-emerald-100' : 'text-slate-400'}`}>Months</div>
            </button>
          </div>

          {selectedDuration === -1 && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="60"
                value={customMonths}
                onChange={(e) => {
                  setCustomMonths(e.target.value);
                  const effMonths = parseInt(e.target.value) || 1;
                  const baseDate = startRule === 'EXTEND' && !isExpired ? member.expiryDate : todayStr;
                  setPreviewExpiry(calculateExpiryDate(baseDate, effMonths));
                }}
                className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                placeholder="Months"
              />
              <span className="text-xs text-slate-500">months duration</span>
            </div>
          )}
        </div>

        {/* Paid Fee & Payment Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Renewal Fee (₹)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs font-bold text-slate-500">₹</span>
              <input
                type="number"
                min="0"
                value={feePaid}
                onChange={(e) => setFeePaid(parseFloat(e.target.value) || 0)}
                className="w-full pl-6 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Paid renewal collected from customer</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['UPI', 'CASH', 'CARD'] as PaymentMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold text-center transition-all ${
                    paymentMode === mode
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calculated Expiry Date Preview */}
        <div className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">
              New Calculated Expiry Date:
            </span>
          </div>
          <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
            {previewExpiry}
          </span>
        </div>

        {/* Renewal Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Renewal Notes / Payment Ref (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid ₹500 annual membership fee via UPI Ref 92837482"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm & Renew Membership
          </button>
        </div>
      </form>
    </Modal>
  );
};
