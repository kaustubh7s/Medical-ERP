'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Medicine,
  Batch,
  Customer,
  Supplier,
  SalesInvoice,
  HeldBills,
  SalesReturn,
  PurchaseEntry,
  PurchaseReturn,
  Expense,
  PaymentTransaction,
  DayClosingRecord,
  DamagedStockEntry,
  User,
  PharmacySettings,
  AuditLog,
  NotificationItem,
  AIReorderRecommendation,
  AINearExpiryStrategy,
  Membership,
  MembershipSettings,
  PaymentMode,
  MembershipStatus,
  MembershipHistoryItem,
  MembershipHistoryAction,
  PendingMembershipRegistration,
  InvoiceItem,
  CashDrawerTransaction,
  PhoneScannerStatus,
  PhoneScannerSessionState,
  BarcodeQRMapping,
} from '@/types/pharmacy';
import {
  INITIAL_MEDICINES,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_INVOICES,
  INITIAL_PURCHASES,
  INITIAL_EXPENSES,
  INITIAL_USERS,
  INITIAL_SETTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_MEMBERSHIPS,
  INITIAL_MEMBERSHIP_SETTINGS,
  INITIAL_SALES_RETURNS,
  INITIAL_CASH_DRAWER_TRANSACTIONS,
  INITIAL_BARCODE_MAPPINGS,
} from '@/lib/initialData';
import { calculateExpiryDate, getMembershipExpiryInfo } from '@/lib/membershipUtils';

interface PharmacyStoreContextType {
  medicines: Medicine[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: SalesInvoice[];
  heldBills: HeldBills[];
  salesReturns: SalesReturn[];
  purchases: PurchaseEntry[];
  purchaseReturns: PurchaseReturn[];
  expenses: Expense[];
  payments: PaymentTransaction[];
  cashDrawerTransactions: CashDrawerTransaction[];
  dayClosingRecords: DayClosingRecord[];
  damagedStock: DamagedStockEntry[];
  currentUser: User;
  users: User[];
  settings: PharmacySettings;
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  activeTab: string;
  sidebarCollapsed: boolean;
  darkMode: boolean;
  soundEnabled: boolean;
  isOnline: boolean;
  offlineQueueCount: number;

  // Navigation & Preferences
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  toggleSound: () => void;
  toggleNetworkSimulation: () => void;
  syncOfflineQueue: () => void;
  setCurrentUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateSettings: (settings: Partial<PharmacySettings>) => void;

  // Medicine & Inventory
  addMedicine: (med: Omit<Medicine, 'id' | 'totalStock' | 'batches'> & { initialBatch?: Omit<Batch, 'id' | 'medicineId' | 'status'> }) => Medicine;
  updateMedicine: (id: string, updates: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  toggleFavoriteMedicine: (id: string) => void;
  addBatchToMedicine: (medicineId: string, batch: Omit<Batch, 'id' | 'medicineId' | 'status'>) => void;
  updateBatch: (medicineId: string, batchId: string, updates: Partial<Batch>) => void;
  adjustStock: (medicineId: string, batchId: string, newQty: number, reason: string) => void;
  transferBatchLocation: (medicineId: string, batchId: string, newRack: string) => void;
  applyNearExpiryDiscount: (medicineId: string, batchId: string, discountPct: number) => void;
  recordDamagedStock: (entry: Omit<DamagedStockEntry, 'id' | 'date'>) => void;

  // Sales & POS Counter
  createSalesInvoice: (invoiceData: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'invoiceDate'>) => SalesInvoice;
  holdBill: (cartItems: any[], customerName: string, customerPhone: string, doctorName: string, notes?: string) => HeldBills;
  resumeHeldBill: (heldId: string) => HeldBills | null;
  deleteHeldBill: (heldId: string) => void;
  processSalesReturn: (returnData: Omit<SalesReturn, 'id' | 'returnNumber' | 'returnDate'>) => SalesReturn;

  // Purchases
  createPurchase: (purchaseData: Omit<PurchaseEntry, 'id' | 'grnNumber'>) => PurchaseEntry;
  processPurchaseReturn: (returnData: Omit<PurchaseReturn, 'id' | 'debitNoteNumber' | 'returnDate'>) => PurchaseReturn;

  // Customers & Suppliers
  addCustomer: (cust: Omit<Customer, 'id' | 'createdDate' | 'loyaltyPoints' | 'currentDue'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  addSupplier: (sup: Omit<Supplier, 'id' | 'currentBalance'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;

  // Expenses, Ledgers & Day Closing
  addExpense: (exp: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  recordPayment: (payment: Omit<PaymentTransaction, 'id' | 'date'>) => void;
  recordCashDrawerTransaction: (tx: Omit<CashDrawerTransaction, 'id' | 'transactionNumber'>) => CashDrawerTransaction;
  getCashDrawerSummary: (dateStr?: string) => {
    openingCash: number;
    totalSalesCash: number;
    totalSalesUPI: number;
    totalSalesCard: number;
    totalSalesTerminal: number;
    totalSalesCredit: number;
    totalGrossSales: number;
    todayCustomerDuesCollected: number;
    todaySalesReturnCashRefunds: number;
    todayExpensesCash: number;
    todaySupplierPayoutsCash: number;
    otherCashInflows: number;
    otherCashOutflows: number;
    totalCashInflows: number;
    totalCashOutflows: number;
    expectedCashInDrawer: number;
    cashRefundTransactions: CashDrawerTransaction[];
    unreconciledReturns: SalesReturn[];
  };
  reconcileCashDrawerReturns: () => number;
  updateSalesReturnRefundStatus: (returnId: string, isPaid: boolean) => void;
  recordDayClosing: (actualCash: number, notes?: string, customDate?: string) => DayClosingRecord;

  // Notifications & Audit
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  logAudit: (action: AuditLog['action'], module: string, description: string, metadata?: Record<string, unknown>) => void;

  // AI & Analytics
  getAIReorderRecommendations: () => AIReorderRecommendation[];
  getAINearExpiryStrategies: () => AINearExpiryStrategy[];

  // Membership & Loyalty Management
  memberships: Membership[];
  membershipSettings: MembershipSettings;
  createMembership: (data: Omit<Membership, 'id' | 'membershipId' | 'createdDate' | 'history'>) => Membership;
  renewMembership: (membershipId: string, durationMonths: number, notes?: string, feePaid?: number, paymentMode?: PaymentMode) => Membership | null;
  extendMembership: (membershipId: string, additionalDays: number, notes?: string) => Membership | null;
  updateMembershipStatus: (membershipId: string, status: MembershipStatus, notes?: string) => void;
  updateMembership: (id: string, updates: Partial<Membership>) => void;
  updateMembershipSettings: (settingsUpdates: Partial<MembershipSettings>) => void;
  getMemberByPhone: (phone: string) => Membership | undefined;
  getMemberById: (id: string) => Membership | undefined;
  toggleMedicineMembershipDiscount: (medicineId: string) => void;
  setMedicineMembershipDiscountBulk: (medicineIds: string[], isEligible: boolean) => void;

  // Paid Customer Membership Billing Integration
  pendingMemberships: PendingMembershipRegistration[];
  pendingMembershipCartItem: InvoiceItem | null;
  setPendingMembershipCartItem: (item: InvoiceItem | null) => void;
  createPendingMembership: (data: Omit<PendingMembershipRegistration, 'id' | 'memberId' | 'status' | 'createdAt'>) => PendingMembershipRegistration;
  cancelPendingMembership: (registrationId: string) => void;
  addMembershipToCartAndNavigate: (pendingReg: PendingMembershipRegistration) => void;

  // Barcode & QR Mapping
  barcodeMappings: BarcodeQRMapping[];
  addBarcodeMapping: (mapping: Omit<BarcodeQRMapping, 'id' | 'mappedAt'>) => { success: boolean; mapping?: BarcodeQRMapping; error?: string };
  removeBarcodeMapping: (id: string) => void;
  assignBarcodeToMedicine: (
    medicineId: string,
    barcode: string,
    unitType?: 'STRIP' | 'LOOSE',
    notes?: string
  ) => { success: boolean; error?: string; medicine?: Medicine };
  findMedicineByBarcodeOrQR: (code: string) => { medicine: Medicine; batch?: Batch; unitType?: 'STRIP' | 'LOOSE' } | null;

  // Phone QR Scanner State & Controls
  phoneScannerSession: PhoneScannerSessionState | null;
  phoneScannerStatus: PhoneScannerStatus;
  lastScannedItem: {
    value: string;
    timestamp: number;
    medicineName?: string;
    status: 'MATCHED' | 'UNKNOWN' | 'IGNORED_WORKFLOW';
    unitType?: 'STRIP' | 'LOOSE';
  } | null;
  pendingScannedBarcode: string | null;
  setPendingScannedBarcode: (val: string | null) => void;
  startPhoneScannerSession: (customHost?: string) => Promise<PhoneScannerSessionState | null>;
  disconnectPhoneScanner: () => Promise<void>;
  isPhoneScannerModalOpen: boolean;
  setIsPhoneScannerModalOpen: (open: boolean) => void;

  // Backup & Reset
  resetToDemoData: () => void;
  importDataBackup: (jsonString: string) => boolean;
  exportDataBackup: () => string;
}

const PharmacyContext = createContext<PharmacyStoreContextType | null>(null);

const STORAGE_KEY = 'BHALERAO_MEDICAL_ERP_OPERATIONAL_V3';

export function PharmacyProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>(INITIAL_MEDICINES);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [invoices, setInvoices] = useState<SalesInvoice[]>(INITIAL_INVOICES);
  const [heldBills, setHeldBills] = useState<HeldBills[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>(INITIAL_SALES_RETURNS);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>(INITIAL_PURCHASES);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [cashDrawerTransactions, setCashDrawerTransactions] = useState<CashDrawerTransaction[]>(INITIAL_CASH_DRAWER_TRANSACTIONS);
  const [dayClosingRecords, setDayClosingRecords] = useState<DayClosingRecord[]>([]);
  const [damagedStock, setDamagedStock] = useState<DamagedStockEntry[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [settings, setSettings] = useState<PharmacySettings>(INITIAL_SETTINGS);
  const [memberships, setMemberships] = useState<Membership[]>(INITIAL_MEMBERSHIPS);
  const [membershipSettings, setMembershipSettings] = useState<MembershipSettings>(INITIAL_MEMBERSHIP_SETTINGS);
  const [pendingMemberships, setPendingMemberships] = useState<PendingMembershipRegistration[]>([]);
  const [pendingMembershipCartItem, setPendingMembershipCartItem] = useState<InvoiceItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<SalesInvoice[]>([]);

  // Barcode & QR Mapping State
  const [barcodeMappings, setBarcodeMappings] = useState<BarcodeQRMapping[]>(INITIAL_BARCODE_MAPPINGS);

  // Phone QR Scanner State
  const [phoneScannerSession, setPhoneScannerSession] = useState<PhoneScannerSessionState | null>(null);
  const [phoneScannerStatus, setPhoneScannerStatus] = useState<PhoneScannerStatus>('DISCONNECTED');
  const [lastScannedItem, setLastScannedItem] = useState<{
    value: string;
    timestamp: number;
    medicineName?: string;
    status: 'MATCHED' | 'UNKNOWN' | 'IGNORED_WORKFLOW';
    unitType?: 'STRIP' | 'LOOSE';
  } | null>(null);
  const [pendingScannedBarcode, setPendingScannedBarcode] = useState<string | null>(null);
  const [isPhoneScannerModalOpen, setIsPhoneScannerModalOpen] = useState(false);
  const sseRef = React.useRef<EventSource | null>(null);

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.medicines) setMedicines(parsed.medicines);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.suppliers) setSuppliers(parsed.suppliers);
        if (parsed.invoices) setInvoices(parsed.invoices);
        if (parsed.heldBills) setHeldBills(parsed.heldBills);
        if (parsed.salesReturns && parsed.salesReturns.length > 0) {
          setSalesReturns(parsed.salesReturns);
        } else {
          setSalesReturns(INITIAL_SALES_RETURNS);
        }
        if (parsed.cashDrawerTransactions) setCashDrawerTransactions(parsed.cashDrawerTransactions);
        if (parsed.purchases) setPurchases(parsed.purchases);
        if (parsed.purchaseReturns) setPurchaseReturns(parsed.purchaseReturns);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.payments) setPayments(parsed.payments);
        if (parsed.dayClosingRecords) setDayClosingRecords(parsed.dayClosingRecords);
        if (parsed.damagedStock) setDamagedStock(parsed.damagedStock);
        if (parsed.users) setUsers(parsed.users);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.memberships) setMemberships(parsed.memberships);
        if (parsed.membershipSettings) setMembershipSettings(parsed.membershipSettings);
        if (parsed.pendingMemberships) setPendingMemberships(parsed.pendingMemberships);
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
        if (parsed.barcodeMappings) setBarcodeMappings(parsed.barcodeMappings);
      } else {
        // First-time initialize with INITIAL_SALES_RETURNS and INITIAL_BARCODE_MAPPINGS
        setSalesReturns(INITIAL_SALES_RETURNS);
        setBarcodeMappings(INITIAL_BARCODE_MAPPINGS);
      }

      // Default to Light Mode unless explicitly set to dark
      const savedTheme = localStorage.getItem('apex_theme_mode');
      if (savedTheme === 'dark') {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to LocalStorage on changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const dataToSave = {
        medicines,
        customers,
        suppliers,
        invoices,
        heldBills,
        salesReturns,
        purchases,
        purchaseReturns,
        expenses,
        payments,
        cashDrawerTransactions,
        dayClosingRecords,
        damagedStock,
        users,
        settings,
        memberships,
        membershipSettings,
        pendingMemberships,
        auditLogs,
        barcodeMappings,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }, [
    isLoaded,
    medicines,
    customers,
    suppliers,
    invoices,
    heldBills,
    salesReturns,
    purchases,
    purchaseReturns,
    expenses,
    payments,
    cashDrawerTransactions,
    dayClosingRecords,
    damagedStock,
    users,
    settings,
    memberships,
    membershipSettings,
    pendingMemberships,
    auditLogs,
    barcodeMappings,
  ]);

  // Compute Notifications
  useEffect(() => {
    const alerts: NotificationItem[] = [];
    const today = new Date();

    medicines.forEach((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.availableQuantity, 0);
      if (totalStock <= med.reorderLevel) {
        alerts.push({
          id: `notif-stock-${med.id}`,
          timestamp: new Date().toISOString(),
          type: 'LOW_STOCK',
          title: `Low Stock: ${med.name}`,
          message: `Current stock (${totalStock}) at or below reorder level (${med.reorderLevel}).`,
          priority: totalStock <= med.reorderLevel / 2 ? 'CRITICAL' : 'HIGH',
          link: 'inventory',
          read: false,
        });
      }

      med.batches.forEach((b) => {
        const exp = new Date(b.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0 && b.availableQuantity > 0) {
          alerts.push({
            id: `notif-exp-${b.id}`,
            timestamp: new Date().toISOString(),
            type: 'EXPIRED',
            title: `Expired Batch: ${med.name} (${b.batchNumber})`,
            message: `Batch ${b.batchNumber} expired on ${b.expiryDate}. ${b.availableQuantity} units require quarantine/return.`,
            priority: 'CRITICAL',
            link: 'expiry',
            read: false,
          });
        } else if (diffDays > 0 && diffDays <= 30 && b.availableQuantity > 0) {
          alerts.push({
            id: `notif-nearexp-${b.id}`,
            timestamp: new Date().toISOString(),
            type: 'NEAR_EXPIRY',
            title: `Expiring Soon (${diffDays}d): ${med.name}`,
            message: `Batch ${b.batchNumber} expires in ${diffDays} days (${b.expiryDate}).`,
            priority: 'HIGH',
            link: 'expiry',
            read: false,
          });
        }
      });
    });

    suppliers.forEach((sup) => {
      if (sup.currentBalance > 20000) {
        alerts.push({
          id: `notif-supdue-${sup.id}`,
          timestamp: new Date().toISOString(),
          type: 'SUPPLIER_DUE',
          title: `Supplier Due: ${sup.name}`,
          message: `Payables of ₹${sup.currentBalance.toLocaleString('en-IN')} pending.`,
          priority: 'MEDIUM',
          link: 'suppliers',
          read: false,
        });
      }
    });

    // Membership Expiry Radar Alerts
    memberships.forEach((mem) => {
      const expInfo = getMembershipExpiryInfo(mem, membershipSettings, today);
      if (expInfo.isExpired) {
        alerts.push({
          id: `notif-mem-exp-${mem.id}`,
          timestamp: new Date().toISOString(),
          type: 'SYSTEM',
          title: `Membership Expired: ${mem.customerName}`,
          message: `${mem.membershipId} expired on ${mem.expiryDate}. Member discounts currently paused until renewal.`,
          priority: 'HIGH',
          link: 'membership-members',
          read: false,
        });
      } else if (expInfo.isExpiringSoon && expInfo.daysRemaining <= 7) {
        alerts.push({
          id: `notif-mem-soon-${mem.id}`,
          timestamp: new Date().toISOString(),
          type: 'SYSTEM',
          title: `Membership Expiring (${expInfo.daysRemaining}d): ${mem.customerName}`,
          message: `${mem.membershipId} will expire on ${mem.expiryDate}. Follow up for renewal.`,
          priority: expInfo.daysRemaining <= 3 ? 'CRITICAL' : 'HIGH',
          link: 'membership-members',
          read: false,
        });
      }
    });

    setNotifications(alerts);
  }, [medicines, suppliers, memberships, membershipSettings]);

