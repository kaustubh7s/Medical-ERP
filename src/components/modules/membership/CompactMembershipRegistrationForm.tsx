'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePharmacy } from '@/lib/store';
import {
  PaymentMode,
  PendingMembershipRegistration,
  Membership,
} from '@/types/pharmacy';
import { calculateExpiryDate, formatINR } from '@/lib/membershipUtils';
import {
  Crown,
  User,
  Phone,
  Calendar,
  IndianRupee,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Plus,
} from 'lucide-react';

export interface CompactMembershipRegistrationFormProps {
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  onSuccessAdded?: (pendingReg: PendingMembershipRegistration) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

interface StandardPlan {
  id: string;
  name: string;
  durationMonths: number;
  durationLabel: string;
  fee: number;
  popular?: boolean;
}

const STANDARD_PLANS: StandardPlan[] = [
  { id: 'monthly', name: 'Monthly', durationMonths: 1, durationLabel: '1 Month', fee: 29 },
  { id: 'quarterly', name: 'Quarterly', durationMonths: 3, durationLabel: '3 Months', fee: 59 },
  { id: 'half-yearly', name: 'Half-Yearly', durationMonths: 6, durationLabel: '6 Months', fee: 99 },
  { id: 'annual', name: 'Annual', durationMonths: 12, durationLabel: '12 Months', fee: 149, popular: true },
];

export const CompactMembershipRegistrationForm: React.FC<CompactMembershipRegistrationFormProps> = ({
  initialCustomerName = '',
  initialCustomerPhone = '',
  onSuccessAdded,
  onCancel,
  isModal = false,
}) => {
  const {
    customers,
    memberships,
    membershipSettings,
    pendingMemberships,
    createPendingMembership,
    addMembershipToCartAndNavigate,
    currentUser,
    logAudit,
  } = usePharmacy();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form State
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone.replace(/\D/g, '').slice(0, 10));
  const [startDate, setStartDate] = useState(todayStr);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('annual');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [notes] = useState('');

  // Custom Plan authorized controls
  const [showCustomPlan, setShowCustomPlan] = useState(false);
  const [customMonths, setCustomMonths] = useState<number>(12);
  const [customFee, setCustomFee] = useState<number>(149);

  // Renewal Mode
  const [isRenewalMode, setIsRenewalMode] = useState(false);
  const [targetExistingMember, setTargetExistingMember] = useState<Membership | null>(null);

  // Validation & Error states
  const [formError, setFormError] = useState<string>('');

  // Auto-fill from initial props
  useEffect(() => {
    if (initialCustomerName && !customerName) {
      setCustomerName(initialCustomerName);
    }
    if (initialCustomerPhone && !customerPhone) {
      setCustomerPhone(initialCustomerPhone.replace(/\D/g, '').slice(0, 10));
    }
  }, [initialCustomerName, initialCustomerPhone]);

  // Lookup existing customer & active membership by phone
  const cleanPhone = customerPhone.replace(/\D/g, '');
  const existingCustomer = useMemo(() => {
    if (cleanPhone.length < 10) return null;
    return customers.find((c) => c.phone.replace(/\D/g, '') === cleanPhone) || null;
  }, [cleanPhone, customers]);

  const existingMember = useMemo(() => {
    if (cleanPhone.length < 10) return null;
    return memberships.find((m) => m.customerPhone.replace(/\D/g, '') === cleanPhone) || null;
  }, [cleanPhone, memberships]);

  // Auto-populate customer name if existing customer found
  useEffect(() => {
    if (existingCustomer && !customerName) {
      setCustomerName(existingCustomer.name);
    }
  }, [existingCustomer, customerName]);

  // Selected plan calculation
  const selectedPlan = useMemo(() => {
    if (selectedPlanId === 'custom') {
      const months = Math.max(1, customMonths || 1);
      return {
        id: 'custom',
        name: 'Custom Plan',
        durationMonths: months,
        durationLabel: `${months} Month${months > 1 ? 's' : ''}`,
        fee: Math.max(0, customFee || 0),
      };
    }
    return STANDARD_PLANS.find((p) => p.id === selectedPlanId) || STANDARD_PLANS[3];
  }, [selectedPlanId, customMonths, customFee]);

