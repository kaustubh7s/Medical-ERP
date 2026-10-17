'use client';

import React, { useState } from 'react';
import { Membership, SalesInvoice, SalesReturn } from '@/types/pharmacy';
import { usePharmacy } from '@/lib/store';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import {
  formatINR,
  getMembershipExpiryInfo,
  calculateCustomerPurchases,
  getDiscountTierInfo,
} from '@/lib/membershipUtils';
import { QRCodeSVG } from 'qrcode.react';
import {
  Crown,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Percent,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  Receipt,
  User,
  ExternalLink,
} from 'lucide-react';

interface MemberDetailsModalProps {
  member: Membership | null;
  isOpen: boolean;
  onClose: () => void;
  onRenew: (member: Membership) => void;
  onExtend: (member: Membership) => void;
  onEdit: (member: Membership) => void;
}

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({
  member,
  isOpen,
  onClose,
  onRenew,
  onExtend,
  onEdit,
}) => {
  const { invoices, salesReturns, membershipSettings, updateMembershipStatus, setActiveTab } = usePharmacy();
  const [activeTab, setActiveTabState] = useState<'OVERVIEW' | 'SALES' | 'RETURNS' | 'HISTORY' | 'DISCOUNTS'>('OVERVIEW');

  if (!member) return null;

  const expiryInfo = getMembershipExpiryInfo(member, membershipSettings);
  const purchaseAgg = calculateCustomerPurchases(member.customerPhone, invoices, salesReturns, membershipSettings);
  const tierInfo = getDiscountTierInfo(purchaseAgg.rollingPurchases, membershipSettings, !expiryInfo.isExpired && expiryInfo.computedStatus !== 'SUSPENDED');

  const handleToggleSuspend = () => {
    if (member.status === 'SUSPENDED') {
      if (confirm(`Reactivate membership ${member.membershipId} for ${member.customerName}?`)) {
        updateMembershipStatus(member.id, 'ACTIVE', 'Reactivated by store manager.');
      }
    } else {
      const reason = prompt('Enter reason for membership suspension (optional):', 'Temporary suspension upon request');
      if (reason !== null) {
        updateMembershipStatus(member.id, 'SUSPENDED', reason);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Member Profile • ${member.membershipId}`}
      subtitle={`${member.customerName} (${member.customerPhone})`}
      maxWidth="5xl"
    >
      <div className="space-y-4">
        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-linear-to-r from-emerald-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {member.customerName}
                  </h3>
                  <Badge variant={expiryInfo.badgeColor as any} size="sm">
                    {expiryInfo.statusLabel}
                  </Badge>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                    tierInfo.tier === '20%'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                      : tierInfo.tier === '10%'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {tierInfo.percent}% Discount Tier
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                    {member.customerPhone}
                  </span>
                  {member.customerEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {member.customerEmail}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Valid: {member.startDate} → {member.expiryDate} ({member.durationLabel})
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={() => onRenew(member)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Renew
              </button>
              <button
                onClick={() => onExtend(member)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                Extend Days
              </button>
              <button
                onClick={handleToggleSuspend}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  member.status === 'SUSPENDED'
                    ? 'border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40'
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50'
                }`}
              >
                {member.status === 'SUSPENDED' ? (
                  <>
                    <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                    Reactivate
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                    Suspend
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 4 Compact Stat Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Rolling 3-Mo Purchases
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {formatINR(purchaseAgg.rollingPurchases)}
              </span>
              <span className="text-[10px] text-slate-400">Qualifying Period</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full ${tierInfo.tier === '20%' ? 'bg-purple-600' : 'bg-emerald-600'}`}
                style={{ width: `${Math.min(100, (purchaseAgg.rollingPurchases / membershipSettings.purchaseThreshold) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              {purchaseAgg.rollingPurchases >= membershipSettings.purchaseThreshold
                ? '★ Qualified for 20% Top Tier'
                : `${formatINR(tierInfo.amountNeededForHigherTier)} more needed for 20% tier`}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Lifetime Net Purchases
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {formatINR(purchaseAgg.totalLifetimePurchases)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{purchaseAgg.invoiceCount} Bills</span>
            </div>
            <p className="mt-3 text-[10px] text-slate-500">
              Avg Bill Value: <span className="font-bold text-slate-700 dark:text-slate-300">{formatINR(purchaseAgg.averagePurchaseValue)}</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Member Savings
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(purchaseAgg.totalSavings)}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">Discounts</span>
            </div>
            <p className="mt-3 text-[10px] text-slate-500">
              Returns Deducted: <span className="font-bold text-rose-600">{formatINR(purchaseAgg.totalReturns)}</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Days Remaining
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className={`text-xl font-black font-mono ${
                expiryInfo.daysRemaining <= 7
                  ? 'text-rose-600'
                  : expiryInfo.daysRemaining <= 30
                  ? 'text-amber-600'
                  : 'text-slate-900 dark:text-slate-100'
              }`}>
                {expiryInfo.daysRemaining} Days
              </span>
              <span className="text-[10px] text-slate-400">Expires: {member.expiryDate}</span>
            </div>
            <p className="mt-3 text-[10px] text-slate-500">
              Registered on: <span className="font-mono text-slate-600 dark:text-slate-400">{member.createdDate}</span>
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1">
          {[
            { id: 'OVERVIEW', label: 'Overview & Digital Card' },
            { id: 'SALES', label: `Sales History (${purchaseAgg.matchedInvoices.length})` },
            { id: 'RETURNS', label: `Returns History (${purchaseAgg.matchedReturns.length})` },
            { id: 'HISTORY', label: `Membership Timeline (${member.history?.length || 0})` },
            { id: 'DISCOUNTS', label: 'Discount History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabState(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Digital Membership ID Card */}
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-linear-to-br from-emerald-800 via-emerald-900 to-slate-950 text-white p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-600/20 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-emerald-700/60">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-white text-emerald-800 flex items-center justify-center font-black text-xs">
                      Rx
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-wider uppercase">BHALERAO MEDICAL</h4>
                      <p className="text-[9px] text-emerald-300">HEALTHCARE CLUB CARD</p>
                    </div>
                  </div>
                  <Crown className="h-5 w-5 text-amber-300" />
                </div>

                <div className="mt-4">
                  <p className="text-[10px] text-emerald-300 uppercase tracking-widest font-mono">MEMBERSHIP NUMBER</p>
                  <p className="text-lg font-mono font-black tracking-widest text-white mt-0.5">
                    {member.membershipId}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-emerald-300 uppercase">MEMBER NAME</p>
                    <p className="text-xs font-bold text-white truncate max-w-[170px]">{member.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-emerald-300 uppercase">DISCOUNT TIER</p>
                    <p className="text-xs font-black text-amber-300 font-mono">{tierInfo.percent}% OFF</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-700/60 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-emerald-300 uppercase">EXPIRY DATE</p>
                  <p className="text-[11px] font-mono font-bold text-white">{member.expiryDate}</p>
                </div>
                <div className="bg-white p-1 rounded-md">
                  <QRCodeSVG value={member.membershipId} size={48} level="M" />
                </div>
              </div>
            </div>

            {/* Member Profile Details & Policy */}
            <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Customer & Registration Details
                </h4>
                <div className="mt-2.5 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Customer Full Name</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{member.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Primary Phone</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">{member.customerPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Address</span>
                    <span className="text-slate-800 dark:text-slate-200">{member.customerEmail || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Delivery / Residential Address</span>
                    <span className="text-slate-800 dark:text-slate-200">{member.customerAddress || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Enrolled On</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{member.createdDate} (by {member.createdBy})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Membership Duration</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{member.durationLabel}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Rolling 3-Month Discount Tier Policy
                </h4>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  The discount tier is evaluated on net purchases during the preceding 3 months.
                  Members with rolling purchases below ₹{membershipSettings.purchaseThreshold.toLocaleString('en-IN')} receive a <strong>{membershipSettings.lowerTierDiscountPercent}%</strong> discount.
                  Reaching or exceeding exactly ₹{membershipSettings.purchaseThreshold.toLocaleString('en-IN')} elevates the member to <strong>{membershipSettings.higherTierDiscountPercent}%</strong> discount.
                </p>
                {member.notes && (
                  <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Notes:</span>
                    <span className="text-slate-600 dark:text-slate-400">{member.notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Sales History */}
        {activeTab === 'SALES' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Invoice Number</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Items</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-right">Member Disc.</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {purchaseAgg.matchedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                        No sales transactions recorded for this member yet.
                      </td>
                    </tr>
                  ) : (
                    purchaseAgg.matchedInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-bold text-emerald-700 dark:text-emerald-400">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {inv.invoiceDate.split(' ')[0]}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-sans">
                          {inv.items.length} item{inv.items.length > 1 ? 's' : ''}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                          {formatINR(inv.subTotal)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                          {inv.membershipDiscountAmount ? formatINR(inv.membershipDiscountAmount) : formatINR(inv.totalDiscount)}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-slate-100">
                          {formatINR(inv.grandTotal)}
                        </td>
                        <td className="py-2 px-3 font-sans text-[11px]">
                          {inv.paymentMode}
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            {inv.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Returns History */}
        {activeTab === 'RETURNS' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Return Number</th>
                    <th className="py-2.5 px-3">Return Date</th>
                    <th className="py-2.5 px-3">Original Invoice</th>
                    <th className="py-2.5 px-3">Refund Mode</th>
                    <th className="py-2.5 px-3 text-right">Refund Amount</th>
                    <th className="py-2.5 px-3">Processed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {purchaseAgg.matchedReturns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                        No sales returns on record for this customer.
                      </td>
                    </tr>
                  ) : (
                    purchaseAgg.matchedReturns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-bold text-rose-600 dark:text-rose-400">
                          {ret.returnNumber}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {ret.returnDate.split(' ')[0]}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300">
                          {ret.originalInvoiceNumber}
                        </td>
                        <td className="py-2 px-3 font-sans text-[11px]">
                          {ret.refundMode}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-rose-600">
                          -{formatINR(ret.totalRefundAmount)}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-400">
                          {ret.processedBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Membership History Timeline */}
        {activeTab === 'HISTORY' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 max-h-[380px] overflow-y-auto">
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {(member.history || []).map((h) => (
                <div key={h.id} className="relative">
                  <span className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                    h.action === 'CREATED' ? 'bg-emerald-600' :
                    h.action === 'RENEWED' ? 'bg-blue-600' :
                    h.action === 'EXTENDED' ? 'bg-cyan-600' :
                    h.action === 'SUSPENDED' ? 'bg-amber-600' :
                    h.action === 'PURCHASE_APPLIED' ? 'bg-purple-600' : 'bg-slate-400'
                  }`} />
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                        {h.action.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{h.date}</span>
                    </div>
                    {h.notes && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-normal">
                        {h.notes}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>By: <strong>{h.performedBy}</strong></span>
                      {h.newExpiryDate && (
                        <span>Expiry: <strong>{h.newExpiryDate}</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Discount History */}
        {activeTab === 'DISCOUNTS' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Invoice Number</th>
                    <th className="py-2.5 px-3">Bill Total</th>
                    <th className="py-2.5 px-3 text-right">Discount Given</th>
                    <th className="py-2.5 px-3">Effective Tier</th>
                    <th className="py-2.5 px-3">Cashier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {purchaseAgg.matchedInvoices.filter((i) => (i.totalDiscount || 0) > 0).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                        No discounts applied on invoices yet for this member.
                      </td>
                    </tr>
                  ) : (
                    purchaseAgg.matchedInvoices
                      .filter((i) => (i.totalDiscount || 0) > 0)
                      .map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                            {inv.invoiceDate.split(' ')[0]}
                          </td>
                          <td className="py-2 px-3 font-bold text-emerald-700 dark:text-emerald-400">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            {formatINR(inv.grandTotal)}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                            {inv.membershipDiscountAmount ? formatINR(inv.membershipDiscountAmount) : formatINR(inv.totalDiscount)}
                          </td>
                          <td className="py-2 px-3 font-sans">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                              {inv.membershipTier || `${inv.membershipDiscountPercent || 10}% Tier`}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-400">
                            {inv.cashierName}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
