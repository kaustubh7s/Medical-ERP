export type ScheduleType = 'NORMAL' | 'SCHEDULE_H' | 'SCHEDULE_H1' | 'SCHEDULE_X' | 'NARCOTIC' | 'OTC';

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'SPLIT' | 'POS_TERMINAL';

export type UserRole = 'OWNER' | 'MANAGER' | 'PHARMACIST' | 'CASHIER' | 'STAFF';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  permissions: {
    canDiscount: boolean;
    canViewProfit: boolean;
    canEditInventory: boolean;
    canManageUsers: boolean;
    canDeleteInvoices: boolean;
    canManagePurchases: boolean;
  };
}

export interface Batch {
  id: string;
  medicineId: string;
  batchNumber: string;
  mfgDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  availableQuantity: number;
  purchaseRate: number; // Cost Price
  mrp: number; // Maximum Retail Price
  saleRate: number; // Selling Price
  rackLocation: string; // e.g. "Rack A-3, Shelf 2"
  barcode: string;
  supplierId?: string;
  status: 'ACTIVE' | 'NEAR_EXPIRY' | 'EXPIRED' | 'OUT_OF_STOCK';
}

export interface Medicine {
  id: string;
  name: string; // Brand Name e.g. "Dolo 650"
  genericName: string; // e.g. "Paracetamol 650mg"
  manufacturer: string; // e.g. "Micro Labs Ltd"
  category: string; // e.g. "Antipyretic / Analgesic"
  dosageForm: 'TABLET' | 'CAPSULE' | 'SYRUP' | 'INJECTION' | 'OINTMENT' | 'DROPS' | 'INHALER' | 'POWDER';
  strength: string; // e.g. "650mg"
  packSize: string; // e.g. "15 Tablets / Strip"
  unitsPerPack?: number; // e.g. 10 or 15 (units per strip/pack)
  hsnCode: string; // e.g. "30049099"
  gstRate: number; // 0, 5, 12, 18, 28
  scheduleType: ScheduleType;
  reorderLevel: number;
  maxStockLevel: number;
  requiresPrescription: boolean;
  batches: Batch[];
  totalStock: number;
  barcode?: string;
  isFavorite?: boolean;
  isMembershipDiscountEligible?: boolean; // default true; if false, this medicine is excluded from membership loyalty discounts
  sideEffects?: string;
  uses?: string;
  temperatureStorage?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  creditLimit: number;
  currentDue: number;
  loyaltyPoints: number;
  doctorName?: string;
  createdDate: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  drugLicenseNumber: string;
  paymentTerms: string;
  currentBalance: number;
  bankDetails?: {
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
}

export interface InvoiceItem {
  id: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  hsnCode: string;
  quantity: number;
  freeQuantity?: number;
  unit: string;
  unitType?: 'STRIP' | 'LOOSE'; // Billing mode: full strip vs cut/loose units
  unitsPerPack?: number; // Conversion factor (e.g. 10 tabs per strip)
  rate: number;
  mrp: number;
  discountPercent: number;
  discountAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  costRate: number;
  isMemberDiscountEligible?: boolean; // Can be toggled on invoice line item
  itemCategory?: 'MEDICINE' | 'MEMBERSHIP' | 'SERVICE';
  membershipDetails?: {
    registrationId: string;
    memberId: string;
    planName: string;
    durationMonths: number;
    durationLabel: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerAddress?: string;
    startDate: string;
    expiryDate: string;
    fee: number;
    paymentMode?: PaymentMode;
    isRenewal?: boolean;
    renewingMembershipId?: string;
    notes?: string;
  };
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: 'RETAIL' | 'WHOLESALE';
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerGst?: string;
  doctorName?: string;
  items: InvoiceItem[];
  subTotal: number;
  totalDiscount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  grandTotal: number;
  paymentMode: PaymentMode;
  splitDetails?: { cash: number; upi: number; card?: number };
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'DUE';
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  cashierName: string;
  isReturned?: boolean;
  returnAmount?: number;
  isOfflineQueued?: boolean;
  membershipId?: string;
  membershipDiscountPercent?: number;
  membershipDiscountAmount?: number;
  membershipTier?: '10%' | '20%' | 'NONE';
  eligiblePurchaseAmount?: number;
  // Membership sale & activation tracking
  saleCategory?: 'ALL' | 'MEDICINE' | 'MEMBERSHIP' | 'COMBINED';
  membershipRegistrationId?: string;
  membershipMemberId?: string;
  membershipPlanName?: string;
  membershipDurationLabel?: string;
  membershipFeeAmount?: number;
  membershipStartDate?: string;
  membershipExpiryDate?: string;
  membershipActivationStatus?: 'NOT_APPLICABLE' | 'PENDING' | 'ACTIVATED' | 'CANCELLED';
  // External POS Terminal Integration fields
  terminalDeviceId?: string;
  terminalTransactionId?: string;
  terminalRequestId?: string;
  terminalAuthCode?: string;
  terminalRrn?: string;
  terminalPaymentMethod?: string;
  terminalCardLast4?: string;
  terminalCardNetwork?: string;
  terminalUpiVpa?: string;
  terminalStatus?: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PENDING';
  isDemoTerminal?: boolean;
}

export interface HeldBills {
  id: string;
  holdTime: string;
  customerName: string;
  customerPhone: string;
  doctorName: string;
  items: InvoiceItem[];
  totalAmount: number;
  note?: string;
}

export interface SalesReturnItem {
  invoiceItemId: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  returnQuantity: number;
  refundRate: number;
  gstRate: number;
  refundAmount: number;
  reason: 'EXPIRED' | 'DAMAGED' | 'WRONG_MEDICINE' | 'PATIENT_RECOVERED' | 'BROKEN_OR_LEAKED' | 'OTHER';
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  returnDate: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId: string;
  customerName: string;
  items: SalesReturnItem[];
  totalRefundAmount: number;
  refundMode: 'CASH' | 'CREDIT_NOTE' | 'BANK_TRANSFER' | 'UPI' | 'CARD';
  creditNoteNumber?: string;
  notes?: string;
  processedBy: string;
  cashDrawerTransactionId?: string;
  isCashRefundPaid?: boolean;
}

export type CashTransactionType =
  | 'CASH_SALE'
  | 'CUSTOMER_COLLECTION'
  | 'SALES_RETURN_REFUND'
  | 'EXPENSE_PAYMENT'
  | 'SUPPLIER_PAYMENT'
  | 'OPENING_FLOAT'
  | 'CASH_DEPOSIT'
  | 'CASH_WITHDRAWAL';

export interface CashDrawerTransaction {
  id: string;
  transactionNumber: string;
  date: string;
  type: CashTransactionType;
  direction: 'IN' | 'OUT';
  amount: number;
  paymentMethod: PaymentMode;
  referenceId?: string;
  referenceNumber?: string;
  returnId?: string;
  originalInvoiceNumber?: string;
  partyId?: string;
  partyName?: string;
  reason?: string;
  cashierName: string;
  notes?: string;
  isReconciled?: boolean;
}

export interface PurchaseItem {
  id: string;
  medicineId: string;
  medicineName: string;
  hsnCode: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  quantity: number;
  freeQuantity: number;
  purchaseRate: number;
  mrp: number;
  saleRate: number;
  discountPercent: number;
  gstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  rackLocation: string;
}

export interface PurchaseEntry {
  id: string;
  grnNumber: string;
  billNumber: string;
  billDate: string;
  supplierId: string;
  supplierName: string;
  supplierGst: string;
  items: PurchaseItem[];
  subTotal: number;
  totalDiscount: number;
  totalCgst: number;
  totalSgst: number;
  totalGst: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  amountPaid: number;
  balanceDue: number;
  dueDate: string;
  notes?: string;
}

export interface PurchaseReturnItem {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  returnQuantity: number;
  purchaseRate: number;
  gstRate: number;
  totalAmount: number;
  reason: 'EXPIRED_STOCK' | 'DAMAGED_SUPPLY' | 'WRONG_DELIVERY' | 'EXCESS_STOCK' | 'NEAR_EXPIRY_CLAIM';
}

export interface PurchaseReturn {
  id: string;
  debitNoteNumber: string;
  returnDate: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseReturnItem[];
  totalDebitAmount: number;
  status: 'PENDING_APPROVAL' | 'ACCEPTED_BY_SUPPLIER' | 'ADJUSTED_IN_BILL';
  notes?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: 'RENT' | 'ELECTRICITY' | 'SALARIES' | 'INTERNET' | 'PACKAGING' | 'MAINTENANCE' | 'MARKETING' | 'MISCELLANEOUS';
  title: string;
  amount: number;
  paymentMode: PaymentMode;
  paidTo: string;
  notes?: string;
  receiptNumber?: string;
}

export interface PaymentTransaction {
  id: string;
  date: string;
  type: 'CUSTOMER_COLLECTION' | 'SUPPLIER_PAYMENT' | 'SALES_RETURN_REFUND';
  partyId: string;
  partyName: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
}

export interface DayClosingRecord {
  id: string;
  date: string;
  closedAt: string;
  closedBy: string;
  openingCash?: number;
  totalSalesCash: number;
  totalSalesUPI: number;
  totalSalesCard: number;
  totalSalesCredit: number;
  totalGrossSales: number;
  totalCustomerDuesCollected: number;
  totalCashRefunds?: number;
  totalExpensesPaid: number;
  totalSupplierPayouts: number;
  expectedCashInDrawer: number;
  actualCashInDrawer: number;
  discrepancyAmount: number;
  notes?: string;
}

export interface DamagedStockEntry {
  id: string;
  date: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  costRate: number;
  totalLoss: number;
  reason: 'BROKEN_VIAL' | 'LEAKAGE' | 'CONTAMINATED' | 'STRIP_TORN' | 'OTHER';
  disposedBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'SALE' | 'RETURN' | 'STOCK_ADJUST' | 'PRICE_CHANGE' | 'BACKUP';
  module: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  type: 'LOW_STOCK' | 'NEAR_EXPIRY' | 'EXPIRED' | 'CUSTOMER_DUE' | 'SUPPLIER_DUE' | 'SYSTEM';
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  link?: string;
  read: boolean;
}

export interface PharmacySettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  drugLicenseNumber: string;
  drugLicense21B?: string;
  gstNumber: string;
  fssaiNumber?: string;
  jurisdiction: string;
  invoiceFooterMessage: string;
  defaultDiscountPercent: number;
  enableSoundAlerts: boolean;
  thermalPrintAutoOpen: boolean;
  currencySymbol: string;
  // POS Terminal Configuration
  posTerminalBaseUrl?: string;
  posTerminalDeviceId?: string;
  posTerminalMerchantName?: string;
  posTerminalToken?: string;
  posTerminalIsPaired?: boolean;
  posTerminalLastPingAt?: string;
  cashDrawerOpeningBalance?: number;
}

