'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { History, Search, ShieldCheck, Filter } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = usePharmacy();
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  const filtered = auditLogs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.module.toLowerCase().includes(search.toLowerCase());

    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            Immutable Audit Trail & System Security Logs ({auditLogs.length})
          </h2>
          <p className="text-xs text-slate-500">
            Chronological audit log tracking sales invoices, stock reconciliations, price alterations, and user logins.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit descriptions, users, modules..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
          />
        </div>

        <div>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="ALL">All Actions</option>
            <option value="SALE">SALE</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="STOCK_ADJUST">STOCK_ADJUST</option>
            <option value="PRICE_CHANGE">PRICE_CHANGE</option>
            <option value="RETURN">RETURN</option>
            <option value="LOGIN">LOGIN</option>
            <option value="BACKUP">BACKUP</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-slate-400 uppercase text-[10px]">
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">User</th>
                <th className="p-2.5 text-center">Action</th>
                <th className="p-2.5">Module</th>
                <th className="p-2.5">Event Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                  <td className="p-2.5 font-sans font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {log.userName}{' '}
                    <span className="text-[9px] font-mono text-slate-400">({log.userRole})</span>
                  </td>
                  <td className="p-2.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                        log.action === 'SALE'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : log.action === 'STOCK_ADJUST'
                          ? 'bg-amber-500/10 text-amber-600'
                          : log.action === 'PRICE_CHANGE'
                          ? 'bg-purple-500/10 text-purple-600'
                          : log.action === 'RETURN'
                          ? 'bg-rose-500/10 text-rose-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="p-2.5 font-sans font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {log.module}
                  </td>
                  <td className="p-2.5 font-sans text-slate-600 dark:text-slate-400">
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
