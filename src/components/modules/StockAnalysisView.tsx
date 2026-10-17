'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { StatCard } from '@/components/common/StatCard';
import { TrendingUp, Activity, AlertTriangle, Layers, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const StockAnalysisView: React.FC = () => {
  const { medicines, invoices } = usePharmacy();
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'FAST' | 'SLOW' | 'DEAD' | 'OVERSTOCK'>('ALL');

  // Compute movement velocity for each medicine
  const analyzedMedicines = medicines.map((med) => {
    const totalStock = med.batches.reduce((sum, b) => sum + b.availableQuantity, 0);
    const soldQty = invoices
      .flatMap((i) => i.items)
      .filter((item) => item.medicineId === med.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    const stockValue = med.batches.reduce((sum, b) => sum + b.availableQuantity * b.purchaseRate, 0);

    let movementType: 'FAST' | 'SLOW' | 'DEAD' | 'OVERSTOCK' = 'SLOW';
    if (soldQty >= 5) movementType = 'FAST';
    else if (totalStock > med.maxStockLevel) movementType = 'OVERSTOCK';
    else if (soldQty === 0 && totalStock > 30) movementType = 'DEAD';
    else movementType = 'SLOW';

    return {
      ...med,
      totalStock,
      soldQty,
      stockValue,
      movementType,
      turnoverRatio: totalStock > 0 ? (soldQty / totalStock).toFixed(2) : '0.00',
    };
  });

  const fastMoving = analyzedMedicines.filter((m) => m.movementType === 'FAST');
  const slowMoving = analyzedMedicines.filter((m) => m.movementType === 'SLOW');
  const deadStock = analyzedMedicines.filter((m) => m.movementType === 'DEAD');
  const overstock = analyzedMedicines.filter((m) => m.movementType === 'OVERSTOCK');

  const filtered = analyzedMedicines.filter((m) => {
    if (selectedTab === 'ALL') return true;
    return m.movementType === selectedTab;
  });

  // Chart data: Manufacturer share
  const mfgMap: Record<string, number> = {};
  medicines.forEach((m) => {
    mfgMap[m.manufacturer] = (mfgMap[m.manufacturer] || 0) + m.totalStock;
  });
  const mfgChartData = Object.entries(mfgMap).map(([name, value]) => ({
    name: name.split(' ')[0],
    value,
  }));

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Advanced Stock Analytics & Inventory Turnover (ABC Analysis)
          </h2>
          <p className="text-xs text-slate-500">
            Identify fast-selling drugs, optimize working capital, and eliminate dead stock holding costs.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Fast Moving (High Velocity)"
          value={fastMoving.length}
          subtitle="Top 80% sales volume"
          icon={<Activity className="h-5 w-5" />}
          color="emerald"
          onClick={() => setSelectedTab('FAST')}
        />
        <StatCard
          title="Slow Moving"
          value={slowMoving.length}
          subtitle="Normal replenishment cycle"
          icon={<Layers className="h-5 w-5" />}
          color="blue"
          onClick={() => setSelectedTab('SLOW')}
        />
        <StatCard
          title="Dead Stock (Zero Sales)"
          value={deadStock.length}
          subtitle="No movement in 30 days"
          icon={<AlertTriangle className="h-5 w-5" />}
          color="rose"
          onClick={() => setSelectedTab('DEAD')}
        />
        <StatCard
          title="Overstock (> Max Level)"
          value={overstock.length}
          subtitle="Excess cash locked"
          icon={<BarChart2 className="h-5 w-5" />}
          color="amber"
          onClick={() => setSelectedTab('OVERSTOCK')}
        />
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">
            Stock Volume by Manufacturer Pharma Depot
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mfgChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="value" name="Stock Units" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Inventory Movement Health Ratio
            </h3>
            <p className="text-xs text-slate-500">Distribution by velocity class</p>
          </div>

          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Fast Moving', value: fastMoving.length },
                    { name: 'Slow Moving', value: slowMoving.length },
                    { name: 'Dead Stock', value: deadStock.length },
                    { name: 'Overstock', value: overstock.length },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={45}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1 text-emerald-600">● Fast</span>
            <span className="flex items-center gap-1 text-blue-600">● Slow</span>
            <span className="flex items-center gap-1 text-rose-600">● Dead</span>
            <span className="flex items-center gap-1 text-amber-600">● Overstock</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Data Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          {(['ALL', 'FAST', 'SLOW', 'DEAD', 'OVERSTOCK'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedTab === tab
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab} ({analyzedMedicines.filter((m) => tab === 'ALL' || m.movementType === tab).length})
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-slate-400 uppercase text-[10px]">
                <th className="p-2.5">Medicine</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5 text-center">Class</th>
                <th className="p-2.5 text-center">Stock In Hand</th>
                <th className="p-2.5 text-center">Recent Sold</th>
                <th className="p-2.5 text-center">Turnover Rate</th>
                <th className="p-2.5 text-right">Holding Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{m.name}</p>
                    <p className="text-[10px] text-slate-500">{m.genericName}</p>
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">{m.category}</td>
                  <td className="p-2.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                        m.movementType === 'FAST'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : m.movementType === 'DEAD'
                          ? 'bg-rose-500/10 text-rose-600'
                          : m.movementType === 'OVERSTOCK'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-blue-500/10 text-blue-600'
                      }`}
                    >
                      {m.movementType}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-slate-900 dark:text-slate-100">{m.totalStock}</td>
                  <td className="p-2.5 text-center font-mono font-bold text-emerald-600">{m.soldQty}</td>
                  <td className="p-2.5 text-center font-mono text-slate-500">{m.turnoverRatio}x</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    ₹{m.stockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
