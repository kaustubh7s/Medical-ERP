'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { Membership } from '@/types/pharmacy';
import {
  formatINR,
  getMembershipExpiryInfo,
  calculateCustomerPurchases,
  getDiscountTierInfo,
} from '@/lib/membershipUtils';
import {
  Search,
  Filter,
  Download,
  RotateCcw,
  Eye,
  PlusCircle,
  PauseCircle,
  PlayCircle,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  Users,
} from 'lucide-react';

interface AllMembersTabProps {
  onSelectMember: (member: Membership) => void;
  onRenewMember: (member: Membership) => void;
  onExtendMember: (member: Membership) => void;
  onOpenCreate: () => void;
}

export const AllMembersTab: React.FC<AllMembersTabProps> = ({
  onSelectMember,
  onRenewMember,
  onExtendMember,
  onOpenCreate,
}) => {
  const { memberships, membershipSettings, invoices, salesReturns, updateMembershipStatus, resetMemberships } = usePharmacy();

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED'>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | '10' | '20'>('ALL');
  const [sortBy, setSortBy] = useState<'ID' | 'NAME' | 'EXPIRY' | 'ROLLING_PURCHASES' | 'DAYS_LEFT'>('EXPIRY');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const today = new Date();

  // Aggregate and filter
  const processedMembers = memberships.map((mem) => {
    const expiryInfo = getMembershipExpiryInfo(mem, membershipSettings, today);
    const purchaseAgg = calculateCustomerPurchases(mem.customerPhone, invoices, salesReturns, membershipSettings, today);
    const tierInfo = getDiscountTierInfo(
      purchaseAgg.rollingPurchases,
      membershipSettings,
      !expiryInfo.isExpired && mem.status !== 'SUSPENDED'
    );
    return {
      member: mem,
      expiryInfo,
      purchaseAgg,
      tierInfo,
    };
  });

  const filtered = processedMembers.filter(({ member, expiryInfo, tierInfo }) => {
    // Search filter
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      const matchName = member.customerName.toLowerCase().includes(term);
      const matchPhone = member.customerPhone.includes(term);
      const matchId = member.membershipId.toLowerCase().includes(term);
      if (!matchName && !matchPhone && !matchId) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE' && expiryInfo.computedStatus !== 'ACTIVE') return false;
      if (statusFilter === 'EXPIRING_SOON' && !expiryInfo.isExpiringSoon) return false;
      if (statusFilter === 'EXPIRED' && !expiryInfo.isExpired) return false;
      if (statusFilter === 'SUSPENDED' && member.status !== 'SUSPENDED') return false;
    }

    // Tier filter
    if (tierFilter === '10' && tierInfo.tier !== '10%') return false;
    if (tierFilter === '20' && tierInfo.tier !== '20%') return false;

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'ID') {
      comparison = a.member.membershipId.localeCompare(b.member.membershipId);
    } else if (sortBy === 'NAME') {
      comparison = a.member.customerName.localeCompare(b.member.customerName);
    } else if (sortBy === 'EXPIRY') {
      comparison = a.member.expiryDate.localeCompare(b.member.expiryDate);
    } else if (sortBy === 'ROLLING_PURCHASES') {
      comparison = a.purchaseAgg.rollingPurchases - b.purchaseAgg.rollingPurchases;
    } else if (sortBy === 'DAYS_LEFT') {
      comparison = a.expiryInfo.daysRemaining - b.expiryInfo.daysRemaining;
    }
    return sortOrder === 'ASC' ? comparison : -comparison;
  });

  // Pagination slice
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedMembers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: 'ID' | 'NAME' | 'EXPIRY' | 'ROLLING_PURCHASES' | 'DAYS_LEFT') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const handleExportCSV = () => {
    let csv = 'Membership ID,Customer Name,Mobile Number,Start Date,Expiry Date,Days Remaining,Duration,Rolling 3-Mo Purchases (₹),Discount Tier,Lifetime Purchases (₹),Status\n';

    filtered.forEach(({ member, expiryInfo, purchaseAgg, tierInfo }) => {
      csv += `"${member.membershipId}","${member.customerName}","${member.customerPhone}","${member.startDate}","${member.expiryDate}",${expiryInfo.daysRemaining},"${member.durationLabel}",${purchaseAgg.rollingPurchases.toFixed(2)},"${tierInfo.percent}% Tier",${purchaseAgg.totalLifetimePurchases.toFixed(2)},"${expiryInfo.statusLabel}"\n`;
    });

    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csv}`);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Members_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleSuspend = (mem: Membership) => {
    if (mem.status === 'SUSPENDED') {
      if (confirm(`Reactivate membership ${mem.membershipId} for ${mem.customerName}?`)) {
        updateMembershipStatus(mem.id, 'ACTIVE', 'Reactivated by store staff.');
      }
    } else {
      const reason = prompt('Reason for suspension (optional):', 'Temporary admin hold');
      if (reason !== null) {
        updateMembershipStatus(mem.id, 'SUSPENDED', reason);
      }
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Header and Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Registered Membership Directory
          </h2>
          <p className="text-xs text-slate-500">
            Showing {filtered.length} of {memberships.length} enrolled pharmacy customers
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              if (confirm('Reset all memberships to clean initial dataset (Rajesh, Sunita, Anand) and clean duplicate members?')) {
                resetMemberships();
              }
            }}
            title="Reset all memberships to clean initial dataset"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors shadow-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset All Members
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Enroll New Member
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by Mobile, Name, or ID..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as any);
            setCurrentPage(1);
          }}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
        >
          <option value="ALL">All Membership Statuses</option>
          <option value="ACTIVE">Active Members</option>
          <option value="EXPIRING_SOON">Expiring Soon (≤30d)</option>
          <option value="EXPIRED">Expired Members</option>
          <option value="SUSPENDED">Suspended Members</option>
        </select>

        {/* Tier Filter */}
        <select
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value as any);
            setCurrentPage(1);
          }}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
        >
          <option value="ALL">All Discount Tiers</option>
          <option value="10">10% Tier (&lt; ₹3,000)</option>
          <option value="20">20% Tier (≥ ₹3,000)</option>
        </select>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-1.5">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
          >
            <option value="EXPIRY">Sort by Expiry Date</option>
            <option value="DAYS_LEFT">Sort by Days Remaining</option>
            <option value="ROLLING_PURCHASES">Sort by Rolling Purchases</option>
            <option value="NAME">Sort by Customer Name</option>
            <option value="ID">Sort by Member ID</option>
          </select>
          <button
            onClick={() => setSortOrder((p) => (p === 'ASC' ? 'DESC' : 'ASC'))}
            className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50"
            title={`Toggle order: current ${sortOrder}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Directory Table (Desktop Only - Strictly Preserved) */}
      <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3 cursor-pointer" onClick={() => handleSort('ID')}>
                  Member ID
                </th>
                <th className="py-2.5 px-3 cursor-pointer" onClick={() => handleSort('NAME')}>
                  Customer Name
                </th>
                <th className="py-2.5 px-3">Mobile</th>
                <th className="py-2.5 px-3 cursor-pointer" onClick={() => handleSort('EXPIRY')}>
                  Validity / Expiry
                </th>
                <th className="py-2.5 px-3 text-center cursor-pointer" onClick={() => handleSort('DAYS_LEFT')}>
                  Days Left
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer" onClick={() => handleSort('ROLLING_PURCHASES')}>
                  Rolling 3-Mo Purchases
                </th>
                <th className="py-2.5 px-3 text-center">Tier</th>
                <th className="py-2.5 px-3 text-right">Lifetime Total</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 font-sans">
                    No matching member records found. Try adjusting your search query or filters.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map(({ member, expiryInfo, purchaseAgg, tierInfo }) => (
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
                      <div>{member.expiryDate}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{member.durationLabel}</div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`font-bold ${
                          expiryInfo.daysRemaining <= 7
                            ? 'text-rose-600'
                            : expiryInfo.daysRemaining <= 30
                            ? 'text-amber-600'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {expiryInfo.daysRemaining}d
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(purchaseAgg.rollingPurchases)}
                    </td>
                    <td className="py-2 px-3 text-center font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          tierInfo.tier === '20%'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                            : tierInfo.tier === '10%'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tierInfo.percent}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                      {formatINR(purchaseAgg.totalLifetimePurchases)}
                    </td>
                    <td className="py-2 px-3 text-center font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          expiryInfo.computedStatus === 'EXPIRED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : expiryInfo.isExpiringSoon
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : expiryInfo.computedStatus === 'SUSPENDED'
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {expiryInfo.statusLabel}
                      </span>
                    </td>
                    <td
                      className="py-2 px-3 text-right font-sans whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectMember(member)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="View Complete Profile & Invoices"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onRenewMember(member)}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                          title="Renew Membership"
                        >
                          Renew
                        </button>
                        <button
                          onClick={() => onExtendMember(member)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Extend Days"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleSuspend(member)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={member.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                        >
                          {member.status === 'SUSPENDED' ? (
                            <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Page <strong className="text-slate-900 dark:text-slate-100">{currentPage}</strong> of{' '}
            <strong className="text-slate-900 dark:text-slate-100">{totalPages}</strong> ({filtered.length} members)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          Dedicated Mobile Members Cards List (Zero Horizontal Scroll!)
         ========================================================================= */}
      <div className="md:hidden space-y-2.5">
        {paginatedMembers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30 text-emerald-600" />
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No member records found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          paginatedMembers.map(({ member, expiryInfo, purchaseAgg, tierInfo }) => (
            <div
              key={member.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5"
            >
              {/* Header: ID, Status, Days left */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-400">
                  {member.membershipId}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                    expiryInfo.isExpired
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : member.status === 'SUSPENDED'
                      ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      : expiryInfo.daysRemaining <= 30
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {expiryInfo.statusLabel}
                </span>
              </div>

              {/* Customer Name & Phone */}
              <div>
                <h4
                  onClick={() => onSelectMember(member)}
                  className="font-bold text-xs text-slate-900 dark:text-slate-100 hover:text-emerald-700 cursor-pointer"
                >
                  {member.customerName}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  📞 {member.customerPhone} • Valid till: {member.expiryDate}
                </p>
              </div>

              {/* 2 Metrics: Tier & Purchases */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] uppercase text-slate-400 font-sans block">Discount Tier</span>
                  <span className={`font-black ${tierInfo.tier === '20%' ? 'text-purple-700 dark:text-purple-300' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {tierInfo.percent}% Tier {tierInfo.tier === '20%' ? '★' : ''}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] uppercase text-slate-400 font-sans block">3-Mo Purchases</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatINR(purchaseAgg.rollingPurchases)}
                  </span>
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  onClick={() => onSelectMember(member)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  View Details
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onRenewMember(member)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] shadow-xs flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Renew</span>
                  </button>
                  <button
                    onClick={() => handleToggleSuspend(member)}
                    className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100"
                    title={member.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                  >
                    {member.status === 'SUSPENDED' ? (
                      <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