export interface AIReorderRecommendation {
  medicineId: string;
  medicineName: string;
  genericName: string;
  currentStock: number;
  salesVelocityPerDay: number;
  daysRemaining: number;
  recommendedOrderQty: number;
  estimatedCost: number;
  preferredSupplier: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export interface AINearExpiryStrategy {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  daysToExpiry: number;
  stockQty: number;
  currentMrp: number;
  suggestedDiscountPercent: number;
  action: 'CLEARANCE_PROMOTION' | 'RETURN_TO_SUPPLIER' | 'BUNDLE_OFFER';
  rationale: string;
}

export type MembershipStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';

export type MembershipHistoryAction =
  | 'CREATED'
  | 'RENEWED'
  | 'EXTENDED'
  | 'SUSPENDED'
  | 'REACTIVATED'
  | 'CANCELLED'
  | 'TIER_CHANGED'
  | 'PURCHASE_APPLIED';

export interface MembershipHistoryItem {
  id: string;
  date: string;
  action: MembershipHistoryAction;
  previousExpiryDate?: string;
  newExpiryDate?: string;
  previousStatus?: MembershipStatus;
  newStatus?: MembershipStatus;
  performedBy: string;
  notes?: string;
  invoiceNumber?: string;
  discountAmount?: number;
}

export interface PendingMembershipRegistration {
  id: string; // e.g. "reg-mem-${timestamp}-${rand}"
  memberId: string; // e.g. "MEM-2026-0008"
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  planName: string; // "Monthly Plan", "Quarterly Plan", "Half-Yearly Plan", "Annual Plan", "Custom Plan"
  durationMonths: number;
  durationLabel: string;
  fee: number;
  paymentMode: PaymentMode;
  startDate: string;
  expiryDate: string;
  notes?: string;
  status: 'PENDING' | 'ACTIVATED' | 'CANCELLED';
  invoiceId?: string;
  invoiceNumber?: string;
  paymentTransactionId?: string;
  paymentMethod?: string;
  createdAt: string;
  activatedAt?: string;
  isRenewal?: boolean;
  renewingMembershipId?: string;
}

export interface Membership {
  id: string;
  membershipId: string; // e.g. "MEM-2026-0001"
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  startDate: string; // YYYY-MM-DD
  durationMonths: number; // 1, 3, 6, 12 or custom
  durationLabel: string; // e.g. "12 Months"
  expiryDate: string; // YYYY-MM-DD
  status: MembershipStatus;
  feePaid?: number; // Paid membership fee collected (e.g. 149)
  paymentMode?: PaymentMode; // Payment mode used for membership fee (e.g. UPI, CASH, CARD)
  notes?: string;
  createdDate: string;
  createdBy: string;
  invoiceId?: string;
  invoiceNumber?: string;
  registrationId?: string;
  paymentTransactionId?: string;
  paymentMethod?: string;
  renewedFromMembershipId?: string;
  history: MembershipHistoryItem[];
}

export interface MembershipDurationOption {
  months: number;
  label: string;
  price?: number; // e.g. 149 for 12 months, 99 for 6 months, 59 for 3 months, 29 for 1 month
}

export interface MembershipSettings {
  idPrefix: string;
  nextNumber: number;
  defaultDurationMonths: number;
  availableDurations: MembershipDurationOption[];
  qualificationPeriodMonths: number; // default 3 (rolling 3 months)
  purchaseThreshold: number; // default 3000
  lowerTierDiscountPercent: number; // default 10 (below 3000)
  higherTierDiscountPercent: number; // default 20 (3000 or above)
  allowDiscountStacking: boolean; // default false
  excludedCategories: string[];
  excludedScheduleTypes: ScheduleType[];
  excludedMedicineIds?: string[]; // Specific medicine IDs deselected for discount
  expiryAlertDaysWarning: number; // default 30
  expiryAlertDaysUrgent: number; // default 7
  autoDeactivateOnExpiry: boolean; // default true
  lastUpdated: string;
  updatedBy: string;
  auditLog: Array<{
    date: string;
    updatedBy: string;
    changes: string;
  }>;
}

// POS Terminal Integration Models
export type TerminalPaymentState =
  | 'IDLE'
  | 'REQUESTED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT'
  | 'RECONCILIATION_REQUIRED';

export interface TerminalPaymentAttempt {
  id: string; // Internal attempt ID
  invoiceNumber: string;
  requestId: string;
  transactionId?: string;
  deviceId: string;
  amount: number;
  currency: string;
  state: TerminalPaymentState;
  paymentMethod?: string;
  authCode?: string;
  rrn?: string;
  cardLast4?: string;
  cardNetwork?: string;
  cardEntryMode?: string;
  upiVpa?: string;
  failureReason?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  finalized: boolean;
}

export interface PosTerminalHealthResponse {
  status: 'HEALTHY' | 'UNHEALTHY' | 'DISCONNECTED';
  simulator?: string;
  deviceId: string;
  merchantName: string;
  environment: string;
  terminalStatus: 'READY' | 'BUSY' | 'UNAVAILABLE' | 'OFFLINE';
  isPaired: boolean;
  pairedClientId?: string;
  firmwareVersion?: string;
  timestamp?: string;
}

export interface TerminalPaymentRequestPayload {
  requestId: string;
  amount: number;
  currency: string;
  invoiceReference: string;
  paymentMethod?: 'CUSTOMER_CHOICE' | 'CARD_ONLY' | 'UPI_ONLY';
}

export interface TerminalPaymentResponse {
  success: boolean;
  message?: string;
  error?: string;
  transactionId?: string;
  requestId?: string;
  invoiceReference?: string;
  amount?: number;
  currency?: string;
  status: 'PAYMENT_REQUESTED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  authCode?: string;
  rrn?: string;
  cardLast4?: string;
  cardNetwork?: string;
  cardEntryMode?: string;
  upiVpa?: string;
  failureReason?: string;
  isDemo?: boolean;
  receipt?: Record<string, unknown>;
  createdAt?: string;
  completedAt?: string;
}


export interface BarcodeQRMapping {
  id: string;
  code: string; // The exact decoded QR/barcode string
  medicineId: string;
  medicineName: string;
  batchNumber?: string;
  unitType?: 'STRIP' | 'LOOSE';
  packSize?: string;
  mappedAt: string;
  notes?: string;
}


