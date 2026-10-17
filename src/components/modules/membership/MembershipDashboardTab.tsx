'use client';

import React from 'react';
import { usePharmacy } from '@/lib/store';
import { Membership } from '@/types/pharmacy';
import {
  formatINR,
  getMembershipExpiryInfo,
  calculateCustomerPurchases,
  getDiscountTierInfo,
} from '@/lib/membershipUtils';
import {
  Crown,
  Users,
  AlertTriangle,
  Clock,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Percent,
  PlusCircle,
  FileSpreadsheet,
  SlidersHorizontal,
  ArrowRight,
  ShieldAlert,
  Phone,
  CheckCircle2,
} from 'lucide-react';

interface MembershipDashboardTabProps {
  onNavigateTab: (tabId: string) => void;
  onSelectMember: (member: Membership) => void;
  onRenewMember: (member: Membership) => void;
}

export const MembershipDashboardTab: React.FC<MembershipDashboardTabProps> = ({
  onNavigateTab,
  onSelectMember,
  onRenewMember,
}) => {
  const { memberships, membershipSettings, invoices, salesReturns } = usePharmacy();
  const today = new Date();

  // Compute Metrics
  const totalMembers = memberships.length;
  let activeCount = 0;
  let expiredCount = 0;
  let expiring7DaysCount = 0;
  let expiring30DaysCount = 0;
  let tier10Count = 0;
  let tier20Count = 0;

  memberships.forEach((mem) => {
    const info = getMembershipExpiryInfo(mem, membershipSettings, today);
    if (info.computedStatus === 'ACTIVE' || (info.computedStatus === 'EXPIRING_SOON' && !info.isExpired)) {
      activeCount++;
    }
    if (info.isExpired) {
      expiredCount++;
    }
    if (info.isExpiringSoon && info.daysRemaining <= 7) {
      expiring7DaysCount++;
    }
    if (info.isExpiringSoon && info.daysRemaining <= 30) {
      expiring30DaysCount++;
    }

    // Tier qualification
    const pur = calculateCustomerPurchases(mem.customerPhone, invoices, salesReturns, membershipSettings, today);
    const tier = getDiscountTierInfo(pur.rollingPurchases, membershipSettings, !info.isExpired && mem.status !== 'SUSPENDED');
    if (tier.tier === '20%') tier20Count++;
    else if (tier.tier === '10%') tier10Count++;
  });

  // Financial impact from invoices where membership was applied
  const memberInvoices = invoices.filter((inv) => inv.membershipId);
  const totalMemberPurchases = memberInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalDiscountsGiven = memberInvoices.reduce(
    (sum, i) => sum + (i.membershipDiscountAmount || i.totalDiscount || 0),
    0
  );

  // Expiry Radar: members expiring within 30 days or recently expired (within last 30 days)
  const expiryRadarMembers = memberships
    .map((mem) => ({
      member: mem,
      info: getMembershipExpiryInfo(mem, membershipSettings, today),
    }))
    .filter(({ info }) => info.daysRemaining <= 30)
    .sort((a, b) => a.info.daysRemaining - b.info.daysRemaining);

  // Recent membership activities (from history arrays)
  const recentActivities: Array<{
    id: string;
    memberId: string;
    memberName: string;
    action: string;
    date: string;
    performedBy: string;
    notes?: string;
  }> = [];

  memberships.forEach((mem) => {
    (mem.history || []).forEach((h) => {
      recentActivities.push({
        id: h.id,
        memberId: mem.membershipId,
        memberName: mem.customerName,
        action: h.action,
        date: h.date,
        performedBy: h.performedBy,
        notes: h.notes,
      });
    });
  });

  recentActivities.sort((a, b) => b.date.localeCompare(a.date));
  const topRecentActivities = recentActivities.slice(0, 7);

  return (
    <div className="space-y-4">
      {/* Module Title & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">
              Customer Membership & Loyalty Desk
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Active Module
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rolling 3-month purchase tracking with automatic 10% / 20% discount tiers and expiry radar.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigateTab('membership-create')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Create Member
          </button>
          <button
            onClick={() => onNavigateTab('membership-members')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            <Users className="h-3.5 w-3.5 text-slate-500" />
            Directory
          </button>
          <button
            onClick={() => onNavigateTab('membership-settings')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            Rules & Settings
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (High density ERP design) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Total Members */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Members
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {totalMembers}
            </span>
            <Crown className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate">
            {activeCount} active • {expiredCount} expired
          </p>
        </div>

        {/* Active Members */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
            Active Members
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {activeCount}
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
            Eligible for counter discounts
          </p>
        </div>

        {/* Expired Members */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
            Expired Members
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {expiredCount}
            </span>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate">
            Discounts paused until renewed
          </p>
        </div>

        {/* Expiring in 7 Days (Urgent) */}
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
            Expiring in 7 Days
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-rose-700 dark:text-rose-400 font-mono">
              {expiring7DaysCount}
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-1 text-[10px] text-rose-600 font-semibold truncate">
            Requires immediate renewal call
          </p>
        </div>

        {/* Expiring in 30 Days */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
            Expiring in 30 Days
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono">
              {expiring30DaysCount}
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400 truncate">
            Upcoming renewal pipeline
          </p>
        </div>
      </div>

      {/* Secondary Financial & Tier KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 10% Discount Tier */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">10% Discount Tier</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Standard
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {tier10Count}
            </span>
            <span className="text-xs text-slate-400">&lt; ₹3,000 rolling</span>
          </div>
        </div>

        {/* 20% Discount Tier */}
        <div className="rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">20% Discount Tier</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
              Elite
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-700 dark:text-purple-300 font-mono">
              {tier20Count}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400">≥ ₹3,000 rolling</span>
          </div>
        </div>

        {/* Member Revenue */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Membership Sales</span>
          <div className="mt-1">
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {formatINR(totalMemberPurchases)}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">Total member billings</p>
        </div>

        {/* Member Discounts Given */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Total Discounts Given</span>
          <div className="mt-1">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatINR(totalDiscountsGiven)}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-emerald-600 font-semibold">Customer loyalty savings</p>
        </div>
      </div>

      {/* Split Section: Expiry Radar & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expiry Overview Table (2 columns wide) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="p-3 sm:px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Membership Expiry Radar
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('membership-members')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              View All ({memberships.length})
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-[340px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Member ID</th>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {expiryRadarMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      All memberships are active with healthy coverage periods!
                    </td>
                  </tr>
                ) : (
                  expiryRadarMembers.map(({ member, info }) => (
                    <tr
                      key={member.id}
                      onClick={() => onSelectMember(member)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-3 font-bold text-emerald-700 dark:text-emerald-400">
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
                      <td className="py-2 px-3 text-center font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            info.isExpired
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : info.daysRemaining <= 7
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {info.isExpired ? 'Expired' : `${info.daysRemaining}d left`}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onRenewMember(member)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors"
                        >
                          Renew
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Membership Activity Table (1 column wide) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="p-3 sm:px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Recent Operations
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Live Audit</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 max-h-[340px] overflow-y-auto">
              {topRecentActivities.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">No recent operations logged.</p>
              ) : (
                topRecentActivities.map((act) => (
                  <div key={act.id} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                        {act.memberName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{act.date.split(' ')[0]}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {act.action.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        {act.memberId}
                      </span>
                    </div>
                    {act.notes && (
                      <p className="mt-1 text-[11px] text-slate-500 leading-tight truncate">
                        {act.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-center">
            <button
              onClick={() => onNavigateTab('membership-reports')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Open Membership Performance Reports →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
