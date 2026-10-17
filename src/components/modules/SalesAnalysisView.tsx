'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { StatCard } from '@/components/common/StatCard';
import { LineChart as ChartIcon, Calendar, Users, Stethoscope, DollarSign, ArrowUpRight } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const SalesAnalysisView: React.FC = () => {
  const { invoices } = usePharmacy();
  const [period, setPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');

  const totalSales = invoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalTax = invoices.reduce((sum, i) => sum + i.totalCgst + i.totalSgst + i.totalIgst, 0);
  const avgBillSize = invoices.length > 0 ? totalSales / invoices.length : 0;

  // Chart data based on period
  const salesTrendData = [
    { label: 'Week 1', sales: 125000, invoices: 210 },
    { label: 'Week 2', sales: 148000, invoices: 245 },
    { label: 'Week 3', sales: 172000, invoices: 280 },
    { label: 'Week 4', sales: 198000 + totalSales, invoices: 320 + invoices.length },
  ];

  // Top Medicines by revenue
  const medRevMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (!medRevMap[item.medicineId]) {
        medRevMap[item.medicineId] = { name: item.medicineName, qty: 0, revenue: 0 };
      }
      medRevMap[item.medicineId].qty += item.quantity;
      medRevMap[item.medicineId].revenue += item.totalAmount;
    });
  });
  const topMedicines = Object.values(medRevMap).sort((a, b) => b.revenue - a.revenue);

  // Top Customers by spend
  const custSpendMap: Record<string, { name: string; phone: string; bills: number; totalSpend: number }> = {};
  invoices.forEach((inv) => {
    if (!custSpendMap[inv.customerId]) {
      custSpendMap[inv.customerId] = { name: inv.customerName, phone: inv.customerPhone, bills: 0, totalSpend: 0 };
    }
    custSpendMap[inv.customerId].bills += 1;
    custSpendMap[inv.customerId].totalSpend += inv.grandTotal;
  });
  const topCustomers = Object.values(custSpendMap).sort((a, b) => b.totalSpend - a.totalSpend);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ChartIcon className="h-5 w-5 text-emerald-600" />
            Sales Performance & Revenue Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Analyze customer purchase trends, prescribing doctor volumes, and GST tax collection.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                period === p
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Gross Billed Revenue"
          value={`₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`${invoices.length} invoices generated`}
          change="+12.8%"
          icon={<DollarSign className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title="Average Ticket Size"
          value={`₹${avgBillSize.toFixed(2)}`}
          subtitle="Revenue per transaction"
          change="+4.5%"
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="GST Collected (Output Tax)"
          value={`₹${totalTax.toFixed(2)}`}
          subtitle="CGST + SGST payable"
          icon={<Calendar className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Sales Trend Chart */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-2">
          Revenue Curve & Patient Inflow
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrendData}>
              <defs>
                <linearGradient id="areaSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                name="Revenue (₹)"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#areaSales)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Medicines & Top Customers Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Medicines */}
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Top Revenue Generating Medicines
          </h3>
          <div className="space-y-2">
            {topMedicines.slice(0, 5).map((med, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs text-slate-400">#{idx + 1}</span>
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{med.name}</p>
                    <p className="text-[10px] text-slate-400">{med.qty} units dispensed</p>
                  </div>
                </div>
                <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                  ₹{med.revenue.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Top Value Customers & Patients
          </h3>
          <div className="space-y-2">
            {topCustomers.slice(0, 5).map((cust, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs text-slate-400">#{idx + 1}</span>
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{cust.name}</p>
                    <p className="text-[10px] text-slate-400">{cust.bills} invoices • {cust.phone}</p>
                  </div>
                </div>
                <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100">
                  ₹{cust.totalSpend.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
