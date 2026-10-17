'use client';

import React, { useState, useEffect } from 'react';
import { usePharmacy } from '@/lib/store';
import { Membership } from '@/types/pharmacy';
import {
  calculateExpiryDate,
  formatINR,
  calculateCustomerPurchases,
  getDiscountTierInfo,
} from '@/lib/membershipUtils';
import {
  Crown,
  UserPlus,
  Phone,
  User,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface CreateMembershipTabProps {
  onSuccess: (newMember: Membership) => void;
  onViewExisting: (member: Membership) => void;
}

export const CreateMembershipTab: React.FC<CreateMembershipTabProps> = ({
  onSuccess,
  onViewExisting,
}) => {
  const {
    customers,
    memberships,
    membershipSettings,
    currentUser,
    invoices,
    salesReturns,
    createMembership,
    addCustomer,
  } = usePharmacy();

  const todayStr = new Date().toISOString().split('T')[0];

  // Form Fields State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [selectedDuration, setSelectedDuration] = useState<number>(12);
  const [customDurationMonths, setCustomDurationMonths] = useState<string>('12');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [notes, setNotes] = useState('');

  // Duplicate Check & Lookups
  const [existingMember, setExistingMember] = useState<Membership | null>(null);
  const [matchedCustomer, setMatchedCustomer] = useState<any | null>(null);
  const [calculatedExpiry, setCalculatedExpiry] = useState<string>('');

  // Preview ID
  const previewId = `${membershipSettings.idPrefix}-${new Date().getFullYear()}-${String(membershipSettings.nextNumber).padStart(4, '0')}`;

  // Check phone changes
  useEffect(() => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length >= 7) {
      // Check existing membership
      const foundMember = memberships.find((m) => {
        const p = m.customerPhone.replace(/\D/g, '');
        return p === cleanPhone || p.endsWith(cleanPhone) || cleanPhone.endsWith(p);
      });
      setExistingMember(foundMember || null);

      // Check existing customer
      const foundCust = customers.find((c) => {
        const p = c.phone.replace(/\D/g, '');
        return p === cleanPhone || p.endsWith(cleanPhone) || cleanPhone.endsWith(p);
      });
      setMatchedCustomer(foundCust || null);

      if (foundCust && !customerName) {
        setCustomerName(foundCust.name);
        if (foundCust.email) setCustomerEmail(foundCust.email);
        if (foundCust.address) setCustomerAddress(foundCust.address);
      }
    } else {
      setExistingMember(null);
      setMatchedCustomer(null);
    }
  }, [customerPhone, memberships, customers, customerName]);

  // Recalculate expiry date
  useEffect(() => {
    const months = selectedDuration === -1 ? (parseInt(customDurationMonths) || 1) : selectedDuration;
    setCalculatedExpiry(calculateExpiryDate(startDate, months));
  }, [startDate, selectedDuration, customDurationMonths]);

  // Compute existing purchase history & tier preview for this phone
  const purchaseAgg = calculateCustomerPurchases(customerPhone, invoices, salesReturns, membershipSettings);
  const tierInfo = getDiscountTierInfo(purchaseAgg.rollingPurchases, membershipSettings, true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert('Please enter customer full name.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (existingMember) {
      alert(`Customer with mobile ${customerPhone} already has an active membership (${existingMember.membershipId})!`);
      return;
    }

    // Ensure customer exists in Customer CRM
    let custId = matchedCustomer?.id;
    if (!custId) {
      const newCust = addCustomer({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: customerAddress,
        creditLimit: 5000,
      });
      custId = newCust.id;
    }

    const effMonths = selectedDuration === -1 ? (parseInt(customDurationMonths) || 1) : selectedDuration;
    const durationLabel = `${effMonths} Month${effMonths > 1 ? 's' : ''}`;

    const newMember = createMembership({
      customerId: custId,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      customerAddress: customerAddress || undefined,
      startDate,
      durationMonths: effMonths,
      durationLabel,
      expiryDate: calculatedExpiry,
      status,
      notes: notes || undefined,
      createdBy: currentUser?.name || 'Administrator',
    });

    onSuccess(newMember);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-emerald-600" />
          Enroll New Customer Membership
        </h2>
        <p className="text-xs text-slate-500">
          Register member for rolling 3-month pharmacy loyalty discount tiers (10% &amp; 20%).
        </p>
      </div>

      {/* Duplicate Alert Banner */}
      {existingMember && (
        <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Existing Membership Found for this Mobile Number!</p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                <strong>{existingMember.customerName}</strong> already holds Membership ID{' '}
                <span className="font-mono font-bold underline">{existingMember.membershipId}</span> (Status:{' '}
                <strong>{existingMember.status}</strong>, Valid until <strong>{existingMember.expiryDate}</strong>).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onViewExisting(existingMember)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold shadow-xs transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View / Renew Existing
          </button>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Form: 2 Cols */}
          <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4 shadow-xs">
            {/* ID & Mobile row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Membership ID (Auto-Generated)
                </label>
                <input
                  type="text"
                  value={previewId}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number <span className="text-rose-500">* (Lookup Key)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Name & Email row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh K. Patel"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. ramesh.patel@gmail.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Home / Delivery Address (Optional)
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="e.g. Flat 302, Sai Vihar, Station Road, Pune"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* Start Date & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Membership Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Membership Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="ACTIVE">Active (Immediate Benefit)</option>
                  <option value="SUSPENDED">Suspended (Hold on Benefits)</option>
                </select>
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Membership Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {membershipSettings.availableDurations.map((opt) => (
                  <button
                    type="button"
                    key={opt.months}
                    onClick={() => setSelectedDuration(opt.months)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all ${
                      selectedDuration === opt.months
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedDuration(-1)}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all ${
                    selectedDuration === -1
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Custom
                </button>
              </div>

              {selectedDuration === -1 && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={customDurationMonths}
                    onChange={(e) => setCustomDurationMonths(e.target.value)}
                    className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold"
                  />
                  <span className="text-xs text-slate-500">months duration</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Internal Remarks / Medical Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Senior citizen patient, referred by Dr. Patil, requires monthly medicine supply"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Right Live Preview Card */}
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-linear-to-br from-emerald-800 to-slate-950 text-white p-5 shadow-lg flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-emerald-700/60">
                  <div className="flex items-center gap-1.5">
                    <Crown className="h-4 w-4 text-amber-300" />
                    <span className="text-xs font-black tracking-wider uppercase">BHALERAO PHARMA CLUB</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-700/80 text-emerald-200">
                    {status}
                  </span>
                </div>

                <div className="mt-3">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-300">MEMBERSHIP NUMBER</span>
                  <p className="text-base font-mono font-black tracking-wider">{previewId}</p>
                </div>

                <div className="mt-2">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-300">PATIENT NAME</span>
                  <p className="text-sm font-bold truncate">{customerName || 'Customer Name'}</p>
                  <p className="text-xs font-mono text-emerald-300">{customerPhone || '9XXXXXXXXX'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-700/60 flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-[9px] text-emerald-300 block uppercase">EXPIRY DATE</span>
                  <span className="font-mono font-bold">{calculatedExpiry}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-emerald-300 block uppercase">STARTING TIER</span>
                  <span className="font-mono font-black text-amber-300">{tierInfo.percent}% OFF</span>
                </div>
              </div>
            </div>

            {/* Calculated Tier Preview */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs text-xs space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">Rolling Purchase Evaluation</h4>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Existing Rolling 3-Mo Purchases:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatINR(purchaseAgg.rollingPurchases)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Calculated Discount Tier:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {tierInfo.summaryLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                {purchaseAgg.rollingPurchases >= membershipSettings.purchaseThreshold
                  ? `Qualifies for top ${membershipSettings.higherTierDiscountPercent}% tier immediately!`
                  : `Qualifies for ${membershipSettings.lowerTierDiscountPercent}% tier. Purchases of ₹${membershipSettings.purchaseThreshold.toLocaleString('en-IN')} qualify for ${membershipSettings.higherTierDiscountPercent}%.`}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!!existingMember}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Enroll & Issue Membership Card
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