  const logAudit = (
    action: AuditLog['action'],
    module: string,
    description: string,
    metadata?: Record<string, unknown>
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      module,
      description,
      metadata,
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 499)]);
  };

  const toggleSidebar = () => setSidebarCollapsed((p) => !p);
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        try { localStorage.setItem('apex_theme_mode', 'dark'); } catch {}
      } else {
        document.documentElement.classList.remove('dark');
        try { localStorage.setItem('apex_theme_mode', 'light'); } catch {}
      }
      return next;
    });
  };

  const toggleSound = () => setSoundEnabled((p) => !p);

  const toggleNetworkSimulation = () => {
    setIsOnline((prev) => {
      const next = !prev;
      logAudit('BACKUP', 'Network Simulator', `Switched network connection mode to ${next ? 'ONLINE' : 'OFFLINE'}`);
      return next;
    });
  };

  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) return;
    const count = offlineQueue.length;
    setInvoices((prev) =>
      prev.map((inv) => (inv.isOfflineQueued ? { ...inv, isOfflineQueued: false } : inv))
    );
    setOfflineQueue([]);
    logAudit('BACKUP', 'Offline Sync Engine', `Successfully synchronized ${count} offline POS invoices.`);
  };

  const updateSettings = (newSettings: Partial<PharmacySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    logAudit('UPDATE', 'Settings', 'Updated pharmacy store settings & license details');
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    logAudit('UPDATE', 'User Management', `Updated permissions for user ID: ${id}`);
  };

  const addUser = (user: Omit<User, 'id'>) => {
    const newUser: User = { ...user, id: `usr-${Date.now()}` };
    setUsers((prev) => [...prev, newUser]);
    logAudit('CREATE', 'User Management', `Added new team member ${newUser.name}`);
  };

  // Medicine Actions
  const addMedicine = (medData: Omit<Medicine, 'id' | 'totalStock' | 'batches'> & { initialBatch?: Omit<Batch, 'id' | 'medicineId' | 'status'> }) => {
    const medId = `med-${Date.now()}`;
    const batches: Batch[] = [];

    if (medData.initialBatch) {
      const today = new Date();
      const exp = new Date(medData.initialBatch.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let status: Batch['status'] = 'ACTIVE';
      if (diffDays <= 0) status = 'EXPIRED';
      else if (diffDays <= 90) status = 'NEAR_EXPIRY';

      batches.push({
        ...medData.initialBatch,
        id: `bat-${Date.now()}-1`,
        medicineId: medId,
        status,
      });
    }

    const totalStock = batches.reduce((sum, b) => sum + b.availableQuantity, 0);

    const newMedicine: Medicine = {
      ...medData,
      id: medId,
      batches,
      totalStock,
    };

    setMedicines((prev) => [newMedicine, ...prev]);
    logAudit('CREATE', 'Medicine Master', `Added medicine: ${newMedicine.name} (${newMedicine.genericName})`);
    return newMedicine;
  };

  const updateMedicine = (id: string, updates: Partial<Medicine>) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, ...updates };
        updated.totalStock = updated.batches.reduce((sum, b) => sum + b.availableQuantity, 0);
        return updated;
      })
    );
    logAudit('UPDATE', 'Medicine Master', `Updated medicine specifications for ID: ${id}`);
  };

  const deleteMedicine = (id: string) => {
    const med = medicines.find((m) => m.id === id);
    setMedicines((prev) => prev.filter((m) => m.id !== id));
    logAudit('DELETE', 'Medicine Master', `Removed medicine: ${med?.name || id}`);
  };

  const toggleFavoriteMedicine = (id: string) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m))
    );
  };

  const addBatchToMedicine = (medicineId: string, batchData: Omit<Batch, 'id' | 'medicineId' | 'status'>) => {
    const today = new Date();
    const exp = new Date(batchData.expiryDate);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let status: Batch['status'] = 'ACTIVE';
    if (diffDays <= 0) status = 'EXPIRED';
    else if (diffDays <= 90) status = 'NEAR_EXPIRY';

    const newBatch: Batch = {
      ...batchData,
      id: `bat-${Date.now()}`,
      medicineId,
      status,
    };

    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id !== medicineId) return m;
        const batches = [...m.batches, newBatch];
        const totalStock = batches.reduce((sum, b) => sum + b.availableQuantity, 0);
        return { ...m, batches, totalStock };
      })
    );
    logAudit('CREATE', 'Inventory Batches', `Added batch ${newBatch.batchNumber} to medicine ID: ${medicineId}`);
  };

  const updateBatch = (medicineId: string, batchId: string, updates: Partial<Batch>) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id !== medicineId) return m;
        const batches = m.batches.map((b) => (b.id === batchId ? { ...b, ...updates } : b));
        const totalStock = batches.reduce((sum, b) => sum + b.availableQuantity, 0);
        return { ...m, batches, totalStock };
      })
    );
  };

  const adjustStock = (medicineId: string, batchId: string, newQty: number, reason: string) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id !== medicineId) return m;
        const batches = m.batches.map((b) => {
          if (b.id !== batchId) return b;
          return { ...b, availableQuantity: newQty, quantity: newQty };
        });
        const totalStock = batches.reduce((sum, b) => sum + b.availableQuantity, 0);
        return { ...m, batches, totalStock };
      })
    );
    logAudit('STOCK_ADJUST', 'Inventory Reconciliation', `Stock manual adjustment for ${medicineId} (Batch: ${batchId}) to ${newQty}. Reason: ${reason}`);
  };

  const transferBatchLocation = (medicineId: string, batchId: string, newRack: string) => {
    updateBatch(medicineId, batchId, { rackLocation: newRack });
    logAudit('UPDATE', 'Warehouse Racks', `Relocated Batch ${batchId} to ${newRack}`);
  };

  const applyNearExpiryDiscount = (medicineId: string, batchId: string, discountPct: number) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id !== medicineId) return m;
        const batches = m.batches.map((b) => {
          if (b.id !== batchId) return b;
          const discountedSaleRate = Math.round(b.mrp * (1 - discountPct / 100) * 10) / 10;
          return { ...b, saleRate: discountedSaleRate };
        });
        return { ...m, batches };
      })
    );
    logAudit('PRICE_CHANGE', 'Expiry Management', `Applied ${discountPct}% clearance discount on Batch ${batchId}`);
  };

  const recordDamagedStock = (entry: Omit<DamagedStockEntry, 'id' | 'date'>) => {
    const newEntry: DamagedStockEntry = {
      ...entry,
      id: `dmg-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
    };

    // Deduct damaged quantity from batch
    setMedicines((prev) =>
      prev.map((med) => {
        if (med.id !== entry.medicineId) return med;
        const batches = med.batches.map((b) => {
          if (b.batchNumber === entry.batchNumber) {
            return { ...b, availableQuantity: Math.max(0, b.availableQuantity - entry.quantity) };
          }
          return b;
        });
        const totalStock = batches.reduce((sum, b) => sum + b.availableQuantity, 0);
        return { ...med, batches, totalStock };
      })
    );

    setDamagedStock((prev) => [newEntry, ...prev]);
    logAudit('STOCK_ADJUST', 'Damaged Stock Register', `Wrote off ${entry.quantity} units of ${entry.medicineName} (${entry.reason}). Loss: ₹${entry.totalLoss}`);
  };

  // Sales POS & Invoices
  const createSalesInvoice = (invoiceData: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'invoiceDate'>): SalesInvoice => {
    const invCount = invoices.length + 1;
    const invNumber = `INV-${new Date().getFullYear()}-${String(invCount).padStart(5, '0')}`;
    const invoiceDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newInvoice: SalesInvoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      invoiceNumber: invNumber,
      invoiceDate,
    };

    // Inspect items for membership service line items
    const membershipItem = invoiceData.items.find(
      (item) => item.itemCategory === 'MEMBERSHIP' || item.medicineId === 'SERVICE_MEMBERSHIP' || !!item.membershipDetails
    );
    const hasMedicineItems = invoiceData.items.some(
      (item) => item.itemCategory !== 'MEMBERSHIP' && item.medicineId !== 'SERVICE_MEMBERSHIP'
    );

    let saleCategory: 'ALL' | 'MEDICINE' | 'MEMBERSHIP' | 'COMBINED' = 'MEDICINE';
    if (membershipItem && hasMedicineItems) {
      saleCategory = 'COMBINED';
    } else if (membershipItem) {
      saleCategory = 'MEMBERSHIP';
    } else {
      saleCategory = 'MEDICINE';
    }

    newInvoice.saleCategory = saleCategory;

    const memDetails = membershipItem?.membershipDetails;
    const isPaid = invoiceData.paymentStatus === 'PAID';

    if (memDetails) {
      newInvoice.membershipRegistrationId = memDetails.registrationId;
      newInvoice.membershipMemberId = memDetails.memberId;
      newInvoice.membershipPlanName = memDetails.planName;
      newInvoice.membershipDurationLabel = memDetails.durationLabel;
      newInvoice.membershipFeeAmount = memDetails.fee;
      newInvoice.membershipStartDate = memDetails.startDate;
      newInvoice.membershipExpiryDate = memDetails.expiryDate;
      newInvoice.membershipActivationStatus = isPaid ? 'ACTIVATED' : 'PENDING';

      if (isPaid) {
        // Authoritatively activate pending registration
        setPendingMemberships((prev) =>
          prev.map((p) =>
            p.id === memDetails.registrationId
              ? {
                  ...p,
                  status: 'ACTIVATED',
                  activatedAt: invoiceDate,
                  invoiceId: newInvoice.id,
                  invoiceNumber: invNumber,
                  paymentMethod: invoiceData.paymentMode,
                  paymentTransactionId: (newInvoice as any).terminalTransactionId,
                }
              : p
          )
        );

        if (memDetails.isRenewal && memDetails.renewingMembershipId) {
          // Process renewal: extend expiry date, add RENEWED history, keep previous history
          renewMembership(
            memDetails.renewingMembershipId,
            memDetails.durationMonths,
            `Renewed via invoice ${invNumber}. Paid ₹${memDetails.fee} (${invoiceData.paymentMode})`,
            memDetails.fee,
            invoiceData.paymentMode
          );
        } else {
          // Create new active membership if not already registered
          setMemberships((prev) => {
            const alreadyExists = prev.some(
              (m) =>
                m.membershipId === memDetails.memberId ||
                (m.registrationId && m.registrationId === memDetails.registrationId)
            );
            if (alreadyExists) return prev;

            const newMember: Membership = {
              id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              membershipId: memDetails.memberId,
              customerId: invoiceData.customerId,
              customerName: memDetails.customerName,
              customerPhone: memDetails.customerPhone,
              customerEmail: memDetails.customerEmail,
              customerAddress: memDetails.customerAddress,
              startDate: memDetails.startDate,
              durationMonths: memDetails.durationMonths,
              durationLabel: memDetails.durationLabel,
              expiryDate: memDetails.expiryDate,
              status: 'ACTIVE',
              feePaid: memDetails.fee,
              paymentMode: invoiceData.paymentMode,
              notes: memDetails.notes || `Paid membership fee: ₹${memDetails.fee} via ${invoiceData.paymentMode} (Invoice ${invNumber})`,
              createdDate: invoiceDate.split(' ')[0],
              createdBy: currentUser.name,
              invoiceId: newInvoice.id,
              invoiceNumber: invNumber,
              registrationId: memDetails.registrationId,
              history: [
                {
                  id: `mh-${Date.now()}-init`,
                  date: invoiceDate,
                  action: 'CREATED',
                  newExpiryDate: memDetails.expiryDate,
                  newStatus: 'ACTIVE',
                  performedBy: currentUser.name,
                  invoiceNumber: invNumber,
                  notes: `Membership activated upon payment of invoice ${invNumber} (${memDetails.durationLabel}, ₹${memDetails.fee} via ${invoiceData.paymentMode}).`,
                },
              ],
            };
            return [newMember, ...prev];
          });

          setMembershipSettings((prev) => ({
            ...prev,
            nextNumber: prev.nextNumber + 1,
          }));
        }

        // Link/update customer CRM record
        setCustomers((prev) => {
          const cleanPhone = memDetails.customerPhone.replace(/\D/g, '');
          const existing = prev.find((c) => c.phone.replace(/\D/g, '') === cleanPhone);
          if (existing) {
            return prev.map((c) =>
              c.id === existing.id
                ? {
                    ...c,
                    name: memDetails.customerName || c.name,
                    email: memDetails.customerEmail || c.email,
                    address: memDetails.customerAddress || c.address,
                  }
                : c
            );
          } else {
            const newCust: Customer = {
              id: invoiceData.customerId || `cust-${Date.now()}`,
              name: memDetails.customerName,
              phone: memDetails.customerPhone,
              email: memDetails.customerEmail,
              address: memDetails.customerAddress,
              creditLimit: 5000,
              createdDate: invoiceDate.split(' ')[0],
              loyaltyPoints: 0,
              currentDue: 0,
            };
            return [...prev, newCust];
          }
        });

        logAudit(
          'SALE',
          'Membership Module',
          `Activated membership ${memDetails.memberId} for ${memDetails.customerName} (${memDetails.durationLabel}, ₹${memDetails.fee}) via paid invoice ${invNumber}`
        );
      } else {
        // Unpaid/pending: preserve pending registration
        setPendingMemberships((prev) =>
          prev.map((p) =>
            p.id === memDetails.registrationId
              ? {
                  ...p,
                  invoiceId: newInvoice.id,
                  invoiceNumber: invNumber,
                  paymentMethod: invoiceData.paymentMode,
                }
              : p
          )
        );
      }
    } else {
      newInvoice.membershipActivationStatus = 'NOT_APPLICABLE';
    }

    // Deduct batch stock strictly for medicines, never for membership service lines
    setMedicines((prevMedicines) =>
      prevMedicines.map((med) => {
        const matchingItems = invoiceData.items.filter(
          (item) => item.medicineId === med.id && item.itemCategory !== 'MEMBERSHIP'
        );
        if (matchingItems.length === 0) return med;

        let updatedBatches = [...med.batches];
        matchingItems.forEach((item) => {
          updatedBatches = updatedBatches.map((b) => {
            if (b.id === item.batchId) {
              const packCount = item.unitsPerPack || 1;
              const deductQty = item.unitType === 'LOOSE' && packCount > 1
                ? item.quantity / packCount
                : item.quantity;
              const newAvailable = Math.max(0, Math.round((b.availableQuantity - deductQty) * 100) / 100);
              return { ...b, availableQuantity: newAvailable };
            }
            return b;
          });
        });

        const totalStock = Math.round(updatedBatches.reduce((sum, b) => sum + b.availableQuantity, 0) * 100) / 100;
        return { ...med, batches: updatedBatches, totalStock };
      })
    );

    // Update Customer loyalty & dues (exclude membership fee from earning medicine loyalty points if pure membership)
    if (invoiceData.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== invoiceData.customerId) return c;
          const earnedPoints = Math.floor(invoiceData.grandTotal / 100);
          const addedDue = invoiceData.paymentMode === 'CREDIT' ? invoiceData.balanceDue : 0;
          return {
            ...c,
            loyaltyPoints: c.loyaltyPoints + earnedPoints,
            currentDue: c.currentDue + addedDue,
          };
        })
      );
    }

    // Update Membership purchase history if member billed
    if (invoiceData.membershipId) {
      setMemberships((prev) =>
        prev.map((m) => {
          if (m.membershipId !== invoiceData.membershipId && m.id !== invoiceData.membershipId) return m;
          const purchaseHistoryItem: MembershipHistoryItem = {
            id: `mh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            date: invoiceDate,
            action: 'PURCHASE_APPLIED',
            performedBy: currentUser.name,
            invoiceNumber: invNumber,
            discountAmount: invoiceData.membershipDiscountAmount || 0,
            notes: `Applied ${invoiceData.membershipTier || 'membership'} tier discount of ₹${(invoiceData.membershipDiscountAmount || 0).toFixed(2)} on bill ${invNumber}.`,
          };
          return {
            ...m,
            history: [purchaseHistoryItem, ...m.history],
          };
        })
      );
    }

    if (!isOnline) {
      newInvoice.isOfflineQueued = true;
      setOfflineQueue((prev) => [...prev, newInvoice]);
      logAudit('SALE', 'Offline POS', `[OFFLINE CASH DRAWER] Cached Invoice ${invNumber} locally for offline sync.`);
    } else {
      logAudit('SALE', 'Sales POS', `Generated invoice ${invNumber} for ${invoiceData.customerName} (₹${invoiceData.grandTotal}, ${invoiceData.paymentMode})`);
    }

    setInvoices((prev) => [newInvoice, ...prev]);
    return newInvoice;
  };

  // Hold / Resume Bills (Human touch counter workflow)
  const holdBill = (cartItems: any[], customerName: string, customerPhone: string, doctorName: string, notes?: string): HeldBills => {
    const held: HeldBills = {
      id: `hold-${Date.now()}`,
      holdTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      doctorName: doctorName || 'Self',
      items: cartItems,
      totalAmount: cartItems.reduce((sum, i) => sum + i.totalAmount, 0),
      note: notes,
    };
    setHeldBills((prev) => [held, ...prev]);
    logAudit('SALE', 'POS Counter', `Parked/Held Bill #${held.id.slice(-4)} for ${held.customerName} (${held.items.length} items)`);
    return held;
  };

  const resumeHeldBill = (heldId: string): HeldBills | null => {
    const found = heldBills.find((h) => h.id === heldId);
    if (found) {
      setHeldBills((prev) => prev.filter((h) => h.id !== heldId));
      logAudit('SALE', 'POS Counter', `Resumed parked bill for ${found.customerName}`);
      return found;
    }
    return null;
  };

  const deleteHeldBill = (heldId: string) => {
    setHeldBills((prev) => prev.filter((h) => h.id !== heldId));
  };

  // Sales Return & Credit Note Management
  const processSalesReturn = (returnData: Omit<SalesReturn, 'id' | 'returnNumber' | 'returnDate'>): SalesReturn => {
    const count = salesReturns.length + 1;
    const returnNumber = (returnData as any).returnNumber || `SR-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const returnDate = (returnData as any).returnDate || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newReturnId = (returnData as any).id || `sr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Inventory Integrity: Separate sellable condition from damaged/expired quarantine
    const sellableItems = returnData.items.filter(
      (item) => item.reason !== 'DAMAGED' && item.reason !== 'EXPIRED'
    );
    const nonSellableItems = returnData.items.filter(
      (item) => item.reason === 'DAMAGED' || item.reason === 'EXPIRED'
    );

    // Only unopened / sellable items are restored to active sellable batch stock
    if (sellableItems.length > 0) {
      setMedicines((prev) =>
        prev.map((med) => {
          const returnedItems = sellableItems.filter((item) => item.medicineId === med.id);
          if (returnedItems.length === 0) return med;

          let updatedBatches = [...med.batches];
          returnedItems.forEach((item) => {
            updatedBatches = updatedBatches.map((b) => {
              if (b.batchNumber === item.batchNumber) {
                return { ...b, availableQuantity: b.availableQuantity + item.returnQuantity };
              }
              return b;
            });
          });

          const totalStock = updatedBatches.reduce((sum, b) => sum + b.availableQuantity, 0);
          return { ...med, batches: updatedBatches, totalStock };
        })
      );
    }

    // Damaged or Expired returned items are quarantined in the Damaged Stock register
    if (nonSellableItems.length > 0) {
      const damagedEntries: DamagedStockEntry[] = nonSellableItems.map((item) => ({
        id: `dmg-sr-${Date.now()}-${item.invoiceItemId}`,
        date: returnDate.substring(0, 10),
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        batchNumber: item.batchNumber,
        quantity: item.returnQuantity,
        costRate: item.refundRate,
        totalLoss: Math.round(item.refundAmount * 100) / 100,
        reason: item.reason === 'DAMAGED' ? 'STRIP_TORN' : 'CONTAMINATED',
        disposedBy: returnData.processedBy || currentUser?.name || 'Pharmacist',
      }));
      setDamagedStock((prev) => [...damagedEntries, ...prev]);
    }

    // Update original invoice status and cumulative returnAmount
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === returnData.originalInvoiceId || inv.invoiceNumber === returnData.originalInvoiceNumber) {
          return {
            ...inv,
            isReturned: true,
            returnAmount: (inv.returnAmount || 0) + returnData.totalRefundAmount,
          };
        }
        return inv;
      })
    );

    let cashTxId: string | undefined = undefined;
    let isCashPaid = false;

    // 2. Settlement & Cash Drawer Deductions:
    if (returnData.refundMode === 'CASH') {
      isCashPaid = true;

      // Prevent duplicate cash deductions if this return was already recorded
      const existingTx = cashDrawerTransactions.find(
        (t) =>
          t.referenceNumber === returnNumber ||
          t.returnId === returnNumber ||
          t.referenceId === newReturnId
      );

      if (!existingTx) {
        cashTxId = `cdt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const cdtCount = cashDrawerTransactions.length + 1;
        const cashTx: CashDrawerTransaction = {
          id: cashTxId,
          transactionNumber: `CDT-${new Date().getFullYear()}-${String(cdtCount).padStart(5, '0')}`,
          date: returnDate,
          type: 'SALES_RETURN_REFUND',
          direction: 'OUT',
          amount: returnData.totalRefundAmount,
          paymentMethod: 'CASH',
          referenceId: newReturnId,
          referenceNumber: returnNumber,
          returnId: returnNumber,
          originalInvoiceNumber: returnData.originalInvoiceNumber,
          partyId: returnData.customerId || '',
          partyName: returnData.customerName || 'Walk-in Customer',
          reason: 'Medicine sales return',
          cashierName: returnData.processedBy || currentUser?.name || 'Pharmacist',
          notes: returnData.notes || `Cash refund for sales return ${returnNumber} against ${returnData.originalInvoiceNumber}`,
          isReconciled: false,
        };

        setCashDrawerTransactions((prev) => [cashTx, ...prev]);

        // Also record in PaymentTransaction ledger
        const payEntry: PaymentTransaction = {
          id: `pay-sr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          date: returnDate,
          type: 'SALES_RETURN_REFUND',
          partyId: returnData.customerId || 'walk-in',
          partyName: returnData.customerName || 'Walk-in Customer',
          partyType: 'CUSTOMER',
          amount: returnData.totalRefundAmount,
          paymentMode: 'CASH',
          referenceNumber: returnNumber,
          notes: `Cash refund for sales return ${returnNumber} (Invoice: ${returnData.originalInvoiceNumber})`,
        };
        setPayments((prev) => [payEntry, ...prev]);
      } else {
        cashTxId = existingTx.id;
      }
    } else if (returnData.refundMode === 'CREDIT_NOTE') {
      // CREDIT NOTE: Does NOT decrease physical cash. Deducts customer khata due directly.
      if (returnData.customerId) {
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id !== returnData.customerId) return c;
            return { ...c, currentDue: Math.max(0, c.currentDue - returnData.totalRefundAmount) };
          })
        );
      }
    }
    // BANK_TRANSFER / UPI / CARD refunds do NOT decrease physical cash drawer

    const newReturn: SalesReturn = {
      ...returnData,
      id: newReturnId,
      returnNumber,
      returnDate,
      cashDrawerTransactionId: cashTxId,
      isCashRefundPaid: isCashPaid,
    };

    setSalesReturns((prev) => {
      const filtered = prev.filter((r) => r.id !== newReturn.id && r.returnNumber !== newReturn.returnNumber);
      return [newReturn, ...filtered];
    });

    logAudit(
      'RETURN',
      'Sales Return',
      `Processed Return ${returnNumber} against ${returnData.originalInvoiceNumber} (Refund: ₹${returnData.totalRefundAmount.toFixed(2)} via ${returnData.refundMode}). ${returnData.refundMode === 'CASH' ? `Deducted ₹${returnData.totalRefundAmount.toFixed(2)} from Cash Drawer.` : 'No physical cash deduction.'}`
    );

    return newReturn;
  };

  // Purchase Management
  const createPurchase = (purchaseData: Omit<PurchaseEntry, 'id' | 'grnNumber'>): PurchaseEntry => {
    const grnCount = purchases.length + 1;
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(grnCount).padStart(4, '0')}`;

    const newPurchase: PurchaseEntry = {
      ...purchaseData,
      id: `pur-${Date.now()}`,
      grnNumber,
    };

    setMedicines((prevMedicines) =>
      prevMedicines.map((med) => {
        const purchaseItems = purchaseData.items.filter((item) => item.medicineId === med.id);
        if (purchaseItems.length === 0) return med;

        let updatedBatches = [...med.batches];
        purchaseItems.forEach((item) => {
          const totalReceived = item.quantity + (item.freeQuantity || 0);
          const existingBatchIndex = updatedBatches.findIndex((b) => b.batchNumber === item.batchNumber);

          if (existingBatchIndex >= 0) {
            const eb = updatedBatches[existingBatchIndex];
            updatedBatches[existingBatchIndex] = {
              ...eb,
              quantity: eb.quantity + totalReceived,
              availableQuantity: eb.availableQuantity + totalReceived,
              purchaseRate: item.purchaseRate,
              mrp: item.mrp,
              saleRate: item.saleRate,
              expiryDate: item.expiryDate,
              mfgDate: item.mfgDate,
            };
          } else {
            const today = new Date();
            const exp = new Date(item.expiryDate);
            const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            let status: Batch['status'] = 'ACTIVE';
            if (diffDays <= 0) status = 'EXPIRED';
            else if (diffDays <= 90) status = 'NEAR_EXPIRY';

            updatedBatches.push({
              id: `bat-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              medicineId: med.id,
              batchNumber: item.batchNumber,
              mfgDate: item.mfgDate,
              expiryDate: item.expiryDate,
              quantity: totalReceived,
              availableQuantity: totalReceived,
              purchaseRate: item.purchaseRate,
              mrp: item.mrp,
              saleRate: item.saleRate,
              rackLocation: item.rackLocation || 'Rack General',
              barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
              supplierId: purchaseData.supplierId,
              status,
            });
          }
        });

        const totalStock = updatedBatches.reduce((sum, b) => sum + b.availableQuantity, 0);
        return { ...med, batches: updatedBatches, totalStock };
      })
    );

    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id !== purchaseData.supplierId) return s;
        return { ...s, currentBalance: s.currentBalance + purchaseData.balanceDue };
      })
    );

    setPurchases((prev) => [newPurchase, ...prev]);
    logAudit('CREATE', 'Purchase GRN', `Recorded Inward GRN ${grnNumber} from ${purchaseData.supplierName} (Total: ₹${purchaseData.grandTotal})`);
    return newPurchase;
  };

  // Purchase Return
  const processPurchaseReturn = (returnData: Omit<PurchaseReturn, 'id' | 'debitNoteNumber' | 'returnDate'>): PurchaseReturn => {
    const count = purchaseReturns.length + 1;
    const debitNoteNumber = `DN-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const returnDate = new Date().toISOString().substring(0, 10);

    const newReturn: PurchaseReturn = {
      ...returnData,
      id: `pret-${Date.now()}`,
      debitNoteNumber,
      returnDate,
    };

    setMedicines((prev) =>
      prev.map((med) => {
        const returned = returnData.items.filter((i) => i.medicineId === med.id);
        if (returned.length === 0) return med;

        let batches = [...med.batches];
        returned.forEach((item) => {
          batches = batches.map((b) => {
            if (b.batchNumber === item.batchNumber) {
              return { ...b, availableQuantity: Math.max(0, b.availableQuantity - item.returnQuantity) };
            }
            return b;
          });
        });
        const totalStock = batches.reduce((sum, b) => sum + b.availableQuantity, 0);
        return { ...med, batches, totalStock };
      })
    );

    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id !== returnData.supplierId) return s;
        return { ...s, currentBalance: Math.max(0, s.currentBalance - returnData.totalDebitAmount) };
      })
    );

    setPurchaseReturns((prev) => [newReturn, ...prev]);
    logAudit('RETURN', 'Purchase Return', `Issued Debit Note ${debitNoteNumber} to ${returnData.supplierName} (₹${returnData.totalDebitAmount})`);
    return newReturn;
  };

  // Customer & Supplier CRUD
  const addCustomer = (cust: Omit<Customer, 'id' | 'createdDate' | 'loyaltyPoints' | 'currentDue'>) => {
    const newCust: Customer = {
      ...cust,
      id: `cust-${Date.now()}`,
      createdDate: new Date().toISOString().substring(0, 10),
      loyaltyPoints: 0,
      currentDue: 0,
    };
    setCustomers((prev) => [...prev, newCust]);
    logAudit('CREATE', 'Customers', `Registered customer: ${newCust.name} (${newCust.phone})`);
    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addSupplier = (sup: Omit<Supplier, 'id' | 'currentBalance'>) => {
    const newSup: Supplier = {
      ...sup,
      id: `sup-${Date.now()}`,
      currentBalance: 0,
    };
    setSuppliers((prev) => [...prev, newSup]);
    return newSup;
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  // Expenses & Ledgers
  const addExpense = (exp: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...exp,
      id: `exp-${Date.now()}`,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    logAudit('CREATE', 'Expenses', `Logged expense: ${exp.title} (₹${exp.amount})`);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const recordPayment = (paymentData: Omit<PaymentTransaction, 'id' | 'date'>) => {
    const newPayment: PaymentTransaction = {
      ...paymentData,
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    if (paymentData.type === 'CUSTOMER_COLLECTION') {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== paymentData.partyId) return c;
          return { ...c, currentDue: Math.max(0, c.currentDue - paymentData.amount) };
        })
      );
    } else {
      setSuppliers((prev) =>
        prev.map((s) => {
          if (s.id !== paymentData.partyId) return s;
          return { ...s, currentBalance: Math.max(0, s.currentBalance - paymentData.amount) };
        })
      );
    }

    setPayments((prev) => [newPayment, ...prev]);
    logAudit('UPDATE', 'Payments Ledger', `Recorded ${paymentData.type}: ₹${paymentData.amount} for ${paymentData.partyName}`);
  };

  // Cash Drawer Management & Out Transactions
  const recordCashDrawerTransaction = (
    txData: Omit<CashDrawerTransaction, 'id' | 'transactionNumber'>
  ): CashDrawerTransaction => {
    // Idempotent check: if transaction with this referenceId/returnId exists, return existing
    const existing = cashDrawerTransactions.find(
      (t) =>
        (txData.returnId && t.returnId === txData.returnId) ||
        (txData.referenceId && t.referenceId === txData.referenceId)
    );
    if (existing) {
      return existing;
    }

    const cdtCount = cashDrawerTransactions.length + 1;
    const newTx: CashDrawerTransaction = {
      ...txData,
      id: `cdt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      transactionNumber: `CDT-${new Date().getFullYear()}-${String(cdtCount).padStart(5, '0')}`,
    };

    setCashDrawerTransactions((prev) => [newTx, ...prev]);
    logAudit(
      'UPDATE',
      'Cash Drawer',
      `Cash ${newTx.direction}: ₹${newTx.amount.toFixed(2)} for ${newTx.reason} (${newTx.type})`
    );
    return newTx;
  };

  // Reconcile Historical Sales Return Cash Refunds Without Duplicate Entries
  const reconcileCashDrawerReturns = (): number => {
    let count = 0;
    const newDrawerTxs: CashDrawerTransaction[] = [];
    const newPayTxs: PaymentTransaction[] = [];

    // Scan all returns with refundMode === 'CASH'
    salesReturns.forEach((sr) => {
      if (sr.refundMode === 'CASH' && sr.isCashRefundPaid !== false) {
        const alreadyHasTx =
          cashDrawerTransactions.some(
            (t) =>
              t.referenceNumber === sr.returnNumber ||
              t.returnId === sr.returnNumber ||
              t.referenceId === sr.id
          ) ||
          newDrawerTxs.some(
            (t) =>
              t.referenceNumber === sr.returnNumber ||
              t.returnId === sr.returnNumber ||
              t.referenceId === sr.id
          );

        if (!alreadyHasTx) {
          count++;
          const txId = sr.cashDrawerTransactionId || `cdt-rec-${sr.id}`;
          const drawerTx: CashDrawerTransaction = {
            id: txId,
            transactionNumber: `CDT-REC-${sr.returnNumber}`,
            date: sr.returnDate,
            type: 'SALES_RETURN_REFUND',
            direction: 'OUT',
            amount: sr.totalRefundAmount,
            paymentMethod: 'CASH',
            referenceId: sr.id,
            referenceNumber: sr.returnNumber,
            returnId: sr.returnNumber,
            originalInvoiceNumber: sr.originalInvoiceNumber,
            partyId: sr.customerId || '',
            partyName: sr.customerName || 'Walk-in Customer',
            reason: 'Medicine sales return',
            cashierName: sr.processedBy || 'Pharmacist',
            notes: `Reconciled historical cash refund for ${sr.returnNumber} (Invoice: ${sr.originalInvoiceNumber})`,
            isReconciled: true,
          };
          newDrawerTxs.push(drawerTx);

          newPayTxs.push({
            id: `pay-rec-${sr.id}`,
            date: sr.returnDate,
            type: 'SALES_RETURN_REFUND',
            partyId: sr.customerId || 'walk-in',
            partyName: sr.customerName || 'Walk-in Customer',
            partyType: 'CUSTOMER',
            amount: sr.totalRefundAmount,
            paymentMode: 'CASH',
            referenceNumber: sr.returnNumber,
            notes: `Reconciled historical refund for ${sr.returnNumber}`,
          });
        }
      }
    });

    if (newDrawerTxs.length > 0) {
      setCashDrawerTransactions((prev) => [...newDrawerTxs, ...prev]);
      setPayments((prev) => [...newPayTxs, ...prev]);
      logAudit(
        'UPDATE',
        'Cash Drawer Reconciliation',
        `Reconciled ${newDrawerTxs.length} historical sales return cash refunds totaling ₹${newDrawerTxs.reduce((s, t) => s + t.amount, 0).toFixed(2)}.`
      );
    }

    return count;
  };

  // Auto-reconcile on initial load once isLoaded is true
  useEffect(() => {
    if (!isLoaded) return;
    reconcileCashDrawerReturns();
  }, [isLoaded]);

  // Unified Cash Drawer Balance & Daily Summary Calculator
  const getCashDrawerSummary = (targetDate?: string) => {
    const isAll = targetDate === 'ALL';
    const dateStr = targetDate || new Date().toISOString().substring(0, 10);
    const dayInvoices = isAll
      ? invoices
      : invoices.filter((i) => i.invoiceDate.startsWith(dateStr));

    // Cash sales received: PAID invoices with CASH payment mode, plus split cash portion
    const totalSalesCash =
      dayInvoices
        .filter((i) => i.paymentMode === 'CASH' && i.paymentStatus === 'PAID')
        .reduce((s, i) => s + i.amountPaid, 0) +
      dayInvoices
        .filter((i) => i.paymentMode === 'SPLIT' && i.splitDetails?.cash && i.paymentStatus === 'PAID')
        .reduce((s, i) => s + (i.splitDetails?.cash || 0), 0);

    const totalSalesUPI = dayInvoices
      .filter((i) => i.paymentMode === 'UPI' && i.paymentStatus === 'PAID')
      .reduce((s, i) => s + i.amountPaid, 0);

    const totalSalesCard = dayInvoices
      .filter((i) => i.paymentMode === 'CARD' && i.paymentStatus === 'PAID')
      .reduce((s, i) => s + i.amountPaid, 0);

    const totalSalesTerminal = dayInvoices
      .filter((i) => i.paymentMode === 'POS_TERMINAL' && i.paymentStatus === 'PAID')
      .reduce((s, i) => s + i.amountPaid, 0);

    const totalSalesCredit = dayInvoices
      .filter((i) => i.paymentMode === 'CREDIT')
      .reduce((s, i) => s + i.balanceDue, 0);

    const totalGrossSales = dayInvoices.reduce((s, i) => s + i.grandTotal, 0);

    // Customer dues collected in cash
    const todayCustomerDuesCollected = isAll
      ? payments.filter((p) => p.type === 'CUSTOMER_COLLECTION' && p.paymentMode === 'CASH').reduce((s, p) => s + p.amount, 0)
      : payments.filter((p) => p.date.startsWith(dateStr) && p.type === 'CUSTOMER_COLLECTION' && p.paymentMode === 'CASH').reduce((s, p) => s + p.amount, 0);

    // Expenses in cash
    const todayExpensesCash = isAll
      ? expenses.filter((e) => e.paymentMode === 'CASH').reduce((s, e) => s + e.amount, 0)
      : expenses.filter((e) => e.date === dateStr || e.date.startsWith(dateStr)).filter((e) => e.paymentMode === 'CASH').reduce((s, e) => s + e.amount, 0);

    // Supplier settlements in cash
    const todaySupplierPayoutsCash = isAll
      ? payments.filter((p) => p.type === 'SUPPLIER_PAYMENT' && p.paymentMode === 'CASH').reduce((s, p) => s + p.amount, 0)
      : payments.filter((p) => p.date.startsWith(dateStr) && p.type === 'SUPPLIER_PAYMENT' && p.paymentMode === 'CASH').reduce((s, p) => s + p.amount, 0);

    // Cash refunds paid: from cashDrawerTransactions where type === 'SALES_RETURN_REFUND' and paymentMethod === 'CASH'
    const refundTxsOnDate = isAll
      ? cashDrawerTransactions.filter((t) => t.type === 'SALES_RETURN_REFUND' && t.paymentMethod === 'CASH')
      : cashDrawerTransactions.filter((t) => t.date.startsWith(dateStr) && t.type === 'SALES_RETURN_REFUND' && t.paymentMethod === 'CASH');

    // Unreconciled cash returns (if any)
    const unreconciledOnDate = (isAll ? salesReturns : salesReturns.filter((sr) => sr.returnDate.startsWith(dateStr)))
      .filter((sr) =>
        sr.refundMode === 'CASH' &&
        sr.isCashRefundPaid !== false &&
        !refundTxsOnDate.some((t) => t.referenceNumber === sr.returnNumber || t.returnId === sr.returnNumber || t.referenceId === sr.id)
      );

    const todaySalesReturnCashRefunds = Number(
      (
        refundTxsOnDate.reduce((s, t) => s + t.amount, 0) +
        unreconciledOnDate.reduce((s, sr) => s + sr.totalRefundAmount, 0)
      ).toFixed(2)
    );

    // Other cash inflows / outflows
    const otherCashInflows = Number(
      cashDrawerTransactions
        .filter((t) => (isAll || t.date.startsWith(dateStr)) && t.direction === 'IN' && t.type !== 'CASH_SALE' && t.type !== 'CUSTOMER_COLLECTION')
        .reduce((s, t) => s + t.amount, 0)
        .toFixed(2)
    );

    const otherCashOutflows = Number(
      cashDrawerTransactions
        .filter((t) => (isAll || t.date.startsWith(dateStr)) && t.direction === 'OUT' && t.type !== 'SALES_RETURN_REFUND' && t.type !== 'EXPENSE_PAYMENT' && t.type !== 'SUPPLIER_PAYMENT')
        .reduce((s, t) => s + t.amount, 0)
        .toFixed(2)
    );

    // Opening Cash
    const openingCash = Number((settings.cashDrawerOpeningBalance || 0).toFixed(2));

    const totalCashInflows = Number((totalSalesCash + todayCustomerDuesCollected + otherCashInflows).toFixed(2));
    const totalCashOutflows = Number(
      (todaySalesReturnCashRefunds + todayExpensesCash + todaySupplierPayoutsCash + otherCashOutflows).toFixed(2)
    );

    const expectedCashInDrawer = Number((openingCash + totalCashInflows - totalCashOutflows).toFixed(2));

    return {
      openingCash,
      totalSalesCash,
      totalSalesUPI,
      totalSalesCard,
      totalSalesTerminal,
      totalSalesCredit,
      totalGrossSales,
      todayCustomerDuesCollected,
      todaySalesReturnCashRefunds,
      todayExpensesCash,
      todaySupplierPayoutsCash,
      otherCashInflows,
      otherCashOutflows,
      totalCashInflows,
      totalCashOutflows,
      expectedCashInDrawer,
      cashRefundTransactions: refundTxsOnDate,
      unreconciledReturns: unreconciledOnDate,
    };
  };

  const updateSalesReturnRefundStatus = (returnId: string, isPaid: boolean) => {
    setSalesReturns((prev) =>
      prev.map((sr) => {
        if (sr.id === returnId || sr.returnNumber === returnId) {
          return { ...sr, isCashRefundPaid: isPaid };
        }
        return sr;
      })
    );

    if (!isPaid) {
      setCashDrawerTransactions((prev) =>
        prev.filter(
          (t) =>
            t.returnId !== returnId &&
            t.referenceNumber !== returnId &&
            t.referenceId !== returnId
        )
      );
      setPayments((prev) =>
        prev.filter(
          (p) =>
            p.referenceNumber !== returnId &&
            p.id !== `pay-rec-${returnId}` &&
            p.id !== `pay-sr-${returnId}`
        )
      );
      logAudit(
        'UPDATE',
        'Sales Return Refund Review',
        `Return ${returnId} marked as UNPAID. Associated cash drawer OUT deductions removed.`
      );
    } else {
      reconcileCashDrawerReturns();
    }
  };

  // Day End Closing Register
  const recordDayClosing = (
    actualCash: number,
    notes?: string,
    customDate?: string
  ): DayClosingRecord => {
    const targetDate = customDate || new Date().toISOString().substring(0, 10);
    const summary = getCashDrawerSummary(targetDate);
    const discrepancyAmount = actualCash - summary.expectedCashInDrawer;

    const closingRecord: DayClosingRecord = {
      id: `close-${Date.now()}`,
      date: targetDate,
      closedAt: new Date().toLocaleTimeString(),
      closedBy: currentUser.name,
      openingCash: summary.openingCash,
      totalSalesCash: summary.totalSalesCash,
      totalSalesUPI: summary.totalSalesUPI,
      totalSalesCard: summary.totalSalesCard,
      totalSalesCredit: summary.totalSalesCredit,
      totalGrossSales: summary.totalGrossSales,
      totalCustomerDuesCollected: summary.todayCustomerDuesCollected,
      totalCashRefunds: summary.todaySalesReturnCashRefunds,
      totalExpensesPaid: summary.todayExpensesCash,
      totalSupplierPayouts: summary.todaySupplierPayoutsCash,
      expectedCashInDrawer: summary.expectedCashInDrawer,
      actualCashInDrawer: actualCash,
      discrepancyAmount,
      notes,
    };

    setDayClosingRecords((prev) => [closingRecord, ...prev]);
    logAudit(
      'BACKUP',
      'Day Closing Register',
      `Closed shift for ${targetDate}: Expected Cash ₹${summary.expectedCashInDrawer.toFixed(2)} (Cash Sales: ₹${summary.totalSalesCash.toFixed(2)}, Refunds: -₹${summary.todaySalesReturnCashRefunds.toFixed(2)}), Actual ₹${actualCash.toFixed(2)}, Diff ₹${discrepancyAmount.toFixed(2)}`
    );
    return closingRecord;
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // AI & Velocity
  const getAIReorderRecommendations = (): AIReorderRecommendation[] => {
    return medicines
      .map((med) => {
        const totalStock = med.batches.reduce((sum, b) => sum + b.availableQuantity, 0);
        const soldQty = invoices
          .flatMap((i) => i.items)
          .filter((item) => item.medicineId === med.id)
          .reduce((sum, item) => sum + item.quantity, 0);

        const velocity = Math.max(0.8, Math.round((soldQty / 7) * 10) / 10);
        const daysRemaining = Math.round(totalStock / velocity);
        const isUrgent = totalStock <= med.reorderLevel;
        const reorderQty = Math.max(med.reorderLevel * 2, Math.round(velocity * 30));

        const primarySupplier = suppliers[0]?.name || 'MedSource Pharma Distributors';
        const costPrice = med.batches[0]?.purchaseRate || 50;

        return {
          medicineId: med.id,
          medicineName: med.name,
          genericName: med.genericName,
          currentStock: totalStock,
          salesVelocityPerDay: velocity,
          daysRemaining,
          recommendedOrderQty: reorderQty,
          estimatedCost: reorderQty * costPrice,
          preferredSupplier: primarySupplier,
          urgency: (daysRemaining <= 7 || isUrgent ? 'HIGH' : daysRemaining <= 15 ? 'MEDIUM' : 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW',
          reason: isUrgent
            ? `Stock below safety reorder threshold (${med.reorderLevel} units). Stockout in ~${daysRemaining} days.`
            : `30-day buffer based on run rate of ${velocity} units/day.`,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  };

  const getAINearExpiryStrategies = (): AINearExpiryStrategy[] => {
    const strategies: AINearExpiryStrategy[] = [];
    const today = new Date();

    medicines.forEach((med) => {
      med.batches.forEach((b) => {
        if (b.availableQuantity <= 0) return;
        const exp = new Date(b.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 90 && diffDays > 0) {
          const discount = diffDays <= 30 ? 40 : diffDays <= 60 ? 25 : 15;
          strategies.push({
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            daysToExpiry: diffDays,
            stockQty: b.availableQuantity,
            currentMrp: b.mrp,
            suggestedDiscountPercent: discount,
            action: diffDays <= 30 ? 'CLEARANCE_PROMOTION' : 'BUNDLE_OFFER',
            rationale: `Expiring in ${diffDays} days. A ${discount}% markdown will liquidate ~${b.availableQuantity} units.`,
          });
        } else if (diffDays <= 0) {
          strategies.push({
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            daysToExpiry: diffDays,
            stockQty: b.availableQuantity,
            currentMrp: b.mrp,
            suggestedDiscountPercent: 0,
            action: 'RETURN_TO_SUPPLIER',
            rationale: `Expired on ${b.expiryDate}. Quarantine immediately and generate Debit Note claim.`,
          });
        }
      });
    });

    return strategies;
  };

  // Membership Management Methods
  const createMembership = (data: Omit<Membership, 'id' | 'membershipId' | 'createdDate' | 'history'>): Membership => {
    const nextNum = membershipSettings.nextNumber;
    const year = new Date().getFullYear();
    const formattedId = `${membershipSettings.idPrefix}-${year}-${String(nextNum).padStart(4, '0')}`;
    const newNextNum = nextNum + 1;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newMembership: Membership = {
      ...data,
      id: `mem-${Date.now()}`,
      membershipId: formattedId,
      createdDate: nowStr.split(' ')[0],
      createdBy: currentUser.name,
      history: [
        {
          id: `mh-${Date.now()}-init`,
          date: nowStr,
          action: 'CREATED',
          newExpiryDate: data.expiryDate,
          newStatus: data.status,
          performedBy: currentUser.name,
          notes: data.notes || `Registered new membership (${data.durationLabel}) for ${data.customerName}.`,
        },
      ],
    };

    setMemberships((prev) => [newMembership, ...prev]);
    setMembershipSettings((prev) => ({
      ...prev,
      nextNumber: newNextNum,
    }));

    logAudit(
      'CREATE',
      'Membership Module',
      `Registered new membership ${formattedId} for ${data.customerName} (${data.customerPhone}, ${data.durationLabel})`
    );

    return newMembership;
  };

  const renewMembership = (membershipId: string, durationMonths: number, notes?: string, feePaid?: number, paymentMode?: PaymentMode): Membership | null => {
    let updatedMember: Membership | null = null;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const todayStr = nowStr.split(' ')[0];

    setMemberships((prev) =>
      prev.map((m) => {
        if (m.id !== membershipId && m.membershipId !== membershipId) return m;

        const isCurrentlyValid = m.expiryDate >= todayStr && m.status !== 'EXPIRED';
        const baseDate = isCurrentlyValid ? m.expiryDate : todayStr;
        const newExpiryDate = calculateExpiryDate(baseDate, durationMonths);
        const durationLabel = `${durationMonths} Month${durationMonths > 1 ? 's' : ''}`;

        const renewalHistory: MembershipHistoryItem = {
          id: `mh-${Date.now()}-renew`,
          date: nowStr,
          action: 'RENEWED',
          previousExpiryDate: m.expiryDate,
          newExpiryDate,
          previousStatus: m.status,
          newStatus: 'ACTIVE',
          performedBy: currentUser.name,
          notes: notes || `Renewed membership for ${durationLabel} (Fee: ₹${feePaid || 0} via ${paymentMode || 'CASH'}). Extended to ${newExpiryDate}.`,
        };

        updatedMember = {
          ...m,
          expiryDate: newExpiryDate,
          durationMonths,
          durationLabel,
          status: 'ACTIVE',
          feePaid: (m.feePaid || 0) + (feePaid || 0),
          paymentMode: paymentMode || m.paymentMode,
          history: [renewalHistory, ...m.history],
        };
        return updatedMember;
      })
    );

    if (updatedMember) {
      logAudit(
        'UPDATE',
        'Membership Module',
        `Renewed membership ${(updatedMember as Membership).membershipId} for ${(updatedMember as Membership).customerName} to ${(updatedMember as Membership).expiryDate}`
      );
    }

    return updatedMember;
  };

  const extendMembership = (membershipId: string, additionalDays: number, notes?: string): Membership | null => {
    let updatedMember: Membership | null = null;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const todayStr = nowStr.split(' ')[0];

    setMemberships((prev) =>
      prev.map((m) => {
        if (m.id !== membershipId && m.membershipId !== membershipId) return m;

        const baseDate = m.expiryDate >= todayStr ? m.expiryDate : todayStr;
        const newExpiryDate = calculateExpiryDate(baseDate, 0, additionalDays);

        const extendHistory: MembershipHistoryItem = {
          id: `mh-${Date.now()}-extend`,
          date: nowStr,
          action: 'EXTENDED',
          previousExpiryDate: m.expiryDate,
          newExpiryDate,
          previousStatus: m.status,
          newStatus: 'ACTIVE',
          performedBy: currentUser.name,
          notes: notes || `Extended membership by ${additionalDays} days to ${newExpiryDate}.`,
        };

        updatedMember = {
          ...m,
          expiryDate: newExpiryDate,
          status: 'ACTIVE',
          history: [extendHistory, ...m.history],
        };
        return updatedMember;
      })
    );

    if (updatedMember) {
      logAudit(
        'UPDATE',
        'Membership Module',
        `Extended membership ${(updatedMember as Membership).membershipId} for ${(updatedMember as Membership).customerName} by ${additionalDays} days`
      );
    }

    return updatedMember;
  };

  const updateMembershipStatus = (membershipId: string, status: MembershipStatus, notes?: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let targetMember: Membership | undefined;

    setMemberships((prev) =>
      prev.map((m) => {
        if (m.id !== membershipId && m.membershipId !== membershipId) return m;
        targetMember = m;

        let action: MembershipHistoryAction = 'SUSPENDED';
        if (status === 'ACTIVE') action = 'REACTIVATED';
        else if (status === 'CANCELLED') action = 'CANCELLED';

        const historyItem: MembershipHistoryItem = {
          id: `mh-${Date.now()}-status`,
          date: nowStr,
          action,
          previousStatus: m.status,
          newStatus: status,
          performedBy: currentUser.name,
          notes: notes || `Changed status from ${m.status} to ${status}.`,
        };

        return {
          ...m,
          status,
          history: [historyItem, ...m.history],
        };
      })
    );

    if (targetMember) {
      logAudit(
        'UPDATE',
        'Membership Module',
        `Updated status for membership ${(targetMember as Membership).membershipId} (${(targetMember as Membership).customerName}) to ${status}`
      );
    }
  };

  const updateMembership = (id: string, updates: Partial<Membership>) => {
    setMemberships((prev) =>
      prev.map((m) => {
        if (m.id === id || m.membershipId === id) {
          return { ...m, ...updates };
        }
        return m;
      })
    );
    logAudit('UPDATE', 'Membership Module', `Updated member profile details for ${id}`);
  };

  const updateMembershipSettings = (settingsUpdates: Partial<MembershipSettings>) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const auditEntry = {
      date: nowStr,
      updatedBy: `${currentUser.name} (${currentUser.role})`,
      changes: `Updated membership settings: ${Object.keys(settingsUpdates).join(', ')}`,
    };

    setMembershipSettings((prev) => ({
      ...prev,
      ...settingsUpdates,
      lastUpdated: nowStr,
      updatedBy: `${currentUser.name} (${currentUser.role})`,
      auditLog: [auditEntry, ...(prev.auditLog || [])],
    }));

    logAudit('UPDATE', 'Membership Settings', `Modified membership discount & duration rules`, settingsUpdates);
  };

  const getMemberByPhone = (phone: string): Membership | undefined => {
    if (!phone) return undefined;
    const clean = phone.replace(/\D/g, '');
    if (!clean) return undefined;
    return memberships.find((m) => {
      const mClean = m.customerPhone.replace(/\D/g, '');
      return mClean === clean || mClean.endsWith(clean) || clean.endsWith(mClean);
    });
  };

  const getMemberById = (id: string): Membership | undefined => {
    if (!id) return undefined;
    return memberships.find((m) => m.id === id || m.membershipId === id);
  };

  const createPendingMembership = (
    data: Omit<PendingMembershipRegistration, 'id' | 'memberId' | 'status' | 'createdAt'>
  ): PendingMembershipRegistration => {
    const year = new Date().getFullYear();
    const count = memberships.length + pendingMemberships.filter((p) => !p.isRenewal).length + 1;
    const memberId = data.isRenewal && data.renewingMembershipId
      ? data.renewingMembershipId
      : `${membershipSettings.idPrefix || 'MEM'}-${year}-${String(membershipSettings.nextNumber + pendingMemberships.filter((p) => !p.isRenewal).length).padStart(4, '0')}`;

    const newPending: PendingMembershipRegistration = {
      ...data,
      id: `reg-mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      memberId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    setPendingMemberships((prev) => [newPending, ...prev]);
    logAudit(
      'CREATE',
      'Membership Module',
      `Created pending membership registration ${memberId} for ${data.customerName} (${data.durationLabel}, ₹${data.fee})`
    );
    return newPending;
  };

  const cancelPendingMembership = (registrationId: string) => {
    setPendingMemberships((prev) =>
      prev.map((p) => (p.id === registrationId ? { ...p, status: 'CANCELLED' } : p))
    );
  };

  const addMembershipToCartAndNavigate = (pendingReg: PendingMembershipRegistration) => {
    const cartItem: InvoiceItem = {
      id: `item-mem-${Date.now()}`,
      medicineId: 'SERVICE_MEMBERSHIP',
      medicineName: `Customer Membership — ${pendingReg.planName}`,
      genericName: `${pendingReg.durationLabel} | Member ID: ${pendingReg.memberId} | ${pendingReg.customerName} (${pendingReg.customerPhone})`,
      batchId: `BATCH-MEM-${pendingReg.memberId}`,
      batchNumber: pendingReg.memberId,
      expiryDate: pendingReg.expiryDate,
      hsnCode: '998319',
      quantity: 1,
      unit: 'SERVICE',
      unitType: 'STRIP',
      unitsPerPack: 1,
      rate: pendingReg.fee,
      mrp: pendingReg.fee,
      discountPercent: 0,
      discountAmount: 0,
      gstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: pendingReg.fee,
      costRate: 0,
      isMemberDiscountEligible: false,
      itemCategory: 'MEMBERSHIP',
      membershipDetails: {
        registrationId: pendingReg.id,
        memberId: pendingReg.memberId,
        planName: pendingReg.planName,
        durationMonths: pendingReg.durationMonths,
        durationLabel: pendingReg.durationLabel,
        customerName: pendingReg.customerName,
        customerPhone: pendingReg.customerPhone,
        customerEmail: pendingReg.customerEmail,
        customerAddress: pendingReg.customerAddress,
        startDate: pendingReg.startDate,
        expiryDate: pendingReg.expiryDate,
        fee: pendingReg.fee,
        paymentMode: pendingReg.paymentMode,
        isRenewal: pendingReg.isRenewal,
        renewingMembershipId: pendingReg.renewingMembershipId,
        notes: pendingReg.notes,
      },
    };

    setPendingMembershipCartItem(cartItem);
    setActiveTab('pos');
  };

  const toggleMedicineMembershipDiscount = (medicineId: string) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id !== medicineId) return m;
        const currentEligible = m.isMembershipDiscountEligible !== false;
        return {
          ...m,
          isMembershipDiscountEligible: !currentEligible,
        };
      })
    );
  };

  const setMedicineMembershipDiscountBulk = (medicineIds: string[], isEligible: boolean) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (!medicineIds.includes(m.id)) return m;
        return {
          ...m,
          isMembershipDiscountEligible: isEligible,
        };
      })
    );
  };

  // Backup & Reset
  const resetToDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMedicines(INITIAL_MEDICINES);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers(INITIAL_SUPPLIERS);
    setInvoices(INITIAL_INVOICES);
    setHeldBills([]);
    setSalesReturns(INITIAL_SALES_RETURNS);
    setPurchases(INITIAL_PURCHASES);
    setPurchaseReturns([]);
    setExpenses(INITIAL_EXPENSES);
    setPayments([]);
    setCashDrawerTransactions(INITIAL_CASH_DRAWER_TRANSACTIONS);
    setDayClosingRecords([]);
    setDamagedStock([]);
    setUsers(INITIAL_USERS);
    setSettings(INITIAL_SETTINGS);
    setMemberships(INITIAL_MEMBERSHIPS);
    setMembershipSettings(INITIAL_MEMBERSHIP_SETTINGS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    logAudit('BACKUP', 'System Recovery', 'Restored system database to initial factory demo dataset');
  };

  const importDataBackup = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.medicines) setMedicines(parsed.medicines);
      if (parsed.customers) setCustomers(parsed.customers);
      if (parsed.suppliers) setSuppliers(parsed.suppliers);
      if (parsed.invoices) setInvoices(parsed.invoices);
      if (parsed.heldBills) setHeldBills(parsed.heldBills);
      if (parsed.salesReturns) setSalesReturns(parsed.salesReturns);
      if (parsed.purchases) setPurchases(parsed.purchases);
      if (parsed.purchaseReturns) setPurchaseReturns(parsed.purchaseReturns);
      if (parsed.expenses) setExpenses(parsed.expenses);
      if (parsed.payments) setPayments(parsed.payments);
      if (parsed.cashDrawerTransactions) setCashDrawerTransactions(parsed.cashDrawerTransactions);
      if (parsed.dayClosingRecords) setDayClosingRecords(parsed.dayClosingRecords);
      if (parsed.damagedStock) setDamagedStock(parsed.damagedStock);
      if (parsed.users) setUsers(parsed.users);
      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.memberships) setMemberships(parsed.memberships);
      if (parsed.membershipSettings) setMembershipSettings(parsed.membershipSettings);
      logAudit('BACKUP', 'System Recovery', 'Successfully restored database from JSON backup package');
      return true;
    } catch (e) {
      console.error('Failed to parse backup JSON', e);
      return false;
    }
  };

  // ==========================================
  // BARCODE & QR MAPPING LOGIC
  // ==========================================
  const addBarcodeMapping = (mappingData: Omit<BarcodeQRMapping, 'id' | 'mappedAt'>) => {
    const code = mappingData.code.trim();
    if (!code) return { success: false, error: 'Barcode or QR string cannot be empty.' };

    // Duplicate check
    const existing = barcodeMappings.find((m) => m.code.toLowerCase() === code.toLowerCase());
    if (existing) {
      return {
        success: false,
        error: `Code "${code}" is already mapped to ${existing.medicineName} (${existing.batchNumber || 'Default'}).`,
      };
    }

    const newMapping: BarcodeQRMapping = {
      ...mappingData,
      id: `map-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code,
      mappedAt: new Date().toISOString().substring(0, 19).replace('T', ' '),
    };

    setBarcodeMappings((prev) => [newMapping, ...prev]);
    logAudit(
      'UPDATE',
      'Barcode & QR Mapping',
      `Mapped QR code "${code}" to medicine "${mappingData.medicineName}" (Unit: ${mappingData.unitType || 'STRIP'}).`
    );
    return { success: true, mapping: newMapping };
  };

  const removeBarcodeMapping = (id: string) => {
    setBarcodeMappings((prev) => prev.filter((m) => m.id !== id));
    logAudit('DELETE', 'Barcode & QR Mapping', `Removed barcode mapping ID: ${id}`);
  };

  const assignBarcodeToMedicine = (
    medicineId: string,
    rawBarcode: string,
    unitType: 'STRIP' | 'LOOSE' = 'STRIP',
    notes?: string
  ): { success: boolean; error?: string; medicine?: Medicine } => {
    const code = rawBarcode?.trim();
    if (!code) return { success: false, error: 'Barcode or QR string cannot be empty.' };

    const targetMed = medicines.find((m) => m.id === medicineId);
    if (!targetMed) return { success: false, error: 'Target medicine not found in inventory.' };

    // 1. Update medicine master barcode and primary batch barcode
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id !== medicineId) return m;
        const updatedBatches = m.batches.map((b, idx) =>
          idx === 0 ? { ...b, barcode: code } : b
        );
        return {
          ...m,
          barcode: code,
          batches: updatedBatches,
        };
      })
    );

    // 2. Overwrite or register in barcodeMappings
    setBarcodeMappings((prev) => {
      const filtered = prev.filter((item) => item.code.toLowerCase() !== code.toLowerCase());
      const newMap: BarcodeQRMapping = {
        id: `map-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        code,
        medicineId: targetMed.id,
        medicineName: targetMed.name,
        unitType,
        packSize: targetMed.packSize,
        notes: notes || 'Manufacturer packaging barcode',
        mappedAt: new Date().toISOString().substring(0, 19).replace('T', ' '),
      };
      return [newMap, ...filtered];
    });

    if (pendingScannedBarcode === code) {
      setPendingScannedBarcode(null);
    }

    logAudit(
      'UPDATE',
      'Barcode & QR Mapping',
      `Assigned manufacturer packaging barcode "${code}" to medicine "${targetMed.name}" (${unitType}).`
    );

    return { success: true, medicine: { ...targetMed, barcode: code } };
  };

  const findMedicineByBarcodeOrQR = (rawCode: string) => {
    if (!rawCode) return null;
    const code = rawCode.trim();

    // 1. Check custom barcodeMappings (exact match)
    const customMap = barcodeMappings.find((m) => m.code === code);
    if (customMap) {
      const med = medicines.find((m) => m.id === customMap.medicineId);
      if (med) {
        const batch = customMap.batchNumber
          ? med.batches.find((b) => b.batchNumber === customMap.batchNumber) || med.batches[0]
          : med.batches[0];
        return { medicine: med, batch, unitType: customMap.unitType || 'STRIP' };
      }
    }

    // 2. Check medicine batches for direct barcode match
    for (const med of medicines) {
      for (const b of med.batches) {
        if (b.barcode === code || b.batchNumber.toLowerCase() === code.toLowerCase()) {
          return { medicine: med, batch: b, unitType: 'STRIP' as const };
        }
      }
    }

    // 3. Check medicine master barcode or id
    const medByCode = medicines.find((m) => m.barcode === code || m.id === code);
    if (medByCode) {
      const availableBatches = medByCode.batches
        .filter((b) => b.availableQuantity > 0)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
      const selectedBatch = availableBatches[0] || medByCode.batches[0];
      return { medicine: medByCode, batch: selectedBatch, unitType: 'STRIP' as const };
    }

    // 4. GS1 DataMatrix matching (e.g. 0108901234001018...)
    const gtinMatch = code.match(/01(\d{14})/);
    if (gtinMatch) {
      const gtin = gtinMatch[1];
      for (const med of medicines) {
        for (const b of med.batches) {
          if (b.barcode && gtin.endsWith(b.barcode)) {
            return { medicine: med, batch: b, unitType: 'STRIP' as const };
          }
        }
      }
    }

    return null;
  };

  // ==========================================
  // WIRELESS PHONE SCANNER INTEGRATION
  // ==========================================
  const connectScannerSSE = (sessionId: string, token: string) => {
    if (typeof window === 'undefined') return;

    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    try {
      const es = new EventSource(`/api/scanner/events?sessionId=${sessionId}&token=${token}`);
      sseRef.current = es;

      es.addEventListener('INIT', (e: MessageEvent) => {
        try {
          const initData = JSON.parse(e.data);
          if (initData.connectedDevice) {
            setPhoneScannerStatus('CONNECTED');
            setPhoneScannerSession((prev) =>
              prev ? { ...prev, connectedDevice: initData.connectedDevice, status: 'CONNECTED' } : null
            );
          }
        } catch {}
      });

      es.addEventListener('DEVICE_CONNECTED', (e: MessageEvent) => {
        try {
          const dev = JSON.parse(e.data);
          setPhoneScannerStatus('CONNECTED');
          setPhoneScannerSession((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'CONNECTED',
                  connectedDevice: { name: dev.deviceName, connectedAt: dev.connectedAt },
                }
              : null
          );
          logAudit('UPDATE', 'Phone QR Scanner', `Wireless Phone Scanner paired: ${dev.deviceName}`);
        } catch {}
      });

      es.addEventListener('DEVICE_DISCONNECTED', () => {
        setPhoneScannerStatus('WAITING');
        setPhoneScannerSession((prev) =>
          prev ? { ...prev, status: 'WAITING', connectedDevice: undefined } : null
        );
        logAudit('UPDATE', 'Phone QR Scanner', 'Phone disconnected from scanner session.');
      });

      es.addEventListener('SCAN_RECEIVED', (e: MessageEvent) => {
        try {
          const scan = JSON.parse(e.data);
          handleIncomingScan(scan.value);
        } catch (err) {
          console.error('Failed to parse scan payload:', err);
        }
      });

      es.onerror = () => {
        // EventSource will auto-reconnect
      };
    } catch (err) {
      console.error('SSE connect error:', err);
    }
  };

  const startPhoneScannerSession = async (customHost?: string): Promise<PhoneScannerSessionState | null> => {
    try {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }

      const res = await fetch('/api/scanner/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeWorkflow: activeTab }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start phone scanner session');
      }

      const sessionState: PhoneScannerSessionState = {
        sessionId: data.sessionId,
        pairingToken: data.pairingToken,
        pairingPin: data.pairingPin,
        expiresAt: data.expiresAt,
        status: 'WAITING',
      };

      setPhoneScannerSession(sessionState);
      setPhoneScannerStatus('WAITING');

      connectScannerSSE(data.sessionId, data.pairingToken);
      return sessionState;
    } catch (err: any) {
      console.error('Failed to start scanner session:', err);
      logAudit('UPDATE', 'Phone QR Scanner', `Failed to create session: ${err.message}`);
      return null;
    }
  };

  const disconnectPhoneScanner = async () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    if (phoneScannerSession) {
      try {
        await fetch(`/api/scanner/session?sessionId=${phoneScannerSession.sessionId}`, {
          method: 'DELETE',
        });
      } catch {
        // ignore
      }
    }
    setPhoneScannerSession(null);
    setPhoneScannerStatus('DISCONNECTED');
    logAudit('UPDATE', 'Phone QR Scanner', 'Disconnected wireless phone scanner.');
  };

  // Sync active workflow to server when activeTab changes
  useEffect(() => {
    if (phoneScannerSession?.sessionId) {
      fetch('/api/scanner/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: phoneScannerSession.sessionId,
          activeWorkflow: activeTab,
        }),
      }).catch(() => {});
    }
  }, [activeTab, phoneScannerSession?.sessionId]);

  const handleIncomingScan = (rawCode: string) => {
    if (!rawCode) return;
    const code = rawCode.trim();

    if (activeTab === 'pos') {
      const match = findMedicineByBarcodeOrQR(code);
      if (match) {
        setLastScannedItem({
          value: code,
          timestamp: Date.now(),
          medicineName: match.medicine.name,
          status: 'MATCHED',
          unitType: match.unitType,
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('pharmacy:phone_scan', {
              detail: { code, match },
            })
          );
        }
        logAudit(
          'SALE',
          'Phone QR Scanner',
          `Scanned and matched medicine "${match.medicine.name}" (Code: ${code}) into POS bill.`
        );
      } else {
        setPendingScannedBarcode(code);
        setLastScannedItem({
          value: code,
          timestamp: Date.now(),
          status: 'UNKNOWN',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('pharmacy:phone_scan', {
              detail: { code, match: null },
            })
          );
        }
        logAudit(
          'UPDATE',
          'Phone QR Scanner',
          `Unknown QR / Barcode scanned: "${code}". Prompting user to link to existing medicine.`
        );
      }
    } else if (activeTab === 'medicines') {
      setPendingScannedBarcode(code);
      setLastScannedItem({
        value: code,
        timestamp: Date.now(),
        status: 'MATCHED',
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pharmacy:phone_scan_master', {
            detail: { code },
          })
        );
      }
      logAudit(
        'UPDATE',
        'Medicine Master',
        `Scanned QR code "${code}" transferred to Medicine Master barcode field.`
      );
    } else {
      setLastScannedItem({
        value: code,
        timestamp: Date.now(),
        status: 'IGNORED_WORKFLOW',
      });
      logAudit(
        'UPDATE',
        'Phone QR Scanner',
        `Scanned code "${code}" ignored because active screen is "${activeTab}".`
      );
    }
  };

  const exportDataBackup = (): string => {
    const exportObject = {
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      medicines,
      customers,
      suppliers,
      invoices,
      purchases,
      purchaseReturns,
      expenses,
      payments,
      cashDrawerTransactions,
      dayClosingRecords,
      damagedStock,
      users,
      settings,
      memberships,
      membershipSettings,
      auditLogs,
      barcodeMappings,
    };
    logAudit('BACKUP', 'System Recovery', 'Generated and downloaded full system JSON backup archive');
    return JSON.stringify(exportObject, null, 2);
  };

  return (
    <PharmacyContext.Provider
      value={{
        medicines,
        customers,
        suppliers,
        invoices,
        heldBills,
        salesReturns,
        purchases,
        purchaseReturns,
        expenses,
        payments,
        cashDrawerTransactions,
        dayClosingRecords,
        damagedStock,
        currentUser,
        users,
        settings,
        memberships,
        membershipSettings,
        auditLogs,
        notifications,
        activeTab,
        sidebarCollapsed,
        darkMode,
        soundEnabled,
        isOnline,
        offlineQueueCount: offlineQueue.length,
        setActiveTab,
        toggleSidebar,
        toggleDarkMode,
        toggleSound,
        toggleNetworkSimulation,
        syncOfflineQueue,
        setCurrentUser,
        updateUser,
        addUser,
        updateSettings,
        createMembership,
        renewMembership,
        extendMembership,
        updateMembershipStatus,
        updateMembership,
        updateMembershipSettings,
        getMemberByPhone,
        getMemberById,
        toggleMedicineMembershipDiscount,
        setMedicineMembershipDiscountBulk,
        pendingMemberships,
        pendingMembershipCartItem,
        setPendingMembershipCartItem,
        createPendingMembership,
        cancelPendingMembership,
        addMembershipToCartAndNavigate,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        toggleFavoriteMedicine,
        addBatchToMedicine,
        updateBatch,
        adjustStock,
        transferBatchLocation,
        applyNearExpiryDiscount,
        recordDamagedStock,
        createSalesInvoice,
        holdBill,
        resumeHeldBill,
        deleteHeldBill,
        processSalesReturn,
        createPurchase,
        processPurchaseReturn,
        addCustomer,
        updateCustomer,
        addSupplier,
        updateSupplier,
        addExpense,
        deleteExpense,
        recordPayment,
        recordCashDrawerTransaction,
        getCashDrawerSummary,
        reconcileCashDrawerReturns,
        updateSalesReturnRefundStatus,
        recordDayClosing,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        logAudit,
        getAIReorderRecommendations,
        getAINearExpiryStrategies,
        // Barcode & QR Mapping
        barcodeMappings,
        addBarcodeMapping,
        removeBarcodeMapping,
        assignBarcodeToMedicine,
        findMedicineByBarcodeOrQR,

        // Phone QR Scanner
        phoneScannerSession,
        phoneScannerStatus,
        lastScannedItem,
        pendingScannedBarcode,
        setPendingScannedBarcode,
        startPhoneScannerSession,
        disconnectPhoneScanner,
        isPhoneScannerModalOpen,
        setIsPhoneScannerModalOpen,

        resetToDemoData,
        importDataBackup,
        exportDataBackup,
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
}

export function usePharmacy() {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacy must be used within a PharmacyProvider');
  }
  return context;
}