  // Automatic calendar-month expiry calculation (read-only)
  const calculatedExpiry = useMemo(() => {
    return calculateExpiryDate(startDate, selectedPlan.durationMonths);
  }, [startDate, selectedPlan.durationMonths]);

  // Preview Member ID
  const previewMemberId = useMemo(() => {
    if (isRenewalMode && targetExistingMember) {
      return targetExistingMember.membershipId;
    }
    const year = new Date().getFullYear();
    const count = memberships.length + pendingMemberships.filter((p) => !p.isRenewal).length + 1;
    return `${membershipSettings.idPrefix || 'MEM'}-${year}-${String(count).padStart(4, '0')}`;
  }, [isRenewalMode, targetExistingMember, memberships.length, pendingMemberships, membershipSettings.idPrefix]);

  // Handle plan select
  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setShowCustomPlan(planId === 'custom');
    setFormError('');
  };

  // Switch to Renewal Mode
  const handleActivateRenewal = (member: Membership) => {
    setIsRenewalMode(true);
    setTargetExistingMember(member);
    setCustomerName(member.customerName);
    // If current membership is still unexpired, start renewal from expiry date
    if (member.expiryDate >= todayStr && member.status !== 'EXPIRED') {
      setStartDate(member.expiryDate);
    } else {
      setStartDate(todayStr);
    }
    setFormError('');
  };

  const handleCancelRenewal = () => {
    setIsRenewalMode(false);
    setTargetExistingMember(null);
    setStartDate(todayStr);
  };

  // Submit: Add Membership to Bill
  const handleAddToBill = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setFormError('Please enter customer full name.');
      return;
    }

    if (cleanPhone.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Duplicate check if not in renewal mode
    if (existingMember && !isRenewalMode) {
      setFormError(
        `Customer already holds an active membership (${existingMember.membershipId}, valid until ${existingMember.expiryDate}). Please click "Renew Membership" below.`
      );
      return;
    }

    // Custom plan audit logging
    if (selectedPlanId === 'custom') {
      if (customFee < 10) {
        setFormError('Custom fee must be at least ₹10.');
        return;
      }
      logAudit(
        'CREATE',
        'Membership Settings',
        `Admin override: Custom membership duration (${selectedPlan.durationLabel}) for ₹${selectedPlan.fee} created by ${currentUser?.name || 'Cashier'}`
      );
    }

    // 1. Create Pending Membership Registration
    const pendingReg = createPendingMembership({
      customerId: existingCustomer?.id,
      customerName: trimmedName,
      customerPhone: cleanPhone,
      customerEmail: existingCustomer?.email,
      customerAddress: existingCustomer?.address,
      planName: selectedPlan.name,
      durationMonths: selectedPlan.durationMonths,
      durationLabel: selectedPlan.durationLabel,
      fee: selectedPlan.fee,
      paymentMode,
      startDate,
      expiryDate: calculatedExpiry,
      notes: notes.trim() || undefined,
      isRenewal: isRenewalMode,
      renewingMembershipId: isRenewalMode && targetExistingMember ? targetExistingMember.membershipId : undefined,
    });

    // 2. Add to POS Bill and navigate
    addMembershipToCartAndNavigate(pendingReg);

    if (onSuccessAdded) {
      onSuccessAdded(pendingReg);
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${isModal ? 'p-4' : 'p-4 sm:p-5'}`}>
      {/* 1. Header Row */}
      <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
            <Crown className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{isRenewalMode ? 'Renew Customer Membership' : 'Register Membership'}</span>
              {isRenewalMode && (
                <span className="px-2 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px] uppercase font-mono">
                  Renewal Mode
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500">
              Paid customer membership • Rolling 10%/20% loyalty benefits
            </p>
          </div>
        </div>

        {/* Member ID Badge */}
        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
          <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold">Member ID:</span>
          <span className="font-mono font-bold text-xs text-emerald-900 dark:text-emerald-200 tracking-wider">
            {previewMemberId}
          </span>
        </div>
      </div>

      {/* Existing Member Alert Banner (Duplicate Prevention & Renewal offer) */}
      {existingMember && !isRenewalMode && (
        <div className="mb-3.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <span>
                <strong>{existingMember.customerName}</strong> already holds Active Membership{' '}
                <strong className="font-mono">{existingMember.membershipId}</strong> (Expires:{' '}
                <strong>{existingMember.expiryDate}</strong>).
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleActivateRenewal(existingMember)}
            className="px-2.5 py-1 rounded-md bg-amber-700 hover:bg-amber-800 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 transition-colors shadow-xs"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Renew Membership</span>
          </button>
        </div>
      )}

      {/* Renewal Active Notification Banner */}
      {isRenewalMode && targetExistingMember && (
        <div className="mb-3.5 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Renewing <strong>{targetExistingMember.customerName}</strong> ({targetExistingMember.membershipId}).
              New term extends from current expiry <strong>{startDate}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={handleCancelRenewal}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
          >
            Cancel Renewal
          </button>
        </div>
      )}

      {/* Validation Error */}
      {formError && (
        <div className="mb-3 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleAddToBill} className="space-y-3.5 text-xs">
        {/* 2. Customer Details — Two-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Customer Name */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh Patil"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Mobile Number (10 Digits) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="tel"
                required
                maxLength={10}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Expiry Date (Read-Only) */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Expiry Date <span className="text-slate-400 font-normal">(Auto-calculated)</span>
            </label>
            <div className="px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 flex items-center justify-between font-mono">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                {calculatedExpiry}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans font-bold">
                {selectedPlan.durationLabel}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Membership Plans — Compact Selectable Cards */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Select Membership Plan
            </span>
            <button
              type="button"
              onClick={() => {
                const nextState = !showCustomPlan;
                setShowCustomPlan(nextState);
                if (nextState) setSelectedPlanId('custom');
                else setSelectedPlanId('annual');
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
            >
              <Sliders className="h-3 w-3" />
              <span>{showCustomPlan ? 'Standard Plans' : 'Custom Duration'}</span>
            </button>
          </div>

          {!showCustomPlan ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STANDARD_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wide">
                        Best Value
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-xs ${isSelected ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {plan.name}
                      </span>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-500">{plan.durationLabel}</span>
                      <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
                        {formatINR(plan.fee, false)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Custom Plan Controls */
            <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
              <div>
                <label className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
                  Custom Duration (Months)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={customMonths}
                  onChange={(e) => setCustomMonths(parseInt(e.target.value) || 1)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
                  Custom Fee (₹)
                </label>
                <input
                  type="number"
                  min={10}
                  value={customFee}
                  onChange={(e) => setCustomFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 font-mono font-bold text-emerald-700"
                />
              </div>
              <div className="text-[11px] text-amber-800 dark:text-amber-300 pb-1.5">
                <span>Calculated Term: <strong>{customMonths} Months</strong> @ <strong>₹{customFee}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Payment Details — Compact Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 items-center">
          {/* Read-Only Fee Field */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5 text-[11px]">
              Membership Fee <span className="text-slate-400 font-normal">(Read-only)</span>
            </label>
            <div className="flex items-center gap-1 font-mono font-black text-sm text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700">
              <IndianRupee className="h-3.5 w-3.5 text-slate-400" />
              <span>{selectedPlan.fee.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5 text-[11px]">
              Payment Tender Mode
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { mode: 'UPI', label: 'UPI/QR', icon: QrCode },
                { mode: 'CASH', label: 'Cash', icon: Banknote },
                { mode: 'CARD', label: 'Card/POS', icon: CreditCard },
              ].map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => setPaymentMode(m.mode as PaymentMode)}
                  className={`py-1.5 px-1 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                    paymentMode === m.mode
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 border-slate-900 dark:border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <m.icon className="h-3 w-3" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Order Summary Box */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200">
            <div className="flex justify-between font-bold">
              <span>{selectedPlan.name} ({selectedPlan.durationLabel}):</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-300">
                {formatINR(selectedPlan.fee)}
              </span>
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
              Bill Total: <strong>₹{selectedPlan.fee}</strong> will be added to cart.
            </div>
          </div>
        </div>

        {/* 5. Footer Action Row */}
        <div className="flex items-center justify-between pt-1">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
          ) : (
            <div className="text-[11px] text-slate-400">
              * Activated strictly after confirmed payment in POS invoice.
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>{isRenewalMode ? 'Add Renewal to Bill' : 'Add Membership to Bill'} ({formatINR(selectedPlan.fee, false)})</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
