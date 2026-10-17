'use client';

import React from 'react';
import { usePharmacy } from '@/lib/store';
import { StatCard } from '@/components/common/StatCard';
import { BadgePercent, TrendingUp, DollarSign, Wallet, FileText, ArrowDownRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const ProfitLossView: React.FC = () => {
  const { invoices, expenses, medicines } = usePharmacy();

  // Gross Revenue
  const totalRevenue = invoices.reduce((sum, i) => sum + i.grandTotal, 0);

  // Total COGS
  const totalCogs = invoices.reduce((sum, inv) => {
    return sum + inv.items.reduce((iSum, item) => iSum + item.costRate * item.quantity, 0);
  }, 0);

  const grossProfit = totalRevenue - totalCogs;
  const grossMarginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Total Operating Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const netMarginPercent = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Simulated Monthly Comparison
  const pnlMonthlyData = [
    { month: 'Apr', revenue: 420000, cogs: 315000, expenses: 48000, netProfit: 57000 },
    { month: 'May', revenue: 485000, cogs: 360000, expenses: 51000, netProfit: 74000 },
    { month: 'Jun', revenue: 512000, cogs: 382000, expenses: 54000, netProfit: 76000 },
    { month: 'Jul', revenue: 590000, cogs: 435000, expenses: 58000, netProfit: 97000 },
    {
      month: 'Aug (Current)',
      revenue: 645000 + totalRevenue,
      cogs: 480000 + totalCogs,
      expenses: 62000 + totalExpenses,
      netProfit: 103000 + netProfit,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BadgePercent className="h-5 w-5 text-emerald-600" />
            Profit & Loss (P&L) Statement & Financial Margins
          </h2>
          <p className="text-xs text-slate-500">
            Real-time Gross Profit (Revenue - COGS) and Net Profit after deducting shop operational overheads.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Gross Revenue"
          value={`₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Net sales receipts"
          icon={<DollarSign className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title="Cost of Goods Sold (COGS)"
          value={`₹${totalCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Purchased medicine cost"
          icon={<Wallet className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Gross Profit"
          value={`₹${grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`Gross Margin: ${grossMarginPercent}%`}
          change={`+${grossMarginPercent}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="cyan"
        />
        <StatCard
          title="Net Profit (After Expenses)"
          value={`₹${netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`Net Margin: ${netMarginPercent}%`}
          icon={<BadgePercent className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Visual Revenue vs Expense vs Net Profit Comparison */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-3">
          Monthly P&L Comparison: Revenue vs COGS vs Expenses vs Net Profit
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pnlMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip
                formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <Legend />
              <Bar dataKey="revenue" name="Total Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cogs" name="COGS (Stock Cost)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Operating Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="netProfit" name="Net Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed P&L Income Statement Breakdown */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
          Executive Income Statement
        </h3>

        <div className="space-y-2 text-xs font-mono">
          {/* Revenue */}
          <div className="flex justify-between p-2.5 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold">
            <span>[+] Gross Sales Revenue:</span>
            <span>₹{totalRevenue.toFixed(2)}</span>
          </div>

          {/* COGS */}
          <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <span>[-] Cost of Goods Sold (COGS):</span>
            <span>-₹{totalCogs.toFixed(2)}</span>
          </div>

          {/* Gross Profit */}
          <div className="flex justify-between p-2.5 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold">
            <span>[=] Gross Profit:</span>
            <span>₹{grossProfit.toFixed(2)} ({grossMarginPercent}%)</span>
          </div>

          {/* Operating Expenses */}
          <div className="flex justify-between p-2.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300">
            <span>[-] Total Operational Expenses (Rent, Salary, Bills):</span>
            <span>-₹{totalExpenses.toFixed(2)}</span>
          </div>

          {/* Net Profit */}
          <div className="flex justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm">
            <span>[=] Net Profit Before Tax:</span>
            <span>₹{netProfit.toFixed(2)} ({netMarginPercent}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
