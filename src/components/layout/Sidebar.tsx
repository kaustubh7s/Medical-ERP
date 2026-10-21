'use client';

import React from 'react';
import { usePharmacy } from '@/lib/store';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  RotateCcw,
  PackageCheck,
  Undo2,
  Boxes,
  Pill,
  Clock,
  TrendingUp,
  LineChart,
  BadgePercent,
  WalletCards,
  FileSpreadsheet,
  Coins,
  QrCode,
  Users,
  Building2,
  UserCog,
  FileBarChart2,
  History,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Crosshair,
  Crown,
  UserPlus,
  SlidersHorizontal,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey?: string;
  badge?: string;
  badgeColor?: 'rose' | 'amber' | 'purple';
}

interface NavCategory {
  label: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    toggleSidebar,
    medicines,
    settings,
    heldBills,
    memberships,
  } = usePharmacy();

  const lowStockCount = medicines.filter(
    (m) => m.batches.reduce((sum, b) => sum + b.availableQuantity, 0) <= m.reorderLevel
  ).length;

  const nearExpiryCount = medicines.reduce((acc, m) => {
    const today = new Date();
    const count = m.batches.filter((b) => {
      const diff = Math.ceil((new Date(b.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 90 && b.availableQuantity > 0;
    }).length;
    return acc + count;
  }, 0);

  const expiringMembersCount = (memberships || []).filter((m) => {
    if (m.status === 'SUSPENDED' || m.status === 'CANCELLED') return false;
    const diff = Math.ceil((new Date(m.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 30;
  }).length;

  const navCategories: NavCategory[] = [
    {
      label: 'Counter Operations',
      items: [
        { id: 'dashboard', label: '1. Dashboard Desk', icon: LayoutDashboard },
        { id: 'pos', label: '2. POS Billing', icon: ShoppingCart, hotkey: 'Shift+F2', badge: heldBills.length > 0 ? `${heldBills.length} Parked` : undefined, badgeColor: 'amber' },
        { id: 'invoices', label: 'Sales Invoices', icon: Receipt },
        { id: 'sales-returns', label: '3. Sales Returns', icon: RotateCcw },
        { id: 'day-closing', label: 'Day Closing Register', icon: CalendarCheck, hotkey: 'Shift+F9' },
      ],
    },
    {
      label: 'Membership',
      items: [
        {
          id: 'membership',
          label: 'Customer Membership',
          icon: Crown,
          badge: expiringMembersCount > 0 ? `${expiringMembersCount} Alert` : undefined,
          badgeColor: 'amber',
        },
      ],
    },
    {
      label: 'Inventory & Expiry',
      items: [
        { id: 'inventory', label: '6. Inventory & Racks', icon: Boxes, badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined, badgeColor: 'rose' },
        { id: 'medicines', label: '13. Medicine Master', icon: Pill },
        { id: 'expiry', label: '9. Expiry Management', icon: Clock, badge: nearExpiryCount > 0 ? `${nearExpiryCount} Alert` : undefined, badgeColor: 'amber' },
        { id: 'stock-analysis', label: '7. Stock Analysis', icon: TrendingUp },
      ],
    },
    {
      label: 'Procurement & Vendors',
      items: [
        { id: 'purchases', label: '4. Purchases (GRN)', icon: PackageCheck },
        { id: 'purchase-returns', label: '5. Purchase Returns', icon: Undo2 },
        { id: 'suppliers', label: '16. Suppliers Catalog', icon: Building2 },
      ],
    },
    {
      label: 'Accounting & Ledgers',
      items: [
        { id: 'reports', label: '21. Reports & Registers', icon: FileBarChart2 },
        { id: 'pnl', label: '11. Profit & Loss (P&L)', icon: BadgePercent },
        { id: 'payments', label: '12. Payments & Ledgers', icon: WalletCards },
        { id: 'expenses', label: '17. Expense Tracker', icon: Coins },
        { id: 'gst', label: '18. GST Tax Module', icon: FileSpreadsheet },
      ],
    },
    {
      label: 'Customers & Tools',
      items: [
        { id: 'customers', label: '15. Customer CRM', icon: Users },
        { id: 'sales-analysis', label: '8. Sales Analytics', icon: LineChart },
        { id: 'barcode', label: '14. Barcode Studio', icon: QrCode },
        { id: 'ai-assistant', label: '24. AI Reorder Suite', icon: Sparkles },
      ],
    },
    {
      label: 'Administration',
      items: [
        { id: 'roles', label: '19. User Access Matrix', icon: UserCog },
        { id: 'audit', label: '22. Audit Trail Logs', icon: History },
        { id: 'settings', label: '23. Backup & Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 z-40 shrink-0 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-12 items-center justify-between border-b border-slate-300 dark:border-slate-800 px-3 bg-slate-50 dark:bg-slate-950">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-2 truncate">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-700 text-white font-bold text-xs shadow-xs">
              Rx
            </div>
            <div className="truncate">
              <h1 className="text-xs font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                {settings.storeName.split(' ')[0]} PHARMA
              </h1>
              <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                ERP v2.4 OPERATIONAL
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded bg-emerald-700 text-white font-bold text-xs">
            Rx
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navCategories.map((cat, catIdx) => (
          <div key={catIdx} className="space-y-0.5">
            {!sidebarCollapsed && (
              <p className="px-2 text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                {cat.label}
              </p>
            )}
            <div className="space-y-0.5 pt-0.5">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      {!sidebarCollapsed && <span className="truncate text-[11.5px]">{item.label}</span>}
                    </div>

                    {!sidebarCollapsed && (
                      <div className="flex items-center gap-1">
                        {item.hotkey && (
                          <span
                            className={`rounded px-1 py-0.2 text-[9px] font-mono font-bold ${
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {item.hotkey}
                          </span>
                        )}
                        {item.badge && (
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                              item.badgeColor === 'rose'
                                ? 'bg-rose-100 text-rose-700'
                                : item.badgeColor === 'amber'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {!sidebarCollapsed && (
        <div className="border-t border-slate-300 dark:border-slate-800 p-2 bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 font-mono">
          <p className="truncate">DL: {settings.drugLicenseNumber}</p>
          <p className="truncate">GST: {settings.gstNumber}</p>
        </div>
      )}
    </aside>
  );
};
