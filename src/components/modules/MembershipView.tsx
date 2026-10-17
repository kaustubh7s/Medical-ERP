'use client';

import React, { useState, useMemo } from 'react';
import { usePharmacy } from '@/lib/store';
import { Medicine, Membership, MembershipStatus, PaymentMode } from '@/types/pharmacy';
import {
  calculateExpiryDate,
  calculateCustomerPurchases,
  getDiscountTierInfo,
  getMembershipExpiryInfo,
  formatINR,
} from '@/lib/membershipUtils';
import { MemberDetailsModal } from './membership/MemberDetailsModal';
import { RenewMembershipModal } from './membership/RenewMembershipModal';
import { Modal } from '@/components/common/Modal';
import {
  Crown,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Plus,
  SlidersHorizontal,
  Download,
  Eye,
  Edit3,
  RotateCcw,
  Calendar,
  Phone,
  User,
  ShieldAlert,
  Info,
  Pill,
  Tag,
  CheckSquare,
  Square,
  IndianRupee,
  CreditCard,
  Banknote,
  Filter,
} from 'lucide-react';

export const MembershipView: React.FC = () => {
  const {
    memberships,
    membershipSettings,
    medicines,
    customers,
    invoices,
    salesReturns,
    currentUser,
    createMembership,
    updateMembership,
    updateMembershipSettings,
    toggleMedicineMembershipDiscount,
    setMedicineMembershipDiscountBulk,
    addCustomer,
  } = usePharmacy();

  // Modals
  const [selectedMember, setSelectedMember] = useState<Membership | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [productEligibilityModalOpen, setProductEligibilityModalOpen] = useState(false);

  // Form State for "Create Paid Membership"
  const todayStr = new Date().toISOString().split('T')[0];
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [selectedDuration, setSelectedDuration] = useState<number>(12);
  const [customDurationMonths, setCustomDurationMonths] = useState<string>('12');
  const [membershipFee, setMembershipFee] = useState<number>(149); // default 149 for 1 year
  const [feePaymentMode, setFeePaymentMode] = useState<PaymentMode>('UPI');
  const [formNotes, setFormNotes] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState('');
  const [formErrorMessage, setFormErrorMessage] = useState('');

  // Edit Member Modal State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editStatus, setEditStatus] = useState<MembershipStatus>('ACTIVE');
  const [editFee, setEditFee] = useState<number>(149);
  const [editNotes, setEditNotes] = useState('');

  // Directory Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED'>('ALL');

  // Product Discount Eligibility Modal Search & Filters
  const [prodSearch, setProdSearch] = useState('');
  const [prodCategoryFilter, setProdCategoryFilter] = useState('ALL');

  // Auto-calculated fields for new registration
  const effectiveMonths =
    selectedDuration === -1 ? Math.max(1, parseInt(customDurationMonths) || 1) : selectedDuration;
  const calculatedExpiryDate = useMemo(() => {
    return calculateExpiryDate(startDate, effectiveMonths);
  }, [startDate, effectiveMonths]);

  // Preview generated Membership ID
  const previewMembershipId = useMemo(() => {
    const year = new Date().getFullYear();
    const count = memberships.length + 1;
    return `${membershipSettings.idPrefix || 'MEM'}-${year}-${String(count).padStart(4, '0')}`;
  }, [memberships.length, membershipSettings.idPrefix]);

  // Duplicate mobile check for live feedback
  const cleanPhone = custPhone.replace(/\D/g, '');
  const existingMemberWithPhone = useMemo(() => {
    if (cleanPhone.length < 10) return null;
    return memberships.find((m) => m.customerPhone.replace(/\D/g, '') === cleanPhone) || null;
  }, [cleanPhone, memberships]);

  // Duration select handler with auto price updates
  const handleDurationSelect = (months: number) => {
    setSelectedDuration(months);
    const dur = membershipSettings.availableDurations.find((d) => d.months === months);
    if (dur && dur.price !== undefined) {
      setMembershipFee(dur.price);
    } else if (months === 12) {
      setMembershipFee(149);
    } else if (months === 6) {
      setMembershipFee(99);
    } else if (months === 3) {
      setMembershipFee(59);
    } else if (months === 1) {
      setMembershipFee(29);
    }
  };

  // 4 Top Summary KPI Cards
  const summaryKpis = useMemo(() => {
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let totalRevenue = 0;

    memberships.forEach((m) => {
      const info = getMembershipExpiryInfo(m, membershipSettings);
      totalRevenue += m.feePaid || 149;

      if (info.isExpired) {
        expired++;
      } else if (info.isExpiringSoon) {
        expiringSoon++;
        active++;
      } else if (info.computedStatus === 'ACTIVE') {
        active++;
      }
    });

    return {
      total: memberships.length,
      active,
      expiringSoon,
      expired,
      totalRevenue,
    };
  }, [memberships, membershipSettings]);

  // Product Eligibility counts
  const eligibleProductCount = useMemo(() => {
    return medicines.filter((m) => m.isMembershipDiscountEligible !== false).length;
  }, [medicines]);

  // Categories list for product filter
  const productCategories = useMemo(() => {
    const cats = new Set<string>();
    medicines.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats);
  }, [medicines]);

  // Filtered Products for Eligibility Modal
  const filteredProducts = useMemo(() => {
    return medicines.filter((m) => {
      if (prodCategoryFilter !== 'ALL' && m.category !== prodCategoryFilter) return false;
      if (!prodSearch.trim()) return true;
      const term = prodSearch.toLowerCase().trim();
      return (
        m.name.toLowerCase().includes(term) ||
        m.genericName.toLowerCase().includes(term) ||
        m.hsnCode.includes(term)
      );
    });
  }, [medicines, prodCategoryFilter, prodSearch]);

  // Handle Create Membership Submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccessMessage('');
    setFormErrorMessage('');

    const phoneClean = custPhone.replace(/\D/g, '');
    if (phoneClean.length < 10) {
      setFormErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!custName.trim()) {
      setFormErrorMessage('Please enter the customer name.');
      return;
    }

    if (existingMemberWithPhone) {
      setFormErrorMessage(
        `Mobile number ${custPhone} already belongs to member ${existingMemberWithPhone.membershipId} (${existingMemberWithPhone.customerName}).`
      );
      return;
    }

    // Ensure customer is registered in customer database
    let custId = '';
    const matchedCustomer = customers.find((c) => c.phone.replace(/\D/g, '') === phoneClean);
    if (matchedCustomer) {
      custId = matchedCustomer.id;
    } else {
      const createdCust = addCustomer({
        name: custName.trim(),
        phone: phoneClean,
        creditLimit: 5000,
        doctorName: 'Self',
        address: 'Registered Member',
      });
      custId = createdCust.id;
    }

    const durationLabel = `${effectiveMonths} Month${effectiveMonths > 1 ? 's' : ''}`;

    const newMember = createMembership({
      customerId: custId,
      customerName: custName.trim(),
      customerPhone: phoneClean,
      startDate,
      durationMonths: effectiveMonths,
      durationLabel,
      expiryDate: calculatedExpiryDate,
      status: 'ACTIVE',
      feePaid: membershipFee,
      paymentMode: feePaymentMode,
      createdBy: currentUser?.name || 'Administrator',
      notes: formNotes.trim()
        ? `${formNotes.trim()} | Paid: ₹${membershipFee} (${feePaymentMode})`
        : `Paid membership fee: ₹${membershipFee} via ${feePaymentMode}`,
    });

    setFormSuccessMessage(
      `✓ Successfully registered ${newMember.customerName} (${newMember.membershipId})! Collected ₹${membershipFee} via ${feePaymentMode}.`
    );
    // Reset form
    setCustName('');
    setCustPhone('');
    setStartDate(todayStr);
    setSelectedDuration(12);
    setCustomDurationMonths('12');
    setMembershipFee(149);
    setFormNotes('');

    // Clear alert after 5s
    setTimeout(() => setFormSuccessMessage(''), 5000);
  };

  // Filtered & Searched Members Table
  const filteredMembers = useMemo(() => {
    return memberships.filter((m) => {
      const info = getMembershipExpiryInfo(m, membershipSettings);

      // Status Filter
      if (statusFilter === 'ACTIVE' && (info.isExpired || m.status === 'SUSPENDED')) return false;
      if (statusFilter === 'EXPIRING' && (!info.isExpiringSoon || info.isExpired)) return false;
      if (statusFilter === 'EXPIRED' && !info.isExpired) return false;

      // Search Term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        m.membershipId.toLowerCase().includes(term) ||
        m.customerName.toLowerCase().includes(term) ||
        m.customerPhone.includes(term)
      );
    });
  }, [memberships, membershipSettings, statusFilter, searchTerm]);

  // Open Edit Modal
  const handleOpenEdit = (m: Membership) => {
    setSelectedMember(m);
    setEditName(m.customerName);
    setEditPhone(m.customerPhone);
    setEditExpiryDate(m.expiryDate);
    setEditStatus(m.status);
    setEditFee(m.feePaid || 149);
    setEditNotes(m.notes || '');
    setEditModalOpen(true);
  };

  // Submit Edit Member
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    updateMembership(selectedMember.id, {
      customerName: editName.trim(),
      customerPhone: editPhone.replace(/\D/g, ''),
      expiryDate: editExpiryDate,
      status: editStatus,
      feePaid: editFee,
      notes: editNotes.trim() || undefined,
    });

    setEditModalOpen(false);
  };

  // CSV Export of Members Directory
  const handleExportCSV = () => {
    const headers = [
      'Membership ID',
      'Customer Name',
      'Mobile Number',
      'Start Date',
      'Expiry Date',
      'Days Remaining',
      'Fee Paid (INR)',
      'Payment Mode',
      '3-Month Purchases (INR)',
      'Discount Tier',
      'Status',
    ];

    const rows = filteredMembers.map((m) => {
      const info = getMembershipExpiryInfo(m, membershipSettings);
      const purchaseAgg = calculateCustomerPurchases(m.customerPhone, invoices, salesReturns, membershipSettings);
      const tierInfo = getDiscountTierInfo(purchaseAgg.rollingPurchases, membershipSettings, !info.isExpired);

      return [
        m.membershipId,
        `"${m.customerName}"`,
        m.customerPhone,
        m.startDate,
        m.expiryDate,
        info.isExpired ? 'Expired' : info.daysRemaining,
        m.feePaid || 149,
        m.paymentMode || 'UPI',
        purchaseAgg.rollingPurchases,
        tierInfo.percent + '%',
        info.statusLabel,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `members_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-700 text-white">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Customer Membership & Loyalty
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] font-mono border border-emerald-300 dark:border-emerald-800">
                  Paid Program: ₹149 / Year
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Paid loyalty membership (e.g. ₹149/yr) with rolling 3-month tiers (10%/20%) and custom product discount controls
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Product Eligibility Control Button */}
          <button
            onClick={() => setProductEligibilityModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Tag className="h-3.5 w-3.5 text-emerald-600" />
            <span>Product Discount Selection ({eligibleProductCount}/{medicines.length})</span>
          </button>

          {/* Discount Policy Rules Button */}
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <span>Policy Rules</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (4 Compact Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Members */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Members</span>
            <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {summaryKpis.total}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Registered</span>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Active Members</span>
            <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
              {summaryKpis.active}
            </span>
            <span className="text-[11px] text-emerald-600 font-bold">Unexpired</span>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Expiring Soon</span>
            <div className="p-1 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {summaryKpis.expiringSoon}
            </span>
            <span className="text-[11px] text-amber-600 font-bold">Within 30 Days</span>
          </div>
        </div>

        {/* Membership Revenue Collected */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 dark:text-purple-300">Membership Revenue</span>
            <div className="p-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-700 dark:text-purple-400 font-mono">
              {formatINR(summaryKpis.totalRevenue, false)}
            </span>
            <span className="text-[11px] text-purple-600 font-bold">Fees Collected</span>
          </div>
        </div>
      </div>

      {/* 3. Create Paid Membership Form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Register Paid Customer Membership
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Auto Member ID:</span>
            <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400">
              {previewMembershipId}
            </span>
          </div>
        </div>

        {formSuccessMessage && (
          <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{formSuccessMessage}</span>
          </div>
        )}

        {formErrorMessage && (
          <div className="mb-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{formErrorMessage}</span>
          </div>
        )}

        {existingMemberWithPhone && (
          <div className="mb-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong>Warning:</strong> Mobile {custPhone} is already registered under{' '}
                <strong>{existingMemberWithPhone.customerName}</strong> ({existingMemberWithPhone.membershipId}) — Status: {existingMemberWithPhone.status}.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedMember(existingMemberWithPhone);
                setDetailModalOpen(true);
              }}
              className="px-2 py-1 bg-amber-700 text-white rounded text-[11px] font-bold hover:bg-amber-800"
            >
              View Member
            </button>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Mobile Number (Primary Key) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Membership Start Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Auto Expiry Preview Box */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Calculated Expiry Date
              </label>
              <div className="px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between font-mono">
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  {calculatedExpiryDate}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans font-bold">
                  {effectiveMonths} Mos
                </span>
              </div>
            </div>
          </div>

          {/* Duration Selector with Paid Fees */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="font-bold text-slate-800 dark:text-slate-200">
                Choose Plan & Paid Duration
              </label>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                ★ Standard Plan: 12 Months (1 Year) @ ₹149
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { months: 1, label: '1 Month', price: 29 },
                { months: 3, label: '3 Months', price: 59 },
                { months: 6, label: '6 Months', price: 99 },
                { months: 12, label: '1 Year (12 Mos)', price: 149 },
                { months: -1, label: 'Custom Plan', price: 149 },
              ].map((dur) => (
                <button
                  key={dur.months}
                  type="button"
                  onClick={() => handleDurationSelect(dur.months)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    selectedDuration === dur.months
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="block font-bold text-xs">{dur.label}</span>
                  <span className={`text-[11px] font-mono font-black block mt-0.5 ${selectedDuration === dur.months ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    ₹{dur.price}
                  </span>
                </button>
              ))}
            </div>

            {selectedDuration === -1 && (
              <div className="flex items-center gap-2 pt-1">
                <label className="text-xs font-semibold text-slate-600">Custom Months:</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={customDurationMonths}
                  onChange={(e) => setCustomDurationMonths(e.target.value)}
                  placeholder="12"
                  className="w-20 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 font-mono font-bold text-xs"
                />
                <span className="text-xs text-slate-500">Months</span>
              </div>
            )}
          </div>

          {/* Paid Fee Amount & Payment Mode Tender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end pt-1">
            {/* Membership Fee (₹) */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Membership Fee Collected (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="number"
                  required
                  min={0}
                  value={membershipFee}
                  onChange={(e) => setMembershipFee(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Fee Payment Mode */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Fee Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { mode: 'UPI', label: 'UPI / QR', icon: IndianRupee },
                  { mode: 'CASH', label: 'Cash', icon: Banknote },
                  { mode: 'CARD', label: 'Card', icon: CreditCard },
                ].map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => setFeePaymentMode(item.mode as PaymentMode)}
                    className={`py-2 px-1 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      feePaymentMode === item.mode
                        ? 'bg-slate-900 text-white dark:bg-emerald-600 border-slate-900 dark:border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!!existingMemberWithPhone}
                className={`w-full py-2.5 px-5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                  existingMemberWithPhone
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Collect ₹{membershipFee} & Activate Membership</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 4. All Members in the Same Page (Below Registration Form) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Controls: Search + Filter Tabs */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member by name, mobile, or ID..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'All Members', count: memberships.length },
              { id: 'ACTIVE', label: 'Active', count: summaryKpis.active },
              { id: 'EXPIRING', label: 'Expiring Soon', count: summaryKpis.expiringSoon },
              { id: 'EXPIRED', label: 'Expired', count: summaryKpis.expired },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>{f.label}</span>
                <span className="text-[10px] opacity-75 font-mono">({f.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/50 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Membership ID</th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3">Mobile Number</th>
                <th className="py-2.5 px-3">Start Date</th>
                <th className="py-2.5 px-3">Expiry Date</th>
                <th className="py-2.5 px-3 text-center">Days Left</th>
                <th className="py-2.5 px-3 text-right">Fee Paid</th>
                <th className="py-2.5 px-3 text-right">3-Mo Purchases</th>
                <th className="py-2.5 px-3 text-center">Discount Tier</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    <p className="font-semibold text-xs">No matching memberships found.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try adjusting your search criteria or register a new member using the form above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const expiryInfo = getMembershipExpiryInfo(m, membershipSettings);
                  const purchaseAgg = calculateCustomerPurchases(
                    m.customerPhone,
                    invoices,
                    salesReturns,
                    membershipSettings
                  );
                  const tierInfo = getDiscountTierInfo(
                    purchaseAgg.rollingPurchases,
                    membershipSettings,
                    !expiryInfo.isExpired
                  );

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Membership ID */}
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {m.membershipId}
                      </td>

                      {/* Customer Name */}
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {m.customerName}
                      </td>

                      {/* Mobile Number */}
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {m.customerPhone}
                      </td>

                      {/* Start Date */}
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {m.startDate}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {m.expiryDate}
                      </td>

                      {/* Days Remaining */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-bold font-mono ${
                            expiryInfo.isExpired
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : expiryInfo.isUrgent
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : expiryInfo.isExpiringSoon
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {expiryInfo.isExpired
                            ? 'Expired'
                            : `${expiryInfo.daysRemaining} days`}
                        </span>
                      </td>

                      {/* Fee Paid */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        <span>₹{m.feePaid || 149}</span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {m.paymentMode || 'UPI'}
                        </span>
                      </td>

                      {/* Three-Month Purchase Total */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(purchaseAgg.rollingPurchases, false)}
                      </td>

                      {/* Discount Percentage */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold font-mono ${
                            expiryInfo.isExpired
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                              : tierInfo.isHigherTier
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {expiryInfo.isExpired ? '0%' : `${tierInfo.percent}%`}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            expiryInfo.isExpired
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : expiryInfo.isExpiringSoon
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : m.status === 'SUSPENDED'
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {expiryInfo.isExpired ? 'EXPIRED' : expiryInfo.statusLabel}
                        </span>
                      </td>

                      {/* Actions: View, Edit, Renew */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Profile */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMember(m);
                              setDetailModalOpen(true);
                            }}
                            title="View Member Profile & QR"
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            title="Edit Member Information"
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* 1-Click Renew */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMember(m);
                              setRenewModalOpen(true);
                            }}
                            title="Renew Membership"
                            className="p-1 rounded bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 transition-colors"
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

      {/* MODAL 1: Member Profile & History */}
      {selectedMember && (
        <MemberDetailsModal
          member={selectedMember}
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          onRenew={(m) => {
            setDetailModalOpen(false);
            setSelectedMember(m);
            setRenewModalOpen(true);
          }}
          onExtend={() => {
            setDetailModalOpen(false);
          }}
          onEdit={(m) => {
            setDetailModalOpen(false);
            handleOpenEdit(m);
          }}
        />
      )}

      {/* MODAL 2: 1-Click Renew */}
      {selectedMember && (
        <RenewMembershipModal
          member={selectedMember}
          isOpen={renewModalOpen}
          onClose={() => setRenewModalOpen(false)}
        />
      )}

      {/* MODAL 3: Edit Member */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Membership Details"
        subtitle={`Editing ${selectedMember?.customerName} (${selectedMember?.membershipId})`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Customer Name
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Fee Paid (₹)
              </label>
              <input
                type="number"
                min={0}
                value={editFee}
                onChange={(e) => setEditFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                required
                value={editExpiryDate}
                onChange={(e) => setEditExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Membership Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-900"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add optional notes..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Product Discount Eligibility Manager (Select/Deselect Products) */}
      <Modal
        isOpen={productEligibilityModalOpen}
        onClose={() => setProductEligibilityModalOpen(false)}
        title="Product Discount Eligibility Control"
        subtitle={`Select which products qualify for 10%/20% member discounts (${eligibleProductCount} of ${medicines.length} currently eligible)`}
        maxWidth="4xl"
      >
        <div className="space-y-3.5 text-xs">
          {/* Information & Instructions Banner */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
            <Tag className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-950 dark:text-emerald-200 block">
                Product Discount Selection (Default: All Selected)
              </span>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                By default, all products in your pharmacy catalog are eligible for membership loyalty discounts. Uncheck or deselect any products (such as DPCO price-controlled medicines, surgical equipment, or high-value specialty drugs) that you wish to exclude from member discounts.
              </p>
            </div>
          </div>

          {/* Search, Filter & Bulk Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  placeholder="Search medicine name, salt, or HSN..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                />
              </div>

              <select
                value={prodCategoryFilter}
                onChange={(e) => setProdCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800"
              >
                <option value="ALL">All Categories ({medicines.length})</option>
                {productCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setMedicineMembershipDiscountBulk(medicines.map((m) => m.id), true)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Select All (100% Eligible)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMedicineMembershipDiscountBulk(
                    filteredProducts.map((m) => m.id),
                    false
                  )
                }
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Square className="h-3.5 w-3.5 text-rose-500" />
                <span>Deselect Filtered</span>
              </button>
            </div>
          </div>

          {/* Product Eligibility Table */}
          <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 px-3 w-10 text-center">Status</th>
                  <th className="py-2 px-3">Brand & Salt Composition</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">MRP (₹)</th>
                  <th className="py-2 px-3 text-center">Current Stock</th>
                  <th className="py-2 px-3 text-center">Discount Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((med) => {
                  const isEligible = med.isMembershipDiscountEligible !== false;

                  return (
                    <tr
                      key={med.id}
                      onClick={() => toggleMedicineMembershipDiscount(med.id)}
                      className={`cursor-pointer transition-colors ${
                        isEligible
                          ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                          : 'bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40'
                      }`}
                    >
                      {/* Checkbox indicator */}
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isEligible}
                          onChange={() => toggleMedicineMembershipDiscount(med.id)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Brand & Generic */}
                      <td className="py-2 px-3">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{med.name}</p>
                        <p className="text-[10px] text-slate-500">{med.genericName}</p>
                      </td>

                      {/* Category */}
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                        {med.category}
                      </td>

                      {/* MRP */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        ₹{med.batches[0]?.mrp || 0}
                      </td>

                      {/* Stock */}
                      <td className="py-2 px-3 text-center font-mono">
                        <span className={med.totalStock <= med.reorderLevel ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                          {med.totalStock}
                        </span>
                      </td>

                      {/* Toggle Button */}
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleMedicineMembershipDiscount(med.id)}
                          className={`px-2 py-1 rounded text-[10.5px] font-bold font-mono transition-colors shadow-2xs ${
                            isEligible
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {isEligible ? '✓ Eligible for Discount' : '✗ Discount Excluded'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 font-medium">
              Changes apply instantly across POS Billing Counter and Member Purchase Aggregations.
            </span>
            <button
              type="button"
              onClick={() => setProductEligibilityModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
            >
              Done & Close
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: Discount Policy Settings */}
      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="Membership Discount Policy Settings"
        subtitle="Configure rolling qualification period, purchase threshold, and discount percentages"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
              <Info className="h-4 w-4" />
              <span>Current Default Policy</span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Purchases in preceding <strong>{membershipSettings.qualificationPeriodMonths} months</strong> below <strong>{formatINR(membershipSettings.purchaseThreshold, false)}</strong> qualify for <strong>{membershipSettings.lowerTierDiscountPercent}%</strong> discount. Exactly <strong>{formatINR(membershipSettings.purchaseThreshold, false)}</strong> or above qualifies for <strong>{membershipSettings.higherTierDiscountPercent}%</strong> discount.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Purchase Qualification Threshold (₹)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={membershipSettings.purchaseThreshold}
                onChange={(e) =>
                  updateMembershipSettings({ purchaseThreshold: parseFloat(e.target.value) || 3000 })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-mono font-bold"
              />
              <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                Net purchase amount required over rolling 3 months to unlock the higher tier.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Lower Tier Discount (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={membershipSettings.lowerTierDiscountPercent}
                  onChange={(e) =>
                    updateMembershipSettings({
                      lowerTierDiscountPercent: parseFloat(e.target.value) || 10,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Higher Tier Discount (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={membershipSettings.higherTierDiscountPercent}
                  onChange={(e) =>
                    updateMembershipSettings({
                      higherTierDiscountPercent: parseFloat(e.target.value) || 20,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Rolling Evaluation Window (Months)
              </label>
              <select
                value={membershipSettings.qualificationPeriodMonths}
                onChange={(e) =>
                  updateMembershipSettings({
                    qualificationPeriodMonths: parseInt(e.target.value) || 3,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-900"
              >
                <option value={1}>Rolling 1 Month</option>
                <option value={2}>Rolling 2 Months</option>
                <option value={3}>Rolling 3 Months (Standard)</option>
                <option value={6}>Rolling 6 Months</option>
                <option value={12}>Rolling 12 Months</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSettingsModalOpen(false)}
              className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs"
            >
              Done & Close Settings
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
