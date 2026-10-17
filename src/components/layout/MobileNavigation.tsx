'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  Menu,
  X,
  CalendarCheck,
  FileSpreadsheet,
  Clock,
  PackageCheck,
  Receipt,
  Settings,
  PlusCircle,
  TrendingUp,
} from 'lucide-react';

export const MobileNavigation: React.FC = () => {
  const { activeTab, setActiveTab, heldBills, medicines, customers, settings, currentUser } = usePharmacy();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const lowStockCount = medicines.filter(
    (m) => m.batches.reduce((sum, b) => sum + b.availableQuantity, 0) <= m.reorderLevel
  ).length;

  const dueCustomersCount = customers.filter((c) => c.currentDue > 0).length;

  const menuItems = [
    { id: 'dashboard', label: 'Owner Daily Desk', icon: LayoutDashboard },
    { id: 'pos', label: 'POS Counter Billing', icon: ShoppingCart },
    { id: 'membership', label: 'Customer Membership', icon: Users },
    { id: 'inventory', label: 'Inventory & Stock Batches', icon: Boxes },
    { id: 'customers', label: 'Patient Khata & CRM', icon: Users },
    { id: 'day-closing', label: 'Day Closing & Cash Drawer', icon: CalendarCheck },
    { id: 'reports', label: 'Accountant Registers & Reports', icon: FileSpreadsheet },
    { id: 'purchases', label: 'Purchase Inward GRN', icon: PackageCheck },
    { id: 'expiry', label: 'Expiry & Near-Expiry Radar', icon: Clock },
    { id: 'invoices', label: 'Sales Invoices Register', icon: Receipt },
    { id: 'stock-analysis', label: 'Fast/Slow Stock Analysis', icon: TrendingUp },
    { id: 'settings', label: 'Store Settings & Backup', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Top Header (Visible only on mobile screens < 768px) */}
      <header className="md:hidden sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
            Rx
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase truncate max-w-[170px]">
              {settings.storeName.split(' ')[0]} PHARMA
            </h1>
            <p className="text-[10px] text-emerald-700 font-bold">
              Owner: {currentUser.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick POS Billing button */}
          <button
            onClick={() => setActiveTab('pos')}
            className="px-2.5 py-1 rounded bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1"
          >
            <ShoppingCart className="h-3 w-3" />
            <span>Bill</span>
          </button>

          {/* More Drawer Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Fixed Touch Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 flex items-center justify-around py-1.5 px-1 shadow-lg">
        {/* 1. POS Billing (Primary Touch Target) */}
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded transition-all ${
            activeTab === 'pos' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {heldBills.length > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-600 text-white text-[8px] font-bold flex items-center justify-center">
                {heldBills.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Billing</span>
        </button>

        {/* 2. Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded transition-all ${
            activeTab === 'dashboard' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Desk</span>
        </button>

        {/* 3. Inventory */}
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded transition-all ${
            activeTab === 'inventory' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <Boxes className="h-5 w-5" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-rose-600 text-white text-[8px] font-bold flex items-center justify-center">
                {lowStockCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Stock</span>
        </button>

        {/* 4. Patients */}
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded transition-all ${
            activeTab === 'customers' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <Users className="h-5 w-5" />
            {dueCustomersCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-600 text-white text-[8px] font-bold flex items-center justify-center">
                {dueCustomersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Patients</span>
        </button>

        {/* 5. More Menu Drawer */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center justify-center w-16 py-1 rounded text-slate-500 hover:text-slate-800"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </div>

      {/* Full-Screen Mobile Drawer */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl max-h-[85vh] overflow-y-auto p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase">
                  {settings.storeName}
                </h3>
                <p className="text-[11px] text-slate-500">Logged in: {currentUser.name} (Owner)</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isCurrent = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsDrawerOpen(false);
                    }}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between h-20 transition-all ${
                      isCurrent
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isCurrent ? 'text-white' : 'text-emerald-700'}`} />
                    <span className="text-xs font-bold leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
