'use client';

import React, { useState } from 'react';
import { PharmacyProvider, usePharmacy } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNavigation } from '@/components/layout/MobileNavigation';
import { NotificationDrawer } from '@/components/layout/NotificationDrawer';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { PhoneScannerModal } from '@/components/common/PhoneScannerModal';
import { PhoneScannerFloatingWidget } from '@/components/common/PhoneScannerFloatingWidget';

// Module Views
import { DashboardView } from '@/components/modules/DashboardView';
import { POSBillingView } from '@/components/modules/POSBillingView';
import { SalesInvoicesView } from '@/components/modules/SalesInvoicesView';
import { SalesReturnView } from '@/components/modules/SalesReturnView';
import { DayClosingView } from '@/components/modules/DayClosingView';
import { PurchaseManagementView } from '@/components/modules/PurchaseManagementView';
import { PurchaseReturnView } from '@/components/modules/PurchaseReturnView';
import { InventoryView } from '@/components/modules/InventoryView';
import { MedicineMasterView } from '@/components/modules/MedicineMasterView';
import { ExpiryManagementView } from '@/components/modules/ExpiryManagementView';
import { StockAnalysisView } from '@/components/modules/StockAnalysisView';
import { SalesAnalysisView } from '@/components/modules/SalesAnalysisView';
import { ProfitLossView } from '@/components/modules/ProfitLossView';
import { PaymentsLedgersView } from '@/components/modules/PaymentsLedgersView';
import { ExpenseManagementView } from '@/components/modules/ExpenseManagementView';
import { GSTTaxModuleView } from '@/components/modules/GSTTaxModuleView';
import { BarcodeSystemView } from '@/components/modules/BarcodeSystemView';
import { CustomerManagementView } from '@/components/modules/CustomerManagementView';
import { SupplierManagementView } from '@/components/modules/SupplierManagementView';
import { UserRoleManagementView } from '@/components/modules/UserRoleManagementView';
import { ReportCenterView } from '@/components/modules/ReportCenterView';
import { AuditLogsView } from '@/components/modules/AuditLogsView';
import { AIAssistantView } from '@/components/modules/AIAssistantView';
import { SettingsBackupView } from '@/components/modules/SettingsBackupView';
import { MembershipView } from '@/components/modules/MembershipView';

function PharmacyApp() {
  const { activeTab, setActiveTab, darkMode, isPhoneScannerModalOpen, setIsPhoneScannerModalOpen } = usePharmacy();
  const [mounted, setMounted] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Global Keyboard Shortcuts Dispatcher (F1, F2, F3, F7, F9, F10, Cmd+K, Esc)
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
        return;
      }

      // Escape to close drawers/modals
      if (e.key === 'Escape') {
        if (isCommandOpen) {
          e.preventDefault();
          setIsCommandOpen(false);
          return;
        }
        if (isNotificationOpen) {
          e.preventDefault();
          setIsNotificationOpen(false);
          return;
        }
      }

      // Global Navigation Hotkeys (F1, F2, F3, F7, F9, F10)
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('dashboard');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('medicines');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setActiveTab('invoices');
      } else if (e.key === 'F9') {
        e.preventDefault();
        setActiveTab('day-closing');
      } else if (e.key === 'F10') {
        e.preventDefault();
        setActiveTab('inventory');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isCommandOpen, isNotificationOpen, setActiveTab]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#090d16] flex items-center justify-center">
        <div className="flex items-center gap-2 font-mono text-xs text-slate-500 font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>Loading Bhalerao Medical ERP...</span>
        </div>
      </div>
    );
  }

  const renderModuleView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'pos':
        return <POSBillingView />;
      case 'invoices':
        return <SalesInvoicesView />;
      case 'sales-returns':
        return <SalesReturnView />;
      case 'day-closing':
        return <DayClosingView />;
      case 'purchases':
        return <PurchaseManagementView />;
      case 'purchase-returns':
        return <PurchaseReturnView />;
      case 'inventory':
        return <InventoryView />;
      case 'medicines':
        return <MedicineMasterView />;
      case 'expiry':
        return <ExpiryManagementView />;
      case 'stock-analysis':
        return <StockAnalysisView />;
      case 'sales-analysis':
        return <SalesAnalysisView />;
      case 'pnl':
        return <ProfitLossView />;
      case 'payments':
        return <PaymentsLedgersView />;
      case 'expenses':
        return <ExpenseManagementView />;
      case 'gst':
        return <GSTTaxModuleView />;
      case 'barcode':
        return <BarcodeSystemView />;
      case 'customers':
        return <CustomerManagementView />;
      case 'suppliers':
        return <SupplierManagementView />;
      case 'roles':
        return <UserRoleManagementView />;
      case 'reports':
        return <ReportCenterView />;
      case 'audit':
        return <AuditLogsView />;
      case 'ai-assistant':
        return <AIAssistantView />;
      case 'settings':
        return <SettingsBackupView />;
      case 'membership':
      case 'membership-dashboard':
      case 'membership-members':
      case 'membership-create':
      case 'membership-settings':
      case 'membership-reports':
        return <MembershipView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-slate-100 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 ${darkMode ? 'dark' : ''}`}>
      {/* Desktop Enterprise Sidebar (Hidden on mobile) */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main Operational Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden md:block">
          <Header
            onOpenCommand={() => setIsCommandOpen(true)}
            onOpenNotifications={() => setIsNotificationOpen(true)}
          />
        </div>

        {/* Mobile Dedicated App Header & Bottom Bar */}
        <MobileNavigation />

        {/* Responsive Content Area with Bottom Padding on Mobile */}
        <main className="flex-1 overflow-y-auto p-2.5 sm:p-3 md:p-4 pb-20 md:pb-6">
          <div className="max-w-[1600px] mx-auto">
            {renderModuleView()}
          </div>
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      <PhoneScannerModal
        isOpen={isPhoneScannerModalOpen}
        onClose={() => setIsPhoneScannerModalOpen(false)}
      />

      <PhoneScannerFloatingWidget />
    </div>
  );
}

export default function Home() {
  return (
    <PharmacyProvider>
      <PharmacyApp />
    </PharmacyProvider>
  );
}
