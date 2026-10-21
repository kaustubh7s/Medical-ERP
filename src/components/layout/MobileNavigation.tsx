'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePharmacy } from '@/lib/store';
import { UserRole } from '@/types/pharmacy';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  RotateCcw,
  CalendarCheck,
  Crown,
  Boxes,
  Pill,
  Clock,
  TrendingUp,
  PackageCheck,
  Undo2,
  Building2,
  FileBarChart2,
  BadgePercent,
  WalletCards,
  Coins,
  FileSpreadsheet,
  Users,
  LineChart,
  QrCode,
  Sparkles,
  UserCog,
  History,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Menu,
  X,
  Check,
  ChevronRight,
  PlusCircle,
  Smartphone,
  ChevronDown,
} from 'lucide-react';

interface MobileNavigationProps {
  onOpenCommand?: () => void;
  onOpenNotifications?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey?: string;
  badge?: string;
  badgeColor?: 'rose' | 'amber' | 'emerald' | 'purple';
  category: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  onOpenCommand,
  onOpenNotifications,
}) => {
  const {
    activeTab,
    setActiveTab,
    heldBills,
    medicines,
    customers,
    settings,
    currentUser,
    setCurrentUser,
    users,
    darkMode,
    toggleDarkMode,
    soundEnabled,
    toggleSound,
    isOnline,
    offlineQueueCount,
    toggleNetworkSimulation,
    syncOfflineQueue,
    notifications,
    memberships,
  } = usePharmacy();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRoleSheetOpen, setIsRoleSheetOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const quickStripRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const dueCustomersCount = customers.filter((c) => c.currentDue > 0).length;

  // Complete List of All 26 ERP Modules Grouped
  const allModules: NavItem[] = [
    // Counter Operations
    { id: 'dashboard', label: 'Dashboard Desk', shortLabel: 'Desk', icon: LayoutDashboard, hotkey: 'Shift+F1', category: 'Counter Operations' },
    { id: 'pos', label: 'POS Counter Billing', shortLabel: 'POS', icon: ShoppingCart, hotkey: 'Shift+F2', badge: heldBills.length > 0 ? `${heldBills.length} Parked` : undefined, badgeColor: 'amber', category: 'Counter Operations' },
    { id: 'invoices', label: 'Sales Invoices', shortLabel: 'Invoices', icon: Receipt, hotkey: 'Shift+F7', category: 'Counter Operations' },
    { id: 'sales-returns', label: 'Sales Returns', shortLabel: 'Returns', icon: RotateCcw, category: 'Counter Operations' },
    { id: 'day-closing', label: 'Day Closing & Cash Register', shortLabel: 'Day Closing', icon: CalendarCheck, hotkey: 'Shift+F9', category: 'Counter Operations' },

    // Membership & Loyalty
    { id: 'membership', label: 'Customer Membership Club', shortLabel: 'Club', icon: Crown, badge: expiringMembersCount > 0 ? `${expiringMembersCount} Alert` : undefined, badgeColor: 'purple', category: 'Customer Membership' },

    // Inventory & Expiry
    { id: 'inventory', label: 'Inventory & Racks', shortLabel: 'Stock', icon: Boxes, hotkey: 'Shift+F10', badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined, badgeColor: 'rose', category: 'Inventory & Expiry' },
    { id: 'medicines', label: 'Medicine Master', shortLabel: 'Medicines', icon: Pill, hotkey: 'Shift+F3', category: 'Inventory & Expiry' },
    { id: 'expiry', label: 'Expiry & Near-Expiry Radar', shortLabel: 'Expiry', icon: Clock, badge: nearExpiryCount > 0 ? `${nearExpiryCount} Alert` : undefined, badgeColor: 'amber', category: 'Inventory & Expiry' },
    { id: 'stock-analysis', label: 'Stock Fast/Slow Analysis', shortLabel: 'Stock Flow', icon: TrendingUp, category: 'Inventory & Expiry' },

    // Procurement & Vendors
    { id: 'purchases', label: 'Purchases (GRN Inward)', shortLabel: 'Purchases', icon: PackageCheck, category: 'Procurement & Vendors' },
    { id: 'purchase-returns', label: 'Purchase Returns (Debit Note)', shortLabel: 'Pur. Return', icon: Undo2, category: 'Procurement & Vendors' },
    { id: 'suppliers', label: 'Suppliers Catalog', shortLabel: 'Suppliers', icon: Building2, category: 'Procurement & Vendors' },

    // Accounting & Ledgers
    { id: 'reports', label: 'Reports & Accountant Registers', shortLabel: 'Reports', icon: FileBarChart2, category: 'Accounting & Ledgers' },
    { id: 'pnl', label: 'Profit & Loss (P&L)', shortLabel: 'P&L', icon: BadgePercent, category: 'Accounting & Ledgers' },
    { id: 'payments', label: 'Payments & Ledgers', shortLabel: 'Ledgers', icon: WalletCards, category: 'Accounting & Ledgers' },
    { id: 'expenses', label: 'Expense Tracker', shortLabel: 'Expenses', icon: Coins, category: 'Accounting & Ledgers' },
    { id: 'gst', label: 'GST Tax Returns Module', shortLabel: 'GST Tax', icon: FileSpreadsheet, category: 'Accounting & Ledgers' },

    // CRM & Intelligence
    { id: 'customers', label: 'Patient Khata & CRM', shortLabel: 'Patients', icon: Users, badge: dueCustomersCount > 0 ? `${dueCustomersCount} Due` : undefined, badgeColor: 'rose', category: 'CRM & Intelligence' },
    { id: 'sales-analysis', label: 'Sales Analytics & Trends', shortLabel: 'Analytics', icon: LineChart, category: 'CRM & Intelligence' },
    { id: 'barcode', label: 'Barcode Studio & QR', shortLabel: 'Barcode', icon: QrCode, category: 'CRM & Intelligence' },
    { id: 'ai-assistant', label: 'AI Reorder Suite & Advisory', shortLabel: 'AI Suite', icon: Sparkles, category: 'CRM & Intelligence' },

    // Administration
    { id: 'roles', label: 'User Access Matrix', shortLabel: 'Users', icon: UserCog, category: 'Administration' },
    { id: 'audit', label: 'Audit Trail Logs', shortLabel: 'Audit', icon: History, category: 'Administration' },
    { id: 'settings', label: 'Store Settings & Backup', shortLabel: 'Settings', icon: Settings, category: 'Administration' },
  ];

  // Quick horizontal navigation bar items
  const quickItems = [
    { id: 'pos', label: '⚡ POS Billing', badge: heldBills.length > 0 ? heldBills.length : undefined },
    { id: 'dashboard', label: '📊 Desk' },
    { id: 'inventory', label: '📦 Stock', badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'customers', label: '👥 Patients', badge: dueCustomersCount > 0 ? dueCustomersCount : undefined },
    { id: 'membership', label: '👑 Club', badge: expiringMembersCount > 0 ? expiringMembersCount : undefined },
    { id: 'invoices', label: '🧾 Invoices' },
    { id: 'day-closing', label: '📅 Day Closing' },
    { id: 'expiry', label: '⏳ Expiry', badge: nearExpiryCount > 0 ? nearExpiryCount : undefined },
    { id: 'purchases', label: '🚚 Purchases' },
    { id: 'pnl', label: '💰 P&L' },
    { id: 'ai-assistant', label: '🤖 AI Suite' },
    { id: 'settings', label: '⚙️ Settings' },
  ];

  // Map active module details for header title badge
  const activeModuleItem = allModules.find(
    (m) => m.id === activeTab || (activeTab.startsWith('membership') && m.id === 'membership')
  ) || allModules[0];
  const ActiveIcon = activeModuleItem.icon;

  const roleColors: Record<UserRole, string> = {
    OWNER: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40',
    MANAGER: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40',
    PHARMACIST: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
    CASHIER: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40',
    STAFF: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/40',
  };

  const filteredDrawerModules = allModules.filter((m) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      m.label.toLowerCase().includes(term) ||
      m.category.toLowerCase().includes(term) ||
      (m.hotkey && m.hotkey.toLowerCase().includes(term))
    );
  });

  const categories = Array.from(new Set(allModules.map((m) => m.category)));

  // Scroll active quick pill into view on change
  useEffect(() => {
    if (quickStripRef.current) {
      const activeEl = quickStripRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  return (
    <div className="md:hidden">
      {/* =========================================================================
          1. DEDICATED MOBILE TOP APP BAR
         ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex h-14 items-center justify-between px-3">
          {/* Brand + Current Module Title Indicator */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
              Rx
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase truncate">
                  {settings.storeName.split(' ')[0]}
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[9.5px] border border-emerald-300 dark:border-emerald-800 shrink-0">
                  <ActiveIcon className="h-2.5 w-2.5" />
                  <span className="truncate max-w-[90px]">{activeModuleItem.shortLabel || activeModuleItem.label}</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                {currentUser.role} • {currentUser.name.split(' ')[0]}
              </p>
            </div>
          </div>

          {/* Quick Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Search */}
            {onOpenCommand && (
              <button
                onClick={onOpenCommand}
                title="Search (Cmd+K)"
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
            )}

            {/* Notifications Bell */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                title="Alerts"
                className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-rose-500 text-white text-[8.5px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              title="Toggle Theme"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>

            {/* User Avatar & Role Switcher */}
            <button
              onClick={() => setIsRoleSheetOpen(true)}
              title="Switch User Role"
              className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors"
            >
              <div className="h-6 w-6 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                {currentUser.name.charAt(0)}
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {/* All Modules Menu Drawer */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              title="All Modules"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. HORIZONTAL SCROLLING QUICK MODULE STRIP (1-TOUCH ACCESS)
           ========================================================================= */}
        <div
          ref={quickStripRef}
          className="flex items-center gap-1.5 px-2.5 py-1.5 overflow-x-auto bg-slate-50/90 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800/80 scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {quickItems.map((item) => {
            const isActive = activeTab === item.id || (item.id === 'membership' && activeTab.startsWith('membership'));
            return (
              <button
                key={item.id}
                data-active={isActive ? 'true' : 'false'}
                onClick={() => setActiveTab(item.id)}
                className={`relative px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Offline Cache Status Notification Banner */}
        {!isOnline && (
          <div className="bg-amber-500/15 border-t border-amber-500/30 px-3 py-1 flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Offline Cache Active ({offlineQueueCount} queued bills)</span>
            </div>
            <button
              onClick={syncOfflineQueue}
              className="font-bold underline text-[10px] text-amber-800 dark:text-amber-200 hover:text-amber-900"
            >
              Sync Now
            </button>
          </div>
        )}
      </header>

      {/* =========================================================================
          3. FLOATING ACTION BUTTON (FAB) FOR INSTANT 1-TAP BILLING
         ========================================================================= */}
      {activeTab !== 'pos' && (
        <button
          onClick={() => setActiveTab('pos')}
          className="fixed bottom-20 right-3.5 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-2.5 rounded-full shadow-lg shadow-emerald-700/30 flex items-center gap-1.5 font-bold text-xs active:scale-95 transition-all"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>+ POS Bill</span>
          {heldBills.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-bold">
              {heldBills.length}
            </span>
          )}
        </button>
      )}

      {/* =========================================================================
          4. MOBILE BOTTOM FIXED TOUCH NAVIGATION DOCK
         ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-1.5 px-1 shadow-lg pb-[max(env(safe-area-inset-bottom),6px)]">
        {/* 1. POS Billing */}
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all ${
            activeTab === 'pos'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {heldBills.length > 0 && (
              <span className="absolute -top-1 -right-2 h-3.5 w-3.5 rounded-full bg-amber-600 text-white text-[8px] font-bold flex items-center justify-center">
                {heldBills.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Billing</span>
        </button>

        {/* 2. Daily Desk Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all ${
            activeTab === 'dashboard'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Desk</span>
        </button>

        {/* 3. Inventory Stock */}
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all ${
            activeTab === 'inventory'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Boxes className="h-5 w-5" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-2 h-3.5 w-3.5 rounded-full bg-rose-600 text-white text-[8px] font-bold flex items-center justify-center">
                {lowStockCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Stock</span>
        </button>

        {/* 4. Patients Khata */}
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all ${
            activeTab === 'customers'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Users className="h-5 w-5" />
            {dueCustomersCount > 0 && (
              <span className="absolute -top-1 -right-2 h-3.5 w-3.5 rounded-full bg-amber-600 text-white text-[8px] font-bold flex items-center justify-center">
                {dueCustomersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Patients</span>
        </button>

        {/* 5. All 26 Modules Menu */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all ${
            isDrawerOpen
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">All ({allModules.length})</span>
        </button>
      </div>

      {/* =========================================================================
          5. COMPREHENSIVE ALL MODULES DRAWER (SLIDE-OVER / BOTTOM SHEET)
         ========================================================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border-t border-slate-200 dark:border-slate-800">
            {/* Drawer Drag Bar & Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                    <span>{settings.storeName}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                      v2.4
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Logged in as <strong>{currentUser.name}</strong> ({currentUser.role})
                  </p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Instant Search Filter for Modules */}
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter 26 modules (e.g. GST, Expiry, P&L, Audit...)"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold focus:outline-emerald-500 text-slate-900 dark:text-slate-100"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Grouped Modules List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {categories.map((category) => {
                const categoryItems = filteredDrawerModules.filter((m) => m.category === category);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={category} className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                      {category}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryItems.map((item) => {
                        const Icon = item.icon;
                        const isCurrent =
                          activeTab === item.id || (item.id === 'membership' && activeTab.startsWith('membership'));

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsDrawerOpen(false);
                            }}
                            className={`p-2.5 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                              isCurrent
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <Icon className={`h-4 w-4 ${isCurrent ? 'text-white' : 'text-emerald-600'}`} />
                              {item.badge && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                    isCurrent
                                      ? 'bg-white/20 text-white'
                                      : item.badgeColor === 'rose'
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                      : item.badgeColor === 'purple'
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-[11.5px] font-bold leading-tight block truncate">
                                {item.label}
                              </span>
                              {item.hotkey && (
                                <span className={`text-[9px] font-mono ${isCurrent ? 'text-emerald-100' : 'text-slate-400'}`}>
                                  Hotkey: {item.hotkey}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer System Control Footer Strip */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                {/* Switch Role Button */}
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsRoleSheetOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200"
                >
                  <UserCog className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Switch Role</span>
                </button>

                {/* Sound Toggle */}
                <button
                  onClick={toggleSound}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold"
                >
                  {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-600" /> : <VolumeX className="h-3.5 w-3.5 text-slate-400" />}
                  <span className="text-[11px]">{soundEnabled ? 'Sound On' : 'Muted'}</span>
                </button>

                {/* Network Simulation Toggle */}
                <button
                  onClick={toggleNetworkSimulation}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-semibold text-[11px] ${
                    isOnline
                      ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5 text-amber-600" />}
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </button>
              </div>

              {/* License Info */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>DL: {settings.drugLicenseNumber}</span>
                <span>GST: {settings.gstNumber}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MOBILE ROLE SWITCHER BOTTOM SHEET
         ========================================================================= */}
      {isRoleSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-4 shadow-2xl border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Switch User Role Context</h4>
                <p className="text-[11px] text-slate-500">Simulate permissions and audit tracking</p>
              </div>
              <button
                onClick={() => setIsRoleSheetOpen(false)}
                className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {users.map((u) => {
                const isSelected = currentUser.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      setIsRoleSheetOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl p-3 border transition-all ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 text-emerald-900 dark:text-emerald-100 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs uppercase">
                        {u.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold leading-tight">{u.name}</p>
                        <span className={`inline-block mt-0.5 rounded px-1.5 py-0.2 text-[9px] font-bold uppercase border ${roleColors[u.role]}`}>
                          {u.role}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
