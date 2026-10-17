'use client';

import React, { useState } from 'react';
import { Membership } from '@/types/pharmacy';
import { usePharmacy } from '@/lib/store';
import { Modal } from '@/components/common/Modal';
import { calculateExpiryDate } from '@/lib/membershipUtils';
import { PlusCircle, Clock, CheckCircle2 } from 'lucide-react';

interface ExtendMembershipModalProps {
  member: Membership | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExtendMembershipModal: React.FC<ExtendMembershipModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  const { extendMembership } = usePharmacy();
  const [daysToAdd, setDaysToAdd] = useState<number>(15);
  const [customDays, setCustomDays] = useState<string>('15');
  const [notes, setNotes] = useState<string>('');

  if (!member) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const baseDate = member.expiryDate >= todayStr ? member.expiryDate : todayStr;
  const effectiveDays = daysToAdd === -1 ? (parseInt(customDays) || 1) : daysToAdd;
  const newCalculatedDate = calculateExpiryDate(baseDate, 0, effectiveDays);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    extendMembership(member.id, effectiveDays, notes || `Complimentary extension of ${effectiveDays} days.`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Extend Membership Days"
      subtitle={`Grant courtesy extension for ${member.customerName} (${member.membershipId})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info */}
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Current Expiry Date:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{member.expiryDate}</span>
          </div>
        </div>

        {/* Preset Days */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Select Extension Period
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[7, 15, 30].map((days) => (
              <button
                type="button"
                key={days}
                onClick={() => setDaysToAdd(days)}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                  daysToAdd === days
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                +{days} Days
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDaysToAdd(-1)}
              className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                daysToAdd === -1
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              Custom
            </button>
          </div>

          {daysToAdd === -1 && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                placeholder="Days"
              />
              <span className="text-xs text-slate-500">additional days</span>
            </div>
          )}
        </div>

        {/* Calculated Preview */}
        <div className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">
              New Expiry Date:
            </span>
          </div>
          <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
            {newCalculatedDate}
          </span>
        </div>

        {/* Reason / Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Reason for Extension (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Courtesy extension for chronic patient awaiting stock"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save Extension
          </button>
        </div>
      </form>
    </Modal>
  );
};
