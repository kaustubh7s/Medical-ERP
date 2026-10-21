'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePharmacy } from '@/lib/store';
import {
  Medicine,
  Batch,
  InvoiceItem,
  Customer,
  HeldBills,
  PaymentMode,
  PosTerminalHealthResponse,
  TerminalPaymentAttempt,
  TerminalPaymentState,
} from '@/types/pharmacy';
import { PrintInvoiceModal } from '@/components/common/PrintInvoiceModal';
import { Modal } from '@/components/common/Modal';
import { parseUnitsPerPack, getPerUnitRate, formatStockDisplay } from '@/lib/units';
import { useHandheldScanner } from '@/lib/useHandheldScanner';
import { playScanSound } from '@/lib/scannerAudio';
import { HandheldScannerWidget, ScanFeedback } from '@/components/common/HandheldScannerWidget';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  Stethoscope,
  QrCode,
  CreditCard,
  Banknote,
  Percent,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Star,
  Clock,
  Printer,
  ChevronDown,
  X,
  RotateCcw,
  BookOpen,
  IndianRupee,
  CheckSquare,
  Square,
  Pill,
  Sparkles,
  Package,
  ShieldAlert,
  MapPin,
  Calendar,
  Layers,
  Eye,
  CornerDownLeft,
  ArrowUpDown,
  Tag,
  Info,
  Crown,
  PlusCircle,
  SmartphoneNfc,
  Smartphone,
  Barcode,
  Terminal,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  AlertTriangle,
  Globe,
  Settings as SettingsIcon,
  Link2,
} from 'lucide-react';
import {
  getMembershipExpiryInfo,
  calculateCustomerPurchases,
  getDiscountTierInfo,
  calculateExpiryDate,
  formatINR,
} from '@/lib/membershipUtils';
import { CompactMembershipRegistrationForm } from '@/components/modules/membership/CompactMembershipRegistrationForm';


interface RepeatOrderItem {
  medicineId: string;
  medicineName: string;
  genericName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  hsnCode: string;
  quantity: number;
  unitType?: 'STRIP' | 'LOOSE';
  unitsPerPack?: number;
  rate: number;
  mrp: number;
  gstRate: number;
  costRate: number;
  availableStock: number;
  isSelected: boolean;
}

export const POSBillingView: React.FC = () => {
  const {
    medicines,
    customers,
    invoices,
    salesReturns,
    memberships,
    membershipSettings,
    currentUser,
    settings,
    heldBills,
    holdBill,
    resumeHeldBill,
    deleteHeldBill,
    createSalesInvoice,
    addCustomer,
    getMemberByPhone,
    createMembership,
    pendingMembershipCartItem,
    setPendingMembershipCartItem,
    cancelPendingMembership,
    setActiveTab,
    updateSettings,
    resetMemberships,
    findMedicineByBarcodeOrQR,
    assignBarcodeToMedicine,
    barcodeMappings,
    soundEnabled,
    toggleSound,
  } = usePharmacy();

  // Search & Input state
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchHighlightedIndex, setBatchHighlightedIndex] = useState<number>(0);
  const [editingCartItemIndex, setEditingCartItemIndex] = useState<number | null>(null);
  const [selectedSaltFilterMed, setSelectedSaltFilterMed] = useState<Medicine | null>(null);

  // Cart & Line Items
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);

  // Customer & Prescriber
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [walkinName, setWalkinName] = useState('Walk-in Cash Customer');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [doctorName, setDoctorName] = useState('Self');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerHighlightedIndex, setCustomerHighlightedIndex] = useState<number>(0);
  const [customerFilter, setCustomerFilter] = useState<'ALL' | 'DUE_ONLY'>('ALL');
  const [showQuickAddForm, setShowQuickAddForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustDoctor, setNewCustDoctor] = useState('Self / Direct');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState(5000);

  // Ingest pending membership line item when added from Membership module
  useEffect(() => {
    if (pendingMembershipCartItem) {
      setCart((prevCart) => {
        const withoutOldMembership = prevCart.filter(
          (item) => item.itemCategory !== 'MEMBERSHIP'
        );
        return [...withoutOldMembership, pendingMembershipCartItem];
      });

      if (pendingMembershipCartItem.membershipDetails?.customerPhone) {
        const cleanPhone = pendingMembershipCartItem.membershipDetails.customerPhone;
        const matchingCust = customers.find(
          (c) => c.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '')
        );
        if (matchingCust) {
          setSelectedCustomer(matchingCust);
        } else {
          setWalkinName(pendingMembershipCartItem.membershipDetails.customerName);
          setWalkinPhone(cleanPhone);
        }
      }

      setPendingMembershipCartItem(null);
    }
  }, [pendingMembershipCartItem, customers, setPendingMembershipCartItem]);


  // Quick In-POS Member Enrollment Modal State
  const [isQuickEnrollOpen, setIsQuickEnrollOpen] = useState(false);
  const [quickEnrollDuration, setQuickEnrollDuration] = useState<number>(12);
  const [quickEnrollFee, setQuickEnrollFee] = useState<number>(149);
  const [quickEnrollPayMode, setQuickEnrollPayMode] = useState<PaymentMode>('UPI');
  const [quickEnrollName, setQuickEnrollName] = useState('');
  const [quickEnrollPhone, setQuickEnrollPhone] = useState('');
  const [quickEnrollSuccessMsg, setQuickEnrollSuccessMsg] = useState('');

  // Repeat Customer Order Modal State
  const [repeatOrderModalOpen, setRepeatOrderModalOpen] = useState(false);
  const [repeatHighlightedIndex, setRepeatHighlightedIndex] = useState<number>(0);
  const [repeatItems, setRepeatItems] = useState<RepeatOrderItem[]>([]);
  const [repeatSearchTerm, setRepeatSearchTerm] = useState('');

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'SPLIT' | 'POS_TERMINAL'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [creditDownPayment, setCreditDownPayment] = useState<string>('0'); // Patient pays partial cash, rest on credit
  const [splitCashAmount, setSplitCashAmount] = useState<string>(''); // For SPLIT mode cash portion
  const [splitCashTendered, setSplitCashTendered] = useState<string>(''); // Cash note given for split portion

  // POS Terminal Integration State
  const [terminalHealth, setTerminalHealth] = useState<PosTerminalHealthResponse | null>(null);
  const [isCheckingTerminalHealth, setIsCheckingTerminalHealth] = useState(false);
  const [terminalPaymentState, setTerminalPaymentState] = useState<TerminalPaymentState>('IDLE');
  const [activePaymentAttempt, setActivePaymentAttempt] = useState<TerminalPaymentAttempt | null>(null);
  const [terminalErrorMsg, setTerminalErrorMsg] = useState<string | null>(null);
  const [isTerminalActionLoading, setIsTerminalActionLoading] = useState(false);
  const [terminalRecentAttempts, setTerminalRecentAttempts] = useState<TerminalPaymentAttempt[]>([]);
  const terminalPollRef = useRef<NodeJS.Timeout | null>(null);
  const terminalEventSourceRef = useRef<EventSource | null>(null);
  const isFinalizingInvoiceRef = useRef<boolean>(false);

  // Quick Terminal Switcher & Pairing Modal State
  const [isQuickTerminalConfigOpen, setIsQuickTerminalConfigOpen] = useState(false);
  const [quickTerminalUrl, setQuickTerminalUrl] = useState(settings.posTerminalBaseUrl || 'http://localhost:3001');
  const [quickPairingCode, setQuickPairingCode] = useState('');
  const [quickConfigMsg, setQuickConfigMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [terminalElapsedSeconds, setTerminalElapsedSeconds] = useState(0);

  // Held Bills Modal
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [heldHighlightedIndex, setHeldHighlightedIndex] = useState<number>(0);

  // Completed Invoice & Print Modal
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Hardware Handheld Barcode Scanner Feedback State
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const scanFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Quick Barcode Mapping Modal State (for unmapped packaging barcodes)
  const [isBarcodeLinkModalOpen, setIsBarcodeLinkModalOpen] = useState(false);
  const [unmappedBarcodeToLink, setUnmappedBarcodeToLink] = useState('');
  const [selectedMedIdForLink, setSelectedMedIdForLink] = useState('');
  const [selectedUnitTypeForLink, setSelectedUnitTypeForLink] = useState<'STRIP' | 'LOOSE'>('STRIP');
  const [linkSuccessMsg, setLinkSuccessMsg] = useState('');
  const lastProcessedBarcodeRef = useRef<string>('');
  const lastProcessedTimeRef = useRef<number>(0);
  const lastProcessedItemKeyRef = useRef<string>('');
  const lastProcessedItemTimeRef = useRef<number>(0);
  const fastScanTimerRef = useRef<NodeJS.Timeout | null>(null);


  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLTableRowElement>(null);
  const batchActiveRowRef = useRef<HTMLTableRowElement>(null);
  const heldActiveRowRef = useRef<HTMLTableRowElement>(null);
  const customerActiveRowRef = useRef<HTMLTableRowElement>(null);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);
  const repeatActiveRowRef = useRef<HTMLTableRowElement>(null);

  // Fast OTC shortcuts
  const fastOTCList = medicines.filter((m) => m.isFavorite || ['Dolo 650', 'Pan-D Capsule', 'Augmentin 625 Duo', 'Betadine 10% Ointment', 'Asthalin Inhaler'].includes(m.name)).slice(0, 6);

  // Filtered Customers
  const filteredCustomers = customers.filter((c) => {
    if (customerFilter === 'DUE_ONLY' && c.currentDue <= 0) return false;
    const term = repeatSearchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.doctorName && c.doctorName.toLowerCase().includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term))
    );
  });

  const totalPatientsWithDue = customers.filter((c) => c.currentDue > 0).length;
  const totalKhataDueAmount = customers.reduce((sum, c) => sum + c.currentDue, 0);

  // Helper to extract normalized active chemical salt keys for generic substitute matching
  const extractCleanSaltKey = useCallback((genericName: string): string => {
    if (!genericName) return '';
    return genericName
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\b(tablets?|capsules?|syrup|suspension|injection|cream|ointment|gel|inhaler|ip|bp|usp|sr|er|pr|cr)\b/gi, '')
      .replace(/[0-9]+(\.[0-9]+)?\s*(mg|mcg|ml|iu|g|%|units|w\/v)\b/gi, '')
      .replace(/[^a-z0-9\+]/gi, ' ')
      .split('+')
      .map((s) => s.trim().replace(/\s+/g, ' '))
      .filter((s) => s.length > 2)
      .sort()
      .join(' + ');
  }, []);

  const areSaltsMatching = useCallback((generic1: string, generic2: string): boolean => {
    if (!generic1 || !generic2) return false;
    const key1 = extractCleanSaltKey(generic1);
    const key2 = extractCleanSaltKey(generic2);
    if (key1 && key2 && key1 === key2) return true;

    const parts1 = key1.split(' + ');
    const parts2 = key2.split(' + ');
    if (parts1.length > 0 && parts2.length > 0) {
      if (parts1.every((p) => parts2.includes(p)) || parts2.every((p) => parts1.includes(p))) {
        return true;
      }
    }
    return false;
  }, [extractCleanSaltKey]);

  // Instant search filter & 1-Click Generic Salt Substitute Swap
  const filteredMedicines = useMemo(() => {
    if (selectedSaltFilterMed) {
      // Find matching generic salts, excluding the original medicine
      const substitutes = medicines.filter(
        (m) =>
          m.id !== selectedSaltFilterMed.id &&
          areSaltsMatching(m.genericName, selectedSaltFilterMed.genericName)
      );
      // Sort in-stock items first
      return substitutes.sort((a, b) => (b.totalStock > 0 ? 1 : 0) - (a.totalStock > 0 ? 1 : 0));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      return medicines.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.genericName.toLowerCase().includes(term) ||
          (m.barcode && m.barcode.includes(searchTerm))
      );
    }

    return isDropdownOpen ? medicines.slice(0, 15) : [];
  }, [medicines, searchTerm, isDropdownOpen, selectedSaltFilterMed, areSaltsMatching]);

  // Currently previewed medicine in search dropdown
  const currentPreviewMed: Medicine | null =
    filteredMedicines.length > 0
      ? filteredMedicines[Math.min(highlightedIndex, filteredMedicines.length - 1)] || filteredMedicines[0]
      : null;

  // Substitute medicines with same salt or category
  const saltSubstitutes = currentPreviewMed
    ? medicines
        .filter(
          (m) =>
            m.id !== currentPreviewMed.id &&
            (areSaltsMatching(m.genericName, currentPreviewMed.genericName) ||
              m.category.toLowerCase() === currentPreviewMed.category.toLowerCase())
        )
        .slice(0, 3)
    : [];

  // Reset highlighted index on search term or salt filter change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm, selectedSaltFilterMed]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto scroll active item in search dropdown
  useEffect(() => {
    if (isDropdownOpen && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isDropdownOpen]);

  // Auto scroll active batch in batch modal
  useEffect(() => {
    if (isBatchModalOpen && batchActiveRowRef.current) {
      batchActiveRowRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [batchHighlightedIndex, isBatchModalOpen]);

  // Auto scroll active held bill in held modal
  useEffect(() => {
    if (isHeldModalOpen && heldActiveRowRef.current) {
      heldActiveRowRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [heldHighlightedIndex, isHeldModalOpen]);

  // Keyboard navigation inside FEFO Batch Modal
  useEffect(() => {
    if (!isBatchModalOpen || !selectedMed) return;

    const modalOpenTime = Date.now();

    const handleBatchKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setBatchHighlightedIndex((prev) => (prev < selectedMed.batches.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setBatchHighlightedIndex((prev) => (prev > 0 ? prev - 1 : selectedMed.batches.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.repeat) return;
        const chosenBatch =
          selectedMed.batches[batchHighlightedIndex] ||
          selectedMed.batches.find((b) => b.availableQuantity > 0) ||
          selectedMed.batches[0];
        if (chosenBatch && chosenBatch.availableQuantity > 0) {
          handleBatchSelect(selectedMed, chosenBatch);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsBatchModalOpen(false);
        setEditingCartItemIndex(null);
        searchInputRef.current?.focus();
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (selectedMed.batches[idx] && selectedMed.batches[idx].availableQuantity > 0) {
          e.preventDefault();
          handleBatchSelect(selectedMed, selectedMed.batches[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleBatchKeyDown);
    return () => window.removeEventListener('keydown', handleBatchKeyDown);
  }, [isBatchModalOpen, selectedMed, batchHighlightedIndex]);

  // Keyboard navigation inside Held / Parked Bills Modal (F6)
  useEffect(() => {
    if (!isHeldModalOpen) return;

    const handleHeldKeyDown = (e: KeyboardEvent) => {
      if (heldBills.length === 0) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsHeldModalOpen(false);
          searchInputRef.current?.focus();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHeldHighlightedIndex((prev) => (prev < heldBills.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHeldHighlightedIndex((prev) => (prev > 0 ? prev - 1 : heldBills.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = heldBills[heldHighlightedIndex] || heldBills[0];
        if (target) handleResumeBill(target);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const target = heldBills[heldHighlightedIndex];
        if (target) {
          deleteHeldBill(target.id);
          setHeldHighlightedIndex(0);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsHeldModalOpen(false);
        searchInputRef.current?.focus();
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (heldBills[idx]) {
          e.preventDefault();
          handleResumeBill(heldBills[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleHeldKeyDown);
    return () => window.removeEventListener('keydown', handleHeldKeyDown);
  }, [isHeldModalOpen, heldBills, heldHighlightedIndex]);

  // Keyboard navigation inside Patient Directory & Repeat Order Modal
  useEffect(() => {
    setCustomerHighlightedIndex(0);
  }, [repeatSearchTerm, isCustomerModalOpen]);

  useEffect(() => {
    if (customerActiveRowRef.current) {
      customerActiveRowRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [customerHighlightedIndex]);

  useEffect(() => {
    if (!isCustomerModalOpen) return;

    const handleCustomerKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in quick-add registration input
      const isQuickAddInput =
        document.activeElement?.getAttribute('data-quick-add') === 'true';

      if (isQuickAddInput && e.key !== 'Escape') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCustomerHighlightedIndex((prev) =>
          filteredCustomers.length > 0 ? (prev < filteredCustomers.length - 1 ? prev + 1 : 0) : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCustomerHighlightedIndex((prev) =>
          filteredCustomers.length > 0 ? (prev > 0 ? prev - 1 : filteredCustomers.length - 1) : 0
        );
      } else if (e.key === 'Enter') {
        if (isQuickAddInput) return;
        e.preventDefault();
        const target = filteredCustomers[customerHighlightedIndex] || filteredCustomers[0];
        if (target) {
          setSelectedCustomer(target);
          setWalkinName(target.name);
          setWalkinPhone(target.phone);
          setIsCustomerModalOpen(false);
          searchInputRef.current?.focus();
        }
      } else if ((e.key === 'r' || e.key === 'R') && document.activeElement !== customerSearchInputRef.current) {
        e.preventDefault();
        const target = filteredCustomers[customerHighlightedIndex] || filteredCustomers[0];
        if (target) {
          openRepeatOrderForCustomer(target);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsCustomerModalOpen(false);
        searchInputRef.current?.focus();
      } else if (/^[1-9]$/.test(e.key) && document.activeElement !== customerSearchInputRef.current) {
        const idx = parseInt(e.key, 10) - 1;
        if (filteredCustomers[idx]) {
          e.preventDefault();
          setSelectedCustomer(filteredCustomers[idx]);
          setWalkinName(filteredCustomers[idx].name);
          setWalkinPhone(filteredCustomers[idx].phone);
          setIsCustomerModalOpen(false);
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleCustomerKeyDown);
    return () => window.removeEventListener('keydown', handleCustomerKeyDown);
  }, [isCustomerModalOpen, filteredCustomers, customerHighlightedIndex]);

  // Keyboard navigation inside Repeat / Last Order Selection Modal
  useEffect(() => {
    if (!repeatOrderModalOpen) return;

    const handleRepeatKeyDown = (e: KeyboardEvent) => {
      if (repeatItems.length === 0) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setRepeatOrderModalOpen(false);
          searchInputRef.current?.focus();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setRepeatHighlightedIndex((prev) =>
          repeatItems.length > 0 ? (prev < repeatItems.length - 1 ? prev + 1 : 0) : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setRepeatHighlightedIndex((prev) =>
          repeatItems.length > 0 ? (prev > 0 ? prev - 1 : repeatItems.length - 1) : 0
        );
      } else if (e.key === ' ') {
        e.preventDefault();
        handleToggleRepeatItem(repeatHighlightedIndex);
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'c' || e.key === 'C')) {
        // Toggle Cut-Strip / Loose Tablet Mode via 'C' key directly without touching mouse!
        e.preventDefault();
        toggleRepeatItemUnitType(repeatHighlightedIndex);
      } else if (e.key === '+' || e.key === '=' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (repeatItems[repeatHighlightedIndex]) {
          handleUpdateRepeatQuantity(repeatHighlightedIndex, repeatItems[repeatHighlightedIndex].quantity + 1);
        }
      } else if (e.key === '-' || e.key === '_' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (repeatItems[repeatHighlightedIndex]) {
          handleUpdateRepeatQuantity(repeatHighlightedIndex, repeatItems[repeatHighlightedIndex].quantity - 1);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleRemoveRepeatItem(repeatHighlightedIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleLoadRepeatOrderToCart();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setRepeatOrderModalOpen(false);
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleRepeatKeyDown);
    return () => window.removeEventListener('keydown', handleRepeatKeyDown);
  }, [repeatOrderModalOpen, repeatItems, repeatHighlightedIndex]);

  // Auto-focus customer search input when customer directory modal opens
  useEffect(() => {
    if (isCustomerModalOpen) {
      const timer = setTimeout(() => {
        customerSearchInputRef.current?.focus();
        customerSearchInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isCustomerModalOpen]);

  // Focus search input on mount & global POS keyboard shortcuts
  useEffect(() => {
    searchInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      const isShift = e.shiftKey;
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      const activeEl = document.activeElement;
      // Other text fields where user might legitimately type capital 'A' or 'C'
      const isOtherTextEntry =
        activeEl &&
        activeEl !== searchInputRef.current &&
        (activeEl.tagName === 'TEXTAREA' ||
          (activeEl.tagName === 'INPUT' &&
            !['button', 'submit', 'checkbox', 'radio', 'number'].includes(
              (activeEl as HTMLInputElement).type?.toLowerCase()
            )));

      // 1. Shift+C = Search for customer (open Patient Directory / Khata Modal)
      // Strictly Shift+C only (never Ctrl+C so native clipboard copy is fully preserved)
      if (isShift && !isCtrlOrCmd && (e.key === 'C' || e.key === 'c') && !isOtherTextEntry) {
        e.preventDefault();
        if (isPaymentModalOpen) return;
        setRepeatSearchTerm('');
        setIsCustomerModalOpen(true);
        return;
      }

      // 2. Shift+M / Shift+A = Search medicine (focus medicine search/scan input and open dropdown)
      // Strictly Shift shortcuts only (never Ctrl+A / Ctrl+M so native select-all is fully preserved)
      if (isShift && !isCtrlOrCmd && (e.key === 'M' || e.key === 'm' || e.key === 'A' || e.key === 'a') && !isOtherTextEntry) {
        e.preventDefault();
        if (isPaymentModalOpen) return;
        setIsCustomerModalOpen(false);
        setIsHeldModalOpen(false);
        setIsBatchModalOpen(false);
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setIsDropdownOpen(true);
        return;
      }

      // Avoid intercepting remaining function keys if user is inside any modal
      if (isBatchModalOpen || isHeldModalOpen || isCustomerModalOpen || isPaymentModalOpen || repeatOrderModalOpen) return;

      if ((isShift && e.key === 'F2') || e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsDropdownOpen(true);
      } else if ((isShift && e.key === 'F4') || e.key === 'F4' || e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) setIsPaymentModalOpen(true);
      } else if ((isShift && e.key === 'F5') || e.key === 'F5') {
        e.preventDefault();
        handleHoldCurrentBill();
      } else if ((isShift && e.key === 'F6') || e.key === 'F6') {
        e.preventDefault();
        setHeldHighlightedIndex(0);
        setIsHeldModalOpen(true);
      } else if ((isShift && e.key === 'F8') || e.key === 'F8') {
        e.preventDefault();
        handleClearCart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, walkinName, walkinPhone, doctorName, isBatchModalOpen, isHeldModalOpen, isCustomerModalOpen, isPaymentModalOpen, repeatOrderModalOpen]);

  // Membership Lookup & Rolling Purchase Calculations for Active Customer
  const currentActivePhone = selectedCustomer ? selectedCustomer.phone : walkinPhone;
  const currentMember = getMemberByPhone(currentActivePhone);
  const currentMemberExpiryInfo = currentMember
    ? getMembershipExpiryInfo(currentMember, membershipSettings)
    : null;
  const isMemberDiscountActive = !!(
    currentMember &&
    currentMemberExpiryInfo &&
    !currentMemberExpiryInfo.isExpired &&
    currentMemberExpiryInfo.computedStatus !== 'SUSPENDED' &&
    currentMemberExpiryInfo.computedStatus !== 'CANCELLED'
  );

  // Preceding 3-month net purchases calculation (prior to current bill)
  const customerPurchaseAgg = calculateCustomerPurchases(
    currentActivePhone,
    invoices,
    salesReturns,
    membershipSettings
  );

  const memberTierInfo = getDiscountTierInfo(
    customerPurchaseAgg.rollingPurchases,
    membershipSettings,
    isMemberDiscountActive
  );

  const effectiveMemberDiscountPercent = isMemberDiscountActive ? memberTierInfo.percent : 0;

  // Financial Calculations
  const grossTotal = cart.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const lineDiscounts = cart.reduce((sum, item) => sum + item.discountAmount, 0);

  // Eligible items for membership discount (not excluded category, not Schedule X / Narcotic, stacking check)
  const eligibleItemsGross = cart.reduce((sum, item) => {
    if (item.isMemberDiscountEligible === false) {
      return sum;
    }
    const med = medicines.find((m) => m.id === item.medicineId);
    if (med) {
      if (med.isMembershipDiscountEligible === false) {
        return sum;
      }
      if (membershipSettings.excludedMedicineIds?.includes(med.id)) {
        return sum;
      }
      if (membershipSettings.excludedCategories?.some((cat) => med.category?.toLowerCase().includes(cat.toLowerCase()))) {
        return sum;
      }
      if (membershipSettings.excludedScheduleTypes?.includes(med.scheduleType)) {
        return sum;
      }
    }
    if (!membershipSettings.allowDiscountStacking && item.discountPercent > 0) {
      return sum;
    }
    return sum + (item.quantity * item.rate - item.discountAmount);
  }, 0);

  const membershipDiscountAmount = isMemberDiscountActive
    ? Math.round(((eligibleItemsGross * effectiveMemberDiscountPercent) / 100) * 100) / 100
    : 0;

  const subTotalAfterLineAndMemberDisc = Math.max(0, grossTotal - lineDiscounts - membershipDiscountAmount);
  const billDiscountAmount = (subTotalAfterLineAndMemberDisc * overallDiscountPercent) / 100;
  const taxableAmount = Math.max(0, subTotalAfterLineAndMemberDisc - billDiscountAmount);

  // GST Tax with discount proportional reduction
  const discountRatio = grossTotal > 0 ? taxableAmount / grossTotal : 1;
  const totalCgst = Math.round(cart.reduce((sum, item) => sum + item.cgstAmount * discountRatio, 0) * 100) / 100;
  const totalSgst = Math.round(cart.reduce((sum, item) => sum + item.sgstAmount * discountRatio, 0) * 100) / 100;
  const totalTax = totalCgst + totalSgst;

  const rawGrandTotal = taxableAmount + totalTax;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - grandTotal);

  // Credit calculation
  const downPay = Math.min(grandTotal, Math.max(0, parseFloat(creditDownPayment) || 0));
  const creditBalanceDue = grandTotal - downPay;
  const existingCustomerDue = selectedCustomer ? selectedCustomer.currentDue : 0;
  const totalAfterThisBillDue = existingCustomerDue + (paymentMode === 'CREDIT' ? creditBalanceDue : 0);

  // Split payment math (Cash + UPI)
  const splitCash = Math.min(grandTotal, Math.max(0, parseFloat(splitCashAmount) || 0));
  const splitUpi = Math.max(0, Math.round((grandTotal - splitCash) * 100) / 100);
  const splitCashTenderedNum = parseFloat(splitCashTendered) || 0;
  const splitChangeDue = Math.max(0, splitCashTenderedNum - splitCash);

  // Mobile POS Speed & Usability helpers
  const totalUnitsInCart = cart.reduce((sum, item) => sum + item.quantity, 0);

  const quickCashOptions = useMemo(() => {
    const rounded = Math.ceil(grandTotal);
    if (rounded <= 0) return [];
    const options = new Set<number>();
    options.add(rounded);
    if (rounded % 50 !== 0 && rounded < 500) options.add(Math.ceil(rounded / 50) * 50);
    if (rounded % 100 !== 0) options.add(Math.ceil(rounded / 100) * 100);
    [100, 200, 500, 1000, 2000].forEach((note) => {
      if (note >= rounded) options.add(note);
    });
    return Array.from(options).sort((a, b) => a - b).slice(0, 4);
  }, [grandTotal]);

  // Add Item to Cart (Default: Full Strip)
  const addItemToCart = (medicine: Medicine, batch: Batch, initialQuantity: number = 1, preferredUnitType: 'STRIP' | 'LOOSE' = 'STRIP') => {
    if (batch.availableQuantity <= 0) {
      alert(`Batch ${batch.batchNumber} has 0 stock!`);
      return;
    }

    const packCount = parseUnitsPerPack(medicine.packSize, medicine.dosageForm, medicine.unitsPerPack);
    const isLoose = preferredUnitType === 'LOOSE' && packCount > 1;
    const stripRate = batch.saleRate || batch.mrp;
    const calculatedRate = isLoose ? getPerUnitRate(stripRate, packCount) : stripRate;
    const unitLabel = isLoose ? 'Tab (Loose)' : (medicine.dosageForm || 'Strip');

    const qtyToAdd = Math.min(initialQuantity, isLoose ? Math.round(batch.availableQuantity * packCount) : batch.availableQuantity);
    const existingIndex = cart.findIndex(
      (i) => i.medicineId === medicine.id && i.batchId === batch.id && i.unitType === preferredUnitType
    );

    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      const newTotal = existing.quantity + qtyToAdd;
      updateItemQuantity(existingIndex, newTotal);
    } else {
      const gstRate = medicine.gstRate || 12;
      const netItemTotal = calculatedRate * qtyToAdd;
      const taxable = netItemTotal / (1 + gstRate / 100);
      const cgst = (taxable * (gstRate / 2)) / 100;
      const sgst = (taxable * (gstRate / 2)) / 100;

      const newItem: InvoiceItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        medicineId: medicine.id,
        medicineName: medicine.name,
        genericName: medicine.genericName,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        hsnCode: medicine.hsnCode,
        quantity: qtyToAdd,
        unit: unitLabel,
        unitType: isLoose ? 'LOOSE' : 'STRIP',
        unitsPerPack: packCount,
        rate: calculatedRate,
        mrp: batch.mrp,
        discountPercent: 0,
        discountAmount: 0,
        gstRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: 0,
        totalAmount: netItemTotal,
        costRate: isLoose ? getPerUnitRate(batch.purchaseRate, packCount) : batch.purchaseRate,
        isMemberDiscountEligible:
          medicine.isMembershipDiscountEligible !== false &&
          !membershipSettings.excludedMedicineIds?.includes(medicine.id),
      };

      setCart((prev) => [...prev, newItem]);
    }

    setSearchTerm('');
    setIsDropdownOpen(false);
    setIsBatchModalOpen(false);
    setSelectedMed(null);
    searchInputRef.current?.focus();
  };

  // Helper to find the First-Expiry-First-Out (FEFO) available batch
  const getFefoBatch = (med: Medicine): Batch | null => {
    if (!med.batches || med.batches.length === 0) return null;
    const available = med.batches.filter((b) => b.availableQuantity > 0);
    if (available.length > 0) {
      // Sort ascending by expiryDate (earliest expiry date first)
      return [...available].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0];
    }
    // Fallback: earliest expiry batch overall
    return [...med.batches].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0];
  };

  const handleOpenBatchSwitchForCartItem = (index: number) => {
    const item = cart[index];
    if (!item || item.itemCategory === 'MEMBERSHIP') return;
    const med = medicines.find((m) => m.id === item.medicineId);
    if (!med) return;
    setSelectedMed(med);
    const currentBatchIdx = med.batches.findIndex((b) => b.id === item.batchId);
    setBatchHighlightedIndex(currentBatchIdx >= 0 ? currentBatchIdx : 0);
    setEditingCartItemIndex(index);
    setIsBatchModalOpen(true);
  };

  const handleBatchSelect = (medicine: Medicine, batch: Batch) => {
    if (batch.availableQuantity <= 0) {
      alert(`Batch ${batch.batchNumber} has 0 stock!`);
      return;
    }

    if (editingCartItemIndex !== null && cart[editingCartItemIndex]) {
      setCart((prev) =>
        prev.map((item, idx) => {
          if (idx !== editingCartItemIndex) return item;
          const packCount = item.unitsPerPack || 1;
          const isLoose = item.unitType === 'LOOSE';
          const stripRate = batch.saleRate || batch.mrp;
          const calculatedRate = isLoose ? getPerUnitRate(stripRate, packCount) : stripRate;
          const netItemTotal = calculatedRate * item.quantity;
          const gstRate = item.gstRate || 12;
          const taxable = netItemTotal / (1 + gstRate / 100);

          return {
            ...item,
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            rate: calculatedRate,
            mrp: batch.mrp,
            totalAmount: netItemTotal,
            cgstAmount: (taxable * (gstRate / 2)) / 100,
            sgstAmount: (taxable * (gstRate / 2)) / 100,
            costRate: isLoose ? getPerUnitRate(batch.purchaseRate, packCount) : batch.purchaseRate,
          };
        })
      );
      setEditingCartItemIndex(null);
      setIsBatchModalOpen(false);
      setSelectedMed(null);
    } else {
      addItemToCart(medicine, batch);
      setIsBatchModalOpen(false);
      setSelectedMed(null);
    }
    searchInputRef.current?.focus();
  };

  const handleSelectMedicine = (med: Medicine) => {
    setSelectedMed(med);
    const fefoBatch = getFefoBatch(med);
    if (fefoBatch && fefoBatch.availableQuantity > 0) {
      addItemToCart(med, fefoBatch);
      if (selectedSaltFilterMed) {
        setScanFeedback({
          type: 'SUCCESS',
          code: `SWAP: ${med.name}`,
          medicineName: `${med.name} (Substituted for ${selectedSaltFilterMed.name})`,
          batchNumber: fefoBatch.batchNumber,
          expiryDate: fefoBatch.expiryDate,
          rate: fefoBatch.saleRate || fefoBatch.mrp,
        });
        setSelectedSaltFilterMed(null);
      }
      setSearchTerm('');
      setIsDropdownOpen(false);
      setIsBatchModalOpen(false);
      searchInputRef.current?.focus();
    } else if (med.batches && med.batches.length > 1) {
      setIsBatchModalOpen(true);
    } else if (fefoBatch) {
      addItemToCart(med, fefoBatch);
      if (selectedSaltFilterMed) {
        setScanFeedback({
          type: 'SUCCESS',
          code: `SWAP: ${med.name}`,
          medicineName: `${med.name} (Substituted for ${selectedSaltFilterMed.name})`,
          batchNumber: fefoBatch.batchNumber,
          expiryDate: fefoBatch.expiryDate,
          rate: fefoBatch.saleRate || fefoBatch.mrp,
        });
        setSelectedSaltFilterMed(null);
      }
      setSearchTerm('');
      setIsDropdownOpen(false);
      setIsBatchModalOpen(false);
      searchInputRef.current?.focus();
    } else if (med.totalStock === 0) {
      // If medicine is Out of Stock, automatically find and show in-stock alternatives
      const alternatives = medicines.filter(
        (m) => m.id !== med.id && m.totalStock > 0 && areSaltsMatching(m.genericName, med.genericName)
      );
      if (alternatives.length > 0) {
        setSelectedSaltFilterMed(med);
        setIsDropdownOpen(true);
      }
    }
  };

  // Switch between Full Strip and Cut-Strip / Loose Tablet Mode for a line item
  const toggleItemUnitType = (index: number, forceUnitType?: 'STRIP' | 'LOOSE') => {
    setCart((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const med = medicines.find((m) => m.id === item.medicineId);
        const batch = med?.batches.find((b) => b.id === item.batchId);
        const packCount = item.unitsPerPack || parseUnitsPerPack(med?.packSize, med?.dosageForm, med?.unitsPerPack);

        if (packCount <= 1) return item; // Non-cuttable single unit (e.g. Syrup)

        const nextUnitType: 'STRIP' | 'LOOSE' = forceUnitType !== undefined 
          ? forceUnitType 
          : (item.unitType === 'LOOSE' ? 'STRIP' : 'LOOSE');

        const stripRate = batch?.saleRate || batch?.mrp || item.mrp;
        const nextRate = nextUnitType === 'LOOSE' ? getPerUnitRate(stripRate, packCount) : stripRate;
        const nextUnitLabel = nextUnitType === 'LOOSE' ? 'Tab (Loose)' : (med?.dosageForm || 'Strip');

        // Adjust quantity smartly if switching unit
        let newQty = item.quantity;
        if (item.unitType === 'STRIP' && nextUnitType === 'LOOSE') {
          // If it was 1 strip, default to e.g. 2 or 3 loose tablets or 1 tab
          newQty = Math.min(packCount, Math.max(1, item.quantity > 1 ? item.quantity * packCount : 2));
        } else if (item.unitType === 'LOOSE' && nextUnitType === 'STRIP') {
          newQty = Math.max(1, Math.round(item.quantity / packCount));
        }

        const discAmount = (nextRate * newQty * item.discountPercent) / 100;
        const netItemTotal = nextRate * newQty - discAmount;
        const taxable = netItemTotal / (1 + item.gstRate / 100);
        const cgst = (taxable * (item.gstRate / 2)) / 100;
        const sgst = (taxable * (item.gstRate / 2)) / 100;

        return {
          ...item,
          unitType: nextUnitType,
          unitsPerPack: packCount,
          rate: nextRate,
          unit: nextUnitLabel,
          quantity: newQty,
          discountAmount: discAmount,
          cgstAmount: cgst,
          sgstAmount: sgst,
          totalAmount: netItemTotal,
        };
      })
    );
  };

  const updateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItemFromCart(index);
      return;
    }

    setCart((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const med = medicines.find((m) => m.id === item.medicineId);
        const batch = med?.batches.find((b) => b.id === item.batchId);
        const packCount = item.unitsPerPack || 1;

        if (batch) {
          const maxAvailable = item.unitType === 'LOOSE' && packCount > 1
            ? Math.round(batch.availableQuantity * packCount)
            : batch.availableQuantity;

          if (newQty > maxAvailable) {
            alert(`Stock limit reached. Max available for Batch ${batch.batchNumber} is ${maxAvailable} ${item.unit}`);
            newQty = maxAvailable;
          }
        }

        const discAmount = (item.rate * newQty * item.discountPercent) / 100;
        const netItemTotal = item.rate * newQty - discAmount;
        const taxable = netItemTotal / (1 + item.gstRate / 100);
        const cgst = (taxable * (item.gstRate / 2)) / 100;
        const sgst = (taxable * (item.gstRate / 2)) / 100;

        return {
          ...item,
          quantity: newQty,
          discountAmount: discAmount,
          cgstAmount: cgst,
          sgstAmount: sgst,
          totalAmount: netItemTotal,
        };
      })
    );
  };

  const updateItemDiscount = (index: number, discPercent: number) => {
    setCart((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const clampedDisc = Math.min(100, Math.max(0, discPercent));
        const discAmount = (item.rate * item.quantity * clampedDisc) / 100;
        const netItemTotal = item.rate * item.quantity - discAmount;
        const taxable = netItemTotal / (1 + item.gstRate / 100);
        const cgst = (taxable * (item.gstRate / 2)) / 100;
        const sgst = (taxable * (item.gstRate / 2)) / 100;

        return {
          ...item,
          discountPercent: clampedDisc,
          discountAmount: discAmount,
          cgstAmount: cgst,
          sgstAmount: sgst,
          totalAmount: netItemTotal,
        };
      })
    );
  };

  const removeItemFromCart = (index: number) => {
    const item = cart[index];
    if (item?.membershipDetails?.registrationId) {
      cancelPendingMembership(item.membershipDetails.registrationId);
    }
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleItemMemberDiscount = (index: number) => {
    setCart((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          isMemberDiscountEligible: !(item.isMemberDiscountEligible !== false),
        };
      })
    );
  };

  const handleClearCart = () => {
    if (cart.length > 0 && !confirm('Clear active billing cart?')) return;
    cart.forEach((item) => {
      if (item.membershipDetails?.registrationId) {
        cancelPendingMembership(item.membershipDetails.registrationId);
      }
    });
    setCart([]);
    setSelectedCustomer(null);
    setWalkinName('Walk-in Cash Customer');
    setWalkinPhone('');
    setDoctorName('Self');
    setOverallDiscountPercent(0);
    setCashTendered('');
    setCreditDownPayment('0');
    searchInputRef.current?.focus();
  };

  // Plug-and-play Hardware Handheld Barcode Scanner Handler
  const handleBarcodeScanned = useCallback(
    (scannedCode: string, durationMs?: number) => {
      const code = scannedCode.trim();
      if (!code) return;

      const now = Date.now();
      // 1. Raw code deduplication (1500ms window)
      if (code === lastProcessedBarcodeRef.current && now - lastProcessedTimeRef.current < 1500) {
        // Suppress rapid duplicate echo from multiple event triggers
        return;
      }

      const match = findMedicineByBarcodeOrQR(code);

      if (match && match.medicine && match.batch) {
        const med = match.medicine;
        const batch = match.batch;
        const itemKey = `${med.id}-${batch.id}`;

        // 2. Resolved medicine + batch deduplication (1500ms window)
        // Prevents composite QR + partial code dual triggers from adding 2 items or multiple batches
        if (itemKey === lastProcessedItemKeyRef.current && now - lastProcessedItemTimeRef.current < 1500) {
          return;
        }

        lastProcessedBarcodeRef.current = code;
        lastProcessedTimeRef.current = now;
        lastProcessedItemKeyRef.current = itemKey;
        lastProcessedItemTimeRef.current = now;

        if (batch.availableQuantity <= 0) {
          playScanSound('error', soundEnabled);
          alert(`⚠️ Scanned Medicine "${med.name}" (Batch: ${batch.batchNumber}) is out of stock!`);
          return;
        }

        const packCount = parseUnitsPerPack(med.packSize, med.dosageForm, med.unitsPerPack);
        const preferredUnit = match.unitType || 'STRIP';
        const isLoose = preferredUnit === 'LOOSE' && packCount > 1;

        const existingIndex = cart.findIndex(
          (i) => i.medicineId === med.id && i.batchId === batch.id && i.unitType === preferredUnit
        );

        if (existingIndex >= 0) {
          const currentQty = cart[existingIndex].quantity;
          updateItemQuantity(existingIndex, currentQty + 1);
          playScanSound('duplicate', soundEnabled);

          setScanFeedback({
            type: 'DUPLICATE',
            code,
            medicineName: med.name,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            quantity: currentQty + 1,
            rate: cart[existingIndex].rate,
            unitType: preferredUnit,
            durationMs,
          });
        } else {
          addItemToCart(med, batch, 1, preferredUnit);
          playScanSound('success', soundEnabled);

          const stripRate = batch.saleRate || batch.mrp;
          const rate = isLoose ? getPerUnitRate(stripRate, packCount) : stripRate;

          setScanFeedback({
            type: 'SUCCESS',
            code,
            medicineName: med.name,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            quantity: 1,
            rate,
            unitType: preferredUnit,
            durationMs,
          });
        }

        if (searchInputRef.current) {
          searchInputRef.current.value = '';
        }
        setSearchTerm('');
        setIsDropdownOpen(false);
        setIsBatchModalOpen(false);
        setSelectedMed(null);

        if (scanFeedbackTimeoutRef.current) clearTimeout(scanFeedbackTimeoutRef.current);
        scanFeedbackTimeoutRef.current = setTimeout(() => {
          setScanFeedback(null);
        }, 3500);
      } else {
        lastProcessedBarcodeRef.current = code;
        lastProcessedTimeRef.current = now;
        playScanSound('error', soundEnabled);
        setScanFeedback({
          type: 'UNKNOWN',
          code,
          durationMs,
        });

        if (scanFeedbackTimeoutRef.current) clearTimeout(scanFeedbackTimeoutRef.current);
        scanFeedbackTimeoutRef.current = setTimeout(() => {
          setScanFeedback(null);
        }, 6000);
      }
    },
    [cart, findMedicineByBarcodeOrQR, soundEnabled, addItemToCart, updateItemQuantity]
  );

  const { lastScan, totalScans } = useHandheldScanner({
    enabled: !isPaymentModalOpen && !isCustomerModalOpen && !isHeldModalOpen && !isBatchModalOpen,
    onScan: (detail) => {
      handleBarcodeScanned(detail.code, detail.durationMs);
    },
  });

  const handleSaveBarcodeLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unmappedBarcodeToLink.trim() || !selectedMedIdForLink) return;

    const res = assignBarcodeToMedicine(selectedMedIdForLink, unmappedBarcodeToLink.trim(), selectedUnitTypeForLink);
    if (res.success && res.medicine) {
      setLinkSuccessMsg(`Linked barcode "${unmappedBarcodeToLink}" to ${res.medicine.name}!`);
      // Auto-add to cart now that it is linked
      handleBarcodeScanned(unmappedBarcodeToLink.trim());
      setTimeout(() => {
        setIsBarcodeLinkModalOpen(false);
        setLinkSuccessMsg('');
      }, 1000);
    }
  };

  // Hold / Resume Bill
  const handleHoldCurrentBill = () => {
    if (cart.length === 0) {
      alert('Cart is empty. Nothing to park.');
      return;
    }
    const custName = selectedCustomer ? selectedCustomer.name : walkinName;
    const phone = selectedCustomer ? selectedCustomer.phone : walkinPhone;
    holdBill(cart, custName, phone, doctorName);
    setCart([]);
    setSelectedCustomer(null);
    setWalkinName('Walk-in Cash Customer');
    setWalkinPhone('');
    setDoctorName('Self');
    alert(`Bill parked successfully! Press F6 anytime to resume.`);
    searchInputRef.current?.focus();
  };

  const handleResumeBill = (held: HeldBills) => {
    const resumed = resumeHeldBill(held.id);
    if (resumed) {
      setCart(resumed.items);
      setWalkinName(resumed.customerName);
      setWalkinPhone(resumed.customerPhone);
      setDoctorName(resumed.doctorName);
      setIsHeldModalOpen(false);
    }
  };

  // REPEAT PATIENT LAST ORDER ENGINE (With Auto-Cut-Strip & Full Keyboard Support)
  const openRepeatOrderForCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setWalkinName(cust.name);
    setWalkinPhone(cust.phone);
    if (cust.doctorName) setDoctorName(cust.doctorName);
    setIsCustomerModalOpen(false); // Auto-redirect directly into select from last order

    // Find all previous invoices for this customer
    const custInvoices = invoices.filter((i) => i.customerId === cust.id || i.customerPhone === cust.phone);

    if (custInvoices.length === 0) {
      alert(`No previous purchase history found for ${cust.name}. You can start a new bill.`);
      searchInputRef.current?.focus();
      return;
    }

    // Sort by latest invoice date
    const latestInvoice = [...custInvoices].sort(
      (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
    )[0];

    // Build editable repeat item list
    const itemsToRepeat: RepeatOrderItem[] = latestInvoice.items.map((item) => {
      const med = medicines.find((m) => m.id === item.medicineId);
      const activeBatch = med?.batches.find((b) => b.availableQuantity > 0) || med?.batches[0];
      const packCount = item.unitsPerPack || parseUnitsPerPack(med?.packSize, med?.dosageForm, med?.unitsPerPack);
      const isLoose = item.unitType === 'LOOSE';
      const stripRate = activeBatch?.saleRate || activeBatch?.mrp || item.mrp;
      const calculatedRate = isLoose ? getPerUnitRate(stripRate, packCount) : stripRate;

      return {
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        genericName: item.genericName,
        batchId: activeBatch?.id || item.batchId,
        batchNumber: activeBatch?.batchNumber || item.batchNumber,
        expiryDate: activeBatch?.expiryDate || item.expiryDate,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unitType: isLoose ? 'LOOSE' : 'STRIP',
        unitsPerPack: packCount,
        rate: calculatedRate,
        mrp: activeBatch?.mrp || item.mrp,
        gstRate: item.gstRate,
        costRate: isLoose ? getPerUnitRate(activeBatch?.purchaseRate || item.costRate, packCount) : (activeBatch?.purchaseRate || item.costRate),
        availableStock: activeBatch?.availableQuantity || 0,
        isSelected: true, // Selected by default
      };
    });

    setRepeatHighlightedIndex(0);
    setRepeatItems(itemsToRepeat);
    setRepeatOrderModalOpen(true);
  };

  const handleToggleRepeatItem = (index: number) => {
    setRepeatItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, isSelected: !item.isSelected } : item))
    );
  };

  const toggleRepeatItemUnitType = (index: number) => {
    setRepeatItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const med = medicines.find((m) => m.id === item.medicineId);
        const batch = med?.batches.find((b) => b.id === item.batchId) || med?.batches[0];
        const packCount = item.unitsPerPack || parseUnitsPerPack(med?.packSize, med?.dosageForm, med?.unitsPerPack);

        if (packCount <= 1) return item;

        const nextUnitType: 'STRIP' | 'LOOSE' = item.unitType === 'LOOSE' ? 'STRIP' : 'LOOSE';
        const stripRate = batch?.saleRate || batch?.mrp || item.mrp;
        const nextRate = nextUnitType === 'LOOSE' ? getPerUnitRate(stripRate, packCount) : stripRate;

        let newQty = item.quantity;
        if (item.unitType === 'STRIP' && nextUnitType === 'LOOSE') {
          newQty = Math.min(packCount, Math.max(1, item.quantity > 1 ? item.quantity * packCount : 2));
        } else if (item.unitType === 'LOOSE' && nextUnitType === 'STRIP') {
          newQty = Math.max(1, Math.round(item.quantity / packCount));
        }

        return {
          ...item,
          unitType: nextUnitType,
          rate: nextRate,
          quantity: newQty,
        };
      })
    );
  };

  const handleUpdateRepeatQuantity = (index: number, newQty: number) => {
    setRepeatItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: Math.max(1, newQty) } : item))
    );
  };

  const handleRemoveRepeatItem = (index: number) => {
    setRepeatItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleLoadRepeatOrderToCart = () => {
    const selectedItems = repeatItems.filter((i) => i.isSelected);
    if (selectedItems.length === 0) {
      alert('Please select at least 1 medicine to load into cart.');
      return;
    }

    selectedItems.forEach((rep) => {
      const med = medicines.find((m) => m.id === rep.medicineId);
      const batch = med?.batches.find((b) => b.id === rep.batchId) || med?.batches[0];
      if (med && batch) {
        addItemToCart(med, batch, rep.quantity, rep.unitType || 'STRIP');
      }
    });

    setRepeatOrderModalOpen(false);
    setIsCustomerModalOpen(false);
    searchInputRef.current?.focus();
  };

  // Quick In-POS Loyalty Membership Registration
  const handleQuickEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = quickEnrollPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    const cleanName = quickEnrollName.trim();
    if (!cleanName) {
      alert('Please enter the customer name.');
      return;
    }

    const existingMember = getMemberByPhone(cleanPhone);
    if (existingMember) {
      alert(`Customer with mobile ${cleanPhone} is already a member (${existingMember.membershipId}, Status: ${existingMember.status}).`);
      setIsQuickEnrollOpen(false);
      return;
    }

    let targetCust = customers.find((c) => c.phone.replace(/\D/g, '') === cleanPhone);
    let targetCustId = targetCust ? targetCust.id : '';
    if (!targetCust) {
      const createdCust = addCustomer({
        name: cleanName,
        phone: cleanPhone,
        creditLimit: 5000,
        doctorName: doctorName || 'Self',
        address: 'Walk-in Member',
      });
      targetCustId = createdCust.id;
      setSelectedCustomer(createdCust);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const durationOpt = membershipSettings.availableDurations.find((d) => d.months === quickEnrollDuration);
    const durationLabel = durationOpt ? durationOpt.label : `${quickEnrollDuration} Months`;
    const expDate = calculateExpiryDate(todayStr, quickEnrollDuration);

    const newMember = createMembership({
      customerId: targetCustId,
      customerName: cleanName,
      customerPhone: cleanPhone,
      startDate: todayStr,
      durationMonths: quickEnrollDuration,
      durationLabel,
      expiryDate: expDate,
      status: 'ACTIVE',
      feePaid: quickEnrollFee,
      paymentMode: quickEnrollPayMode,
      createdBy: currentUser?.name || 'Counter Cashier',
      notes: `Quick enrolled at billing counter. Paid fee: ₹${quickEnrollFee} via ${quickEnrollPayMode}`,
    });

    setQuickEnrollSuccessMsg(
      `✓ Enrolled ${cleanName} (${newMember.membershipId})! Paid fee: ₹${quickEnrollFee} via ${quickEnrollPayMode}. 10% Loyalty Discount unlocked immediately.`
    );
    setTimeout(() => setQuickEnrollSuccessMsg(''), 5000);
    setIsQuickEnrollOpen(false);
  };

  // Keep quick terminal url in sync with settings
  useEffect(() => {
    if (settings.posTerminalBaseUrl) {
      setQuickTerminalUrl(settings.posTerminalBaseUrl);
    }
  }, [settings.posTerminalBaseUrl]);

  // Elapsed timer when terminal payment is dispatched
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (['REQUESTED', 'PROCESSING'].includes(terminalPaymentState)) {
      setTerminalElapsedSeconds(0);
      timer = setInterval(() => {
        setTerminalElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setTerminalElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [terminalPaymentState]);

  // Check health and readiness of external Pine Labs terminal simulator
  const checkTerminalHealthStatus = async (overrideUrl?: string) => {
    setIsCheckingTerminalHealth(true);
    try {
      const targetUrl = (overrideUrl || settings.posTerminalBaseUrl || 'http://localhost:3001').trim().replace(/\/+$/, '');
      const res = await fetch(`/api/terminal/health?baseUrl=${encodeURIComponent(targetUrl)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTerminalHealth(data);
      } else {
        setTerminalHealth({
          status: 'DISCONNECTED',
          simulator: 'Pine Labs-Style POS Terminal Simulator',
          deviceId: settings.posTerminalDeviceId || 'PINELABS-POS-M884',
          merchantName: settings.posTerminalMerchantName || 'CarePlus Pharmacy & Wellness',
          environment: 'DEMO',
          terminalStatus: 'OFFLINE',
          isPaired: false,
        });
      }
    } catch {
      setTerminalHealth({
        status: 'DISCONNECTED',
        simulator: 'Pine Labs-Style POS Terminal Simulator',
        deviceId: settings.posTerminalDeviceId || 'PINELABS-POS-M884',
        merchantName: settings.posTerminalMerchantName || 'CarePlus Pharmacy & Wellness',
        environment: 'DEMO',
        terminalStatus: 'OFFLINE',
        isPaired: false,
      });
    } finally {
      setIsCheckingTerminalHealth(false);
    }
  };

  // Quick Terminal Switcher Save / Ping
  const handleSaveQuickTerminalConfig = async () => {
    if (!quickTerminalUrl.trim()) return;
    setIsTerminalActionLoading(true);
    setQuickConfigMsg(null);
    const cleanUrl = quickTerminalUrl.trim().replace(/\/+$/, '');

    try {
      const res = await fetch('/api/terminal/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: cleanUrl,
          testConnection: true,
        }),
      });
      const data = await res.json();

      updateSettings({
        posTerminalBaseUrl: cleanUrl,
      });

      if (data.health?.status === 'HEALTHY') {
        setTerminalHealth(data.health);
        setQuickConfigMsg({
          type: 'success',
          text: `Connected to ${data.health.simulator || 'Terminal'}! Status: ${data.health.terminalStatus}`,
        });
      } else {
        await checkTerminalHealthStatus(cleanUrl);
        setQuickConfigMsg({
          type: 'info',
          text: `Target saved. Status: ${data.health?.terminalStatus || 'Checking...'}`,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setQuickConfigMsg({
        type: 'error',
        text: `Failed: ${msg}`,
      });
    } finally {
      setIsTerminalActionLoading(false);
    }
  };

  // Quick One-Click Pairing with Terminal
  const handleQuickPairWithTerminal = async () => {
    setIsTerminalActionLoading(true);
    setQuickConfigMsg(null);
    const cleanUrl = quickTerminalUrl.trim().replace(/\/+$/, '');

    try {
      let codeToUse = quickPairingCode.trim();

      // If no code entered, attempt to auto-fetch code from terminal simulator screen
      if (!codeToUse) {
        const codeRes = await fetch(`/api/terminal/pair?baseUrl=${encodeURIComponent(cleanUrl)}`);
        const codeData = await codeRes.json();
        if (codeData?.pairingCode) {
          codeToUse = codeData.pairingCode;
          setQuickPairingCode(codeData.pairingCode);
        } else {
          throw new Error(codeData?.error || 'Could not fetch pairing code from terminal screen. Please enter code manually.');
        }
      }

      const pairRes = await fetch('/api/terminal/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: cleanUrl,
          pairingCode: codeToUse,
          clientName: 'CarePlus-Pharmacy-Counter-1',
        }),
      });

      const pairData = await pairRes.json();
      if (!pairRes.ok || !pairData.success) {
        throw new Error(pairData.error || 'Pairing rejected by terminal. Check code.');
      }

      updateSettings({
        posTerminalBaseUrl: cleanUrl,
        posTerminalToken: pairData.token,
        posTerminalIsPaired: true,
      });

      setQuickConfigMsg({
        type: 'success',
        text: `Device paired successfully! Secure token generated.`,
      });
      await checkTerminalHealthStatus(cleanUrl);
      setTimeout(() => setIsQuickTerminalConfigOpen(false), 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setQuickConfigMsg({
        type: 'error',
        text: `Pairing failed: ${msg}`,
      });
    } finally {
      setIsTerminalActionLoading(false);
    }
  };

  // Cleanup active listeners on unmount or reset
  const cleanupTerminalListeners = () => {
    if (terminalPollRef.current) {
      clearInterval(terminalPollRef.current);
      terminalPollRef.current = null;
    }
    if (terminalEventSourceRef.current) {
      terminalEventSourceRef.current.close();
      terminalEventSourceRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupTerminalListeners();
    };
  }, []);

  // Fetch terminal health when payment modal opens and POS_TERMINAL is selected
  useEffect(() => {
    if (isPaymentModalOpen && paymentMode === 'POS_TERMINAL') {
      checkTerminalHealthStatus();
    }
  }, [isPaymentModalOpen, paymentMode]);

  // Load persisted terminal attempts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('CAREPLUS_TERMINAL_PAYMENT_ATTEMPTS_V1');
      if (saved) {
        setTerminalRecentAttempts(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveTerminalAttempt = (attempt: TerminalPaymentAttempt) => {
    setActivePaymentAttempt(attempt);
    setTerminalRecentAttempts((prev) => {
      const filtered = prev.filter((a) => a.requestId !== attempt.requestId);
      const updated = [attempt, ...filtered].slice(0, 50);
      try {
        localStorage.setItem('CAREPLUS_TERMINAL_PAYMENT_ATTEMPTS_V1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Authoritative Server-to-Server Verification and Invoice Finalization
  const verifyAndFinalizeTerminalPayment = async (
    transactionId: string,
    requestId: string,
    expectedInvoiceNumber: string,
    expectedAmount: number
  ) => {
    if (isFinalizingInvoiceRef.current) return;
    isFinalizingInvoiceRef.current = true;
    cleanupTerminalListeners();

    try {
      const verifyRes = await fetch('/api/terminal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          requestId,
          expectedAmount: Number(expectedAmount.toFixed(2)),
          expectedInvoiceReference: expectedInvoiceNumber,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData.verified) {
        setTerminalPaymentState('RECONCILIATION_REQUIRED');
        setTerminalErrorMsg(
          verifyData.reason || 'Authoritative payment verification failed. Terminal returned mismatched data.'
        );
        isFinalizingInvoiceRef.current = false;
        return;
      }

      // Verified successfully! Finalize invoice and deduct batch stock strictly once
      const txn = verifyData.transaction || {};
      const custName = selectedCustomer ? selectedCustomer.name : walkinName;
      const custPhone = selectedCustomer ? selectedCustomer.phone : walkinPhone;
      const custId = selectedCustomer ? selectedCustomer.id : `cust-walkin-${Date.now()}`;

      const finalizedInvoice = createSalesInvoice({
        invoiceType: 'RETAIL',
        customerId: custId,
        customerName: custName,
        customerPhone: custPhone,
        doctorName,
        items: cart,
        subTotal: grossTotal,
        totalDiscount: lineDiscounts + billDiscountAmount + membershipDiscountAmount,
        totalCgst,
        totalSgst,
        totalIgst: 0,
        roundOff,
        grandTotal,
        paymentMode: 'POS_TERMINAL',
        paymentStatus: 'PAID',
        amountPaid: grandTotal,
        balanceDue: 0,
        cashierName: currentUser.name,
        membershipId: currentMember ? currentMember.membershipId : undefined,
        membershipDiscountPercent: effectiveMemberDiscountPercent,
        membershipDiscountAmount,
        membershipTier: currentMember ? (memberTierInfo.tier as '10%' | '20%') : undefined,
        eligiblePurchaseAmount: customerPurchaseAgg.rollingPurchases,
        terminalDeviceId: settings.posTerminalDeviceId || 'PINELABS-POS-M884',
        terminalTransactionId: txn.transactionId || transactionId,
        terminalRequestId: requestId,
        terminalAuthCode: txn.authCode,
        terminalRrn: txn.rrn,
        terminalPaymentMethod: txn.paymentMethod || 'CUSTOMER_CHOICE',
        terminalCardLast4: txn.cardLast4,
        terminalCardNetwork: txn.cardNetwork,
        terminalUpiVpa: txn.upiVpa,
        terminalStatus: 'SUCCESS',
        isDemoTerminal: true,
      });

      // Update persisted attempt to finalized
      saveTerminalAttempt({
        id: `att-${Date.now()}`,
        invoiceNumber: finalizedInvoice.invoiceNumber,
        requestId,
        transactionId: txn.transactionId || transactionId,
        deviceId: settings.posTerminalDeviceId || 'PINELABS-POS-M884',
        amount: grandTotal,
        currency: 'INR',
        state: 'SUCCESS',
        paymentMethod: txn.paymentMethod,
        authCode: txn.authCode,
        rrn: txn.rrn,
        cardLast4: txn.cardLast4,
        cardNetwork: txn.cardNetwork,
        cardEntryMode: txn.cardEntryMode,
        upiVpa: txn.upiVpa,
        isDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        finalized: true,
      });

      setTerminalPaymentState('SUCCESS');
      setCompletedInvoice(finalizedInvoice);
      setIsPaymentModalOpen(false);
      setIsPrintModalOpen(true);
      setCart([]);
      setSelectedCustomer(null);
      setWalkinName('Walk-in Cash Customer');
      setWalkinPhone('');
      setDoctorName('Self');
      setTerminalPaymentState('IDLE');
      setActivePaymentAttempt(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to finalize transaction';
      setTerminalPaymentState('RECONCILIATION_REQUIRED');
      setTerminalErrorMsg(`Invoice finalization error: ${msg}`);
    } finally {
      isFinalizingInvoiceRef.current = false;
    }
  };

  // Start polling fallback and SSE stream
  const startTerminalMonitoring = (
    transactionId: string,
    requestId: string,
    invoiceRef: string,
    amount: number
  ) => {
    cleanupTerminalListeners();

    let attemptsCount = 0;
    const maxPollAttempts = 80; // ~120 seconds

    // 1. Polling fallback every 1500ms
    terminalPollRef.current = setInterval(async () => {
      attemptsCount++;
      if (attemptsCount > maxPollAttempts) {
        cleanupTerminalListeners();
        setTerminalPaymentState('TIMED_OUT');
        setTerminalErrorMsg('POS Terminal payment timed out after 120 seconds. Please check terminal screen.');
        return;
      }

      try {
        const res = await fetch(`/api/terminal/status?identifier=${encodeURIComponent(transactionId || requestId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!data.success && !data.status) return;

        if (data.status === 'PROCESSING') {
          setTerminalPaymentState('PROCESSING');
        } else if (data.status === 'SUCCESS') {
          verifyAndFinalizeTerminalPayment(data.transactionId || transactionId, requestId, invoiceRef, amount);
        } else if (data.status === 'FAILED') {
          cleanupTerminalListeners();
          setTerminalPaymentState('FAILED');
          setTerminalErrorMsg(data.failureReason || 'Payment was declined or cancelled on POS terminal.');
        } else if (data.status === 'CANCELLED') {
          cleanupTerminalListeners();
          setTerminalPaymentState('CANCELLED');
          setTerminalErrorMsg('Payment was cancelled on terminal.');
        }
      } catch {
        // Continue polling until timeout
      }
    }, 1500);

    // 2. SSE Listener for immediate push updates
    try {
      const es = new EventSource('/api/terminal/events');
      terminalEventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const evt = JSON.parse(event.data);
          if (
            evt.transactionId === transactionId ||
            evt.requestId === requestId ||
            evt.invoiceReference === invoiceRef
          ) {
            if (evt.status === 'PROCESSING') {
              setTerminalPaymentState('PROCESSING');
            } else if (evt.status === 'SUCCESS') {
              verifyAndFinalizeTerminalPayment(evt.transactionId || transactionId, requestId, invoiceRef, amount);
            } else if (evt.status === 'FAILED') {
              cleanupTerminalListeners();
              setTerminalPaymentState('FAILED');
              setTerminalErrorMsg(evt.failureReason || 'Payment declined on POS terminal.');
            } else if (evt.status === 'CANCELLED') {
              cleanupTerminalListeners();
              setTerminalPaymentState('CANCELLED');
              setTerminalErrorMsg('Payment cancelled.');
            }
          }
        } catch {}
      };

      es.onerror = () => {
        // SSE error, gracefully rely on polling fallback
        es.close();
      };
    } catch {}
  };

  // Send Payment to Terminal
  const handleCollectPaymentOnTerminal = async () => {
    if (cart.length === 0 || grandTotal <= 0) return;
    if (isTerminalActionLoading || ['REQUESTED', 'PROCESSING'].includes(terminalPaymentState)) return;

    setIsTerminalActionLoading(true);
    setTerminalErrorMsg(null);

    const invCount = invoices.length + 1;
    const invNumber = `INV-${new Date().getFullYear()}-${String(invCount).padStart(5, '0')}`;
    const requestId = `req-inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    setTerminalPaymentState('REQUESTED');

    const newAttempt: TerminalPaymentAttempt = {
      id: `att-${Date.now()}`,
      invoiceNumber: invNumber,
      requestId,
      deviceId: settings.posTerminalDeviceId || 'PINELABS-POS-M884',
      amount: grandTotal,
      currency: 'INR',
      state: 'REQUESTED',
      isDemo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      finalized: false,
    };
    saveTerminalAttempt(newAttempt);

    try {
      const res = await fetch('/api/terminal/payment-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          amount: Number(grandTotal.toFixed(2)),
          currency: 'INR',
          invoiceReference: invNumber,
          paymentMethod: 'CUSTOMER_CHOICE',
          token: settings.posTerminalToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setTerminalPaymentState('FAILED');
        setTerminalErrorMsg(data.error || 'Failed to dispatch payment to POS terminal. Please ensure simulator is running.');
        setIsTerminalActionLoading(false);
        return;
      }

      setTerminalPaymentState('PROCESSING');
      saveTerminalAttempt({
        ...newAttempt,
        transactionId: data.transactionId,
        state: 'PROCESSING',
        updatedAt: new Date().toISOString(),
      });

      // Start listening and polling for terminal status
      startTerminalMonitoring(data.transactionId, requestId, invNumber, grandTotal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terminal communication failure';
      setTerminalPaymentState('FAILED');
      setTerminalErrorMsg(`Error: ${msg}`);
    } finally {
      setIsTerminalActionLoading(false);
    }
  };

  // Cancel Payment Request
  const handleCancelTerminalPayment = async () => {
    if (!activePaymentAttempt) return;
    setIsTerminalActionLoading(true);

    try {
      const res = await fetch('/api/terminal/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: activePaymentAttempt.transactionId || activePaymentAttempt.requestId,
        }),
      });

      const data = await res.json();
      cleanupTerminalListeners();
      setTerminalPaymentState('CANCELLED');
      setTerminalErrorMsg(data.message || 'Payment cancelled by cashier.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel payment';
      setTerminalErrorMsg(`Cancel error: ${msg}`);
    } finally {
      setIsTerminalActionLoading(false);
    }
  };

  // Complete & Save Bill (Supports Cash, UPI, Card, or Khata Credit with partial split)
  const handleCompleteSale = () => {
    if (cart.length === 0) return;

    const custName = selectedCustomer ? selectedCustomer.name : walkinName;
    const custPhone = selectedCustomer ? selectedCustomer.phone : walkinPhone;
    const custId = selectedCustomer ? selectedCustomer.id : `cust-walkin-${Date.now()}`;

    const amountPaid = paymentMode === 'CREDIT' ? downPay : grandTotal;
    const balanceDue = paymentMode === 'CREDIT' ? creditBalanceDue : 0;

    const invoice = createSalesInvoice({
      invoiceType: 'RETAIL',
      customerId: custId,
      customerName: custName,
      customerPhone: custPhone,
      doctorName,
      items: cart,
      subTotal: grossTotal,
      totalDiscount: lineDiscounts + billDiscountAmount + membershipDiscountAmount,
      totalCgst,
      totalSgst,
      totalIgst: 0,
      roundOff,
      grandTotal,
      paymentMode,
      splitDetails: paymentMode === 'SPLIT' ? { cash: splitCash, upi: splitUpi } : undefined,
      paymentStatus: paymentMode === 'CREDIT' ? (downPay > 0 ? 'PARTIALLY_PAID' : 'DUE') : 'PAID',
      amountPaid,
      balanceDue,
      cashierName: currentUser.name,
      membershipId: currentMember ? currentMember.membershipId : undefined,
      membershipDiscountPercent: effectiveMemberDiscountPercent,
      membershipDiscountAmount,
      membershipTier: currentMember ? (memberTierInfo.tier as '10%' | '20%') : undefined,
      eligiblePurchaseAmount: customerPurchaseAgg.rollingPurchases,
    });

    setCompletedInvoice(invoice);
    setIsPaymentModalOpen(false);
    setIsPrintModalOpen(true);
    setCart([]);
    setSelectedCustomer(null);
    setWalkinName('Walk-in Cash Customer');
    setWalkinPhone('');
    setDoctorName('Self');
    setCashTendered('');
    setCreditDownPayment('0');
    setSplitCashAmount('');
    setSplitCashTendered('');
  };

  // Quick Customer Registration
  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;
    const created = addCustomer({
      name: newCustName,
      phone: newCustPhone,
      doctorName: newCustDoctor || 'Self / Direct',
      creditLimit: newCustCreditLimit,
    });
    setSelectedCustomer(created);
    setWalkinName(created.name);
    setWalkinPhone(created.phone);
    if (created.doctorName) setDoctorName(created.doctorName);
    setIsCustomerModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustDoctor('Self / Direct');
    setShowQuickAddForm(false);
  };

  // Keyboard navigation & quick confirmation inside Payment Checkout Modal (Shift+F4 / Enter)
  useEffect(() => {
    if (!isPaymentModalOpen) return;

    const handlePaymentKeyDown = (e: KeyboardEvent) => {
      const isShift = e.shiftKey;
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsPaymentModalOpen(false);
        searchInputRef.current?.focus();
        return;
      }

      if (
        ((isShift && e.key === 'F4') || e.key === 'F4' || e.key === 'Enter') &&
        paymentMode !== 'POS_TERMINAL'
      ) {
        const activeTag = document.activeElement?.tagName;
        if (e.key === 'Enter' && activeTag === 'TEXTAREA') return;

        e.preventDefault();
        handleCompleteSale();
      }
    };

    window.addEventListener('keydown', handlePaymentKeyDown);
    return () => window.removeEventListener('keydown', handlePaymentKeyDown);
  }, [isPaymentModalOpen, paymentMode, handleCompleteSale]);

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-2.5 pb-12 md:pb-10">
      {/* 1. Fast Counter Barcode / Medicine Search Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs w-full max-w-full">
        {/* Medicine / Barcode Input with Keyboard Arrow Support */}
        <div ref={searchContainerRef} className="relative w-full xl:flex-1 xl:min-w-[280px]">
          {selectedSaltFilterMed && (
            <div className="mb-1.5 flex items-center justify-between gap-1.5 px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 text-xs font-semibold animate-in fade-in">
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">⇄</span>
                <span className="font-bold">Generic Swap:</span>
                <span className="underline font-bold truncate max-w-[140px]">{selectedSaltFilterMed.name}</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono hidden sm:inline truncate max-w-[180px]">({selectedSaltFilterMed.genericName})</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedSaltFilterMed(null)}
                className="text-amber-800 hover:text-black dark:text-amber-300 dark:hover:text-white font-bold px-1.5 py-0.5 rounded text-[11px] bg-white/70 dark:bg-slate-900/60 shadow-2xs cursor-pointer shrink-0"
                title="Clear generic substitute filter"
              >
                ✕ Clear Filter
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Search className="h-4 w-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onFocus={() => {
                if (searchTerm.trim().length > 0 || selectedSaltFilterMed) setIsDropdownOpen(true);
              }}
              onChange={(e) => {
                const val = e.target.value;
                setSearchTerm(val);
                if (selectedSaltFilterMed) {
                  setSelectedSaltFilterMed(null);
                }
                if (val.trim().length > 0) {
                  setIsDropdownOpen(true);
                }

                // Ultra-fast auto-scan for phone Bluetooth scanners typing into search input (30ms compound/URL, 60ms numeric)
                if (fastScanTimerRef.current) clearTimeout(fastScanTimerRef.current);
                const cleanVal = val.trim();
                const isUrlOrGs1 =
                  cleanVal.startsWith('http://') ||
                  cleanVal.startsWith('https://') ||
                  cleanVal.includes('/01/') ||
                  cleanVal.includes('/01 ') ||
                  cleanVal.includes('verify.') ||
                  cleanVal.includes('validate/') ||
                  cleanVal.startsWith('010890');
                const isCompound =
                  (cleanVal.includes('|') && (cleanVal.includes('EXP') || cleanVal.includes('MRP') || cleanVal.split('|').length >= 3)) ||
                  isUrlOrGs1;
                const isStandardBarcode = /^\d{8,14}$/.test(cleanVal);

                if (isCompound || isStandardBarcode) {
                  fastScanTimerRef.current = setTimeout(() => {
                    const match = findMedicineByBarcodeOrQR(cleanVal);
                    if (match && match.medicine && match.batch) {
                      if (searchInputRef.current) searchInputRef.current.value = '';
                      setSearchTerm('');
                      setIsDropdownOpen(false);
                      setIsBatchModalOpen(false);
                      setSelectedMed(null);
                      handleBarcodeScanned(cleanVal);
                    }
                  }, isCompound ? 30 : 60);
                }
              }}
              onKeyDown={(e) => {
                // If any modal is active, do not intercept keyboard navigation or Enter
                if (isBatchModalOpen || isHeldModalOpen || isCustomerModalOpen || isPaymentModalOpen || repeatOrderModalOpen) {
                  return;
                }

                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (!isDropdownOpen) {
                    setIsDropdownOpen(true);
                  } else if (filteredMedicines.length > 0) {
                    setHighlightedIndex((prev) => (prev < filteredMedicines.length - 1 ? prev + 1 : 0));
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (!isDropdownOpen) {
                    setIsDropdownOpen(true);
                  } else if (filteredMedicines.length > 0) {
                    setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredMedicines.length - 1));
                  }
                } else if (e.key === 'Enter') {
                  if (fastScanTimerRef.current) clearTimeout(fastScanTimerRef.current);
                  e.preventDefault();
                  const term = searchTerm.trim();

                  // 1. First check if typed/scanned string is a barcode/QR match
                  if (term && !selectedSaltFilterMed) {
                    const barcodeMatch = findMedicineByBarcodeOrQR(term);
                    if (barcodeMatch && barcodeMatch.medicine && barcodeMatch.batch) {
                      if (searchInputRef.current) searchInputRef.current.value = '';
                      setSearchTerm('');
                      setIsDropdownOpen(false);
                      setIsBatchModalOpen(false);
                      setSelectedMed(null);
                      handleBarcodeScanned(term);
                      return;
                    }
                  }

                  // 2. Select highlighted dropdown medicine
                  if (filteredMedicines.length > 0) {
                    const targetMed =
                      filteredMedicines[Math.min(highlightedIndex, filteredMedicines.length - 1)] ||
                      filteredMedicines[0];
                    if (targetMed) {
                      if (searchInputRef.current) searchInputRef.current.value = '';
                      setSearchTerm('');
                      setIsDropdownOpen(false);
                      handleSelectMedicine(targetMed);
                    }
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  if (selectedSaltFilterMed) {
                    setSelectedSaltFilterMed(null);
                  } else {
                    setIsDropdownOpen(false);
                  }
                }
              }}
              placeholder={
                selectedSaltFilterMed
                  ? `Showing generic substitutes for ${selectedSaltFilterMed.name}... Type to search all`
                  : 'Shift+M / Shift+F2: Scan Barcode or type medicine brand name, salt (e.g. Dolo, Paracetamol)...'
              }
              className="w-full pl-9 pr-24 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
            />
            <div className="absolute right-2 top-1.5 flex items-center gap-1">
              <kbd className="kbd-shortcut text-[10px]">Shift+M</kbd>
              <kbd className="kbd-shortcut text-[10px]">Shift+F2</kbd>
            </div>
          </div>

          {/* Clean, Simple Medicine Search Results Dropdown */}
          {isDropdownOpen && (filteredMedicines.length > 0 || selectedSaltFilterMed) && (
            <div
              ref={searchContainerRef}
              className="absolute left-0 right-0 top-11 z-50 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-[420px] flex flex-col w-full max-w-full lg:max-w-3xl animate-in fade-in zoom-in-95 duration-100"
            >
              {/* Header: Results Count or Generic Substitute Mode */}
              {selectedSaltFilterMed ? (
                <div className="bg-amber-50 dark:bg-amber-950/80 px-3.5 py-2 border-b border-amber-200 dark:border-amber-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      ⇄
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-950 dark:text-amber-100">
                          In-Stock Generic Substitutes for {selectedSaltFilterMed.name}
                        </span>
                        <span className="px-2 py-0.2 rounded-full bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                          {filteredMedicines.filter((m) => m.totalStock > 0).length} Available
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-700 dark:text-amber-300 font-mono mt-0.5">
                        Exact Chemical Salt: {selectedSaltFilterMed.genericName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSaltFilterMed(null)}
                    className="px-2.5 py-1 rounded text-[11px] font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-2xs cursor-pointer"
                  >
                    Clear Filter ✕
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <span>
                    Matching Medicines ({filteredMedicines.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                    Use ↑ ↓ arrows &amp; Enter to pick
                  </span>
                </div>
              )}

              {/* Empty state when no matching substitute found */}
              {filteredMedicines.length === 0 && selectedSaltFilterMed && (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    No active substitutes with exact salt <span className="font-mono text-amber-600 dark:text-amber-400">"{selectedSaltFilterMed.genericName}"</span> found in stock.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedSaltFilterMed(null)}
                    className="text-xs font-bold text-emerald-600 hover:underline"
                  >
                    Return to all medicines
                  </button>
                </div>
              )}

              {/* Clean Single-Column Medicine List */}
              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-[340px]">
                {filteredMedicines.map((med, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const packCount = parseUnitsPerPack(med.packSize, med.dosageForm, med.unitsPerPack);
                  const fefoBatch = getFefoBatch(med) || med.batches[0];
                  const stripPrice = fefoBatch?.saleRate || fefoBatch?.mrp || med.batches[0]?.saleRate || med.batches[0]?.mrp || 0;
                  const perTabPrice = getPerUnitRate(stripPrice, packCount);
                  const inStock = med.totalStock > 0;
                  const inStockAlternatives = medicines.filter(
                    (m) => m.id !== med.id && m.totalStock > 0 && areSaltsMatching(m.genericName, med.genericName)
                  );
                  const altCount = inStockAlternatives.length;

                  return (
                    <div
                      key={med.id}
                      ref={isHighlighted ? activeRowRef : undefined}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelectMedicine(med)}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-l-4 border-l-emerald-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Left: Brand Name, Rx pill, Generic Salt & Pack */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-bold ${
                              isHighlighted ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {med.name}
                          </span>
                          {med.requiresPrescription && (
                            <span className="px-1 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold text-[9px]">
                              Rx
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            • {med.packSize}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {med.genericName}
                        </p>
                      </div>

                      {/* Right: Stock, Price, Alternatives & Pick Button */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Stock Status Badge */}
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            inStock
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {inStock ? `${med.totalStock} in stock` : 'Out of Stock'}
                        </span>

                        {/* 1-Click Generic / Salt Substitute Swap tag (Never Lose a Sale) */}
                        {!inStock && altCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSaltFilterMed(med);
                              setIsDropdownOpen(true);
                              setHighlightedIndex(0);
                            }}
                            title={`1-Click Generic Swap: Click to filter ${altCount} in-stock brand(s) with ${med.genericName}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-xs transition-all cursor-pointer ring-1 ring-amber-400"
                          >
                            <span className="font-extrabold text-xs leading-none">⇄</span>
                            <span>{altCount} In-Stock Alternative{altCount > 1 ? 's' : ''}</span>
                          </button>
                        )}

                        {/* If in stock, show subtle alternative count tag for generic comparison */}
                        {inStock && altCount > 0 && !selectedSaltFilterMed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSaltFilterMed(med);
                              setIsDropdownOpen(true);
                              setHighlightedIndex(0);
                            }}
                            title={`View ${altCount} other in-stock brand(s) with ${med.genericName}`}
                            className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                          >
                            <span>⇄</span>
                            <span>{altCount} alt</span>
                          </button>
                        )}

                        {/* Price */}
                        <div className="text-right min-w-[70px]">
                          <span className="text-xs font-mono font-black text-slate-900 dark:text-slate-100 block">
                            ₹{stripPrice.toFixed(2)}
                          </span>
                          {packCount > 1 && (
                            <span className="text-[10px] font-mono text-slate-400 block">
                              ₹{perTabPrice.toFixed(2)}/tab
                            </span>
                          )}
                        </div>

                        {/* If multiple batches exist, provide manual batch choice button */}
                        {med.batches.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMed(med);
                              setEditingCartItemIndex(null);
                              setBatchHighlightedIndex(0);
                              setIsBatchModalOpen(true);
                              setIsDropdownOpen(false);
                            }}
                            title={`Manually choose from ${med.batches.length} available batches`}
                            className="px-2 py-1 rounded text-[11px] font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs shrink-0"
                          >
                            Batches ({med.batches.length})
                          </button>
                        )}

                        {/* Pick / Add Button (Auto-FEFO First-to-Expiry or Swap Alt) */}
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectMedicine(med);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all shadow-2xs shrink-0 ${
                            !inStock && altCount > 0
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : isHighlighted
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-600 hover:text-white'
                          }`}
                        >
                          {!inStock && altCount > 0 ? '⇄ Swap Alt' : inStock ? '+ Pick' : 'OOS'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Clean Footer Bar with Keyboard Guide */}
              <div className="bg-slate-50 dark:bg-slate-800/90 px-3.5 py-1.5 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[9px]">↑</kbd>
                  <kbd className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[9px]">↓</kbd>
                  <span>Navigate</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <kbd className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[9px]">Enter</kbd>
                  <span>Select</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[9px]">Esc</kbd>
                  <span>Close</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Customer & Prescriber Quick Inputs + Repeat Order Button (Desktop Only - Strictly Preserved for Large Displays) */}
        <div className="hidden xl:flex items-center gap-2 shrink-0">
          {/* Customer Search & Khata Selector */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})` : walkinName}
              onChange={(e) => {
                if (selectedCustomer) setSelectedCustomer(null);
                setWalkinName(e.target.value);
              }}
              placeholder="Patient Name / Khata"
              className="bg-transparent text-xs font-semibold w-36 outline-none text-slate-800 dark:text-slate-200"
            />
            <button
              onClick={() => {
                setRepeatSearchTerm('');
                setIsCustomerModalOpen(true);
              }}
              title="Shift+C: Search customer directory & khata"
              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Search/Add</span>
              <kbd className="kbd-shortcut text-[9px] px-1 py-0 font-mono">Shift+C</kbd>
            </button>
          </div>

          {/* Repeat Last Order Quick Trigger */}
          <button
            onClick={() => {
              setRepeatSearchTerm('');
              setIsCustomerModalOpen(true);
            }}
            title="Search Customer to Repeat Last Order with full editability"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>🔁 Repeat Last Order</span>
          </button>

          {/* 1-Click Membership Quick Action */}
          <button
            type="button"
            onClick={() => {
              setQuickEnrollName(selectedCustomer ? selectedCustomer.name : (walkinName !== 'Walk-in Cash Customer' ? walkinName : ''));
              setQuickEnrollPhone(currentActivePhone);
              setIsQuickEnrollOpen(true);
            }}
            title="1-Click Customer Loyalty Membership"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            <Crown className="h-3.5 w-3.5 text-amber-300" />
            <span>1-Click Membership</span>
          </button>

          {/* Prescribing Doctor */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1">
            <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr. Reference"
              className="bg-transparent text-xs font-semibold w-24 outline-none text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Park Bill / Resume Bill Buttons */}
          <button
            onClick={handleHoldCurrentBill}
            title="Shift+F5: Hold active bill"
            className="flex items-center gap-1 px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold"
          >
            <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>Shift+F5 Hold</span>
          </button>

          <button
            onClick={() => setIsHeldModalOpen(true)}
            title="Shift+F6: Resume parked bills"
            className="flex items-center gap-1 px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold"
          >
            <PlayCircle className="h-3.5 w-3.5 text-blue-600" />
            <span>Shift+F6 ({heldBills.length})</span>
          </button>

          {/* Handheld Barcode Scanner Status & Diagnostic Pill (Desktop Only) */}
          <div className="hidden xl:inline-flex">
            <HandheldScannerWidget
              lastScan={lastScan}
              totalScans={totalScans}
              scanFeedback={scanFeedback}
              onDismissFeedback={() => setScanFeedback(null)}
              onOpenMappingModal={(code) => {
                setUnmappedBarcodeToLink(code);
                setSelectedMedIdForLink(medicines[0]?.id || '');
                setSelectedUnitTypeForLink('STRIP');
                setIsBarcodeLinkModalOpen(true);
              }}
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
              onDirectScan={handleBarcodeScanned}
            />
          </div>
        </div>

        {/* Mobile / Compact Dedicated Operational Ribbon (Zero Horizontal Scroll!) */}
        <div className="xl:hidden w-full pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          {/* Row 1: Patient / Khata + Prescribing Doctor (2-column responsive grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Patient Name / Khata */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 min-w-0">
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={selectedCustomer ? `${selectedCustomer.name}` : walkinName}
                onChange={(e) => {
                  if (selectedCustomer) setSelectedCustomer(null);
                  setWalkinName(e.target.value);
                }}
                placeholder="Patient Name / Khata"
                className="bg-transparent text-xs font-semibold w-full min-w-0 outline-none text-slate-800 dark:text-slate-200 truncate"
              />
              <button
                type="button"
                onClick={() => {
                  setRepeatSearchTerm('');
                  setIsCustomerModalOpen(true);
                }}
                title="Search Customer Directory"
                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0 hover:underline px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60"
              >
                Find
              </button>
            </div>

            {/* Prescribing Doctor */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 min-w-0">
              <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Dr. Reference"
                className="bg-transparent text-xs font-semibold w-full min-w-0 outline-none text-slate-800 dark:text-slate-200 truncate"
              />
            </div>
          </div>

          {/* Row 2: 4 Action Buttons (1-Click Membership, Repeat Last Order, Hold Current Bill, Parked Bills) */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* 1-Click Membership */}
            <button
              type="button"
              onClick={() => {
                setQuickEnrollName(selectedCustomer ? selectedCustomer.name : (walkinName !== 'Walk-in Cash Customer' ? walkinName : ''));
                setQuickEnrollPhone(currentActivePhone);
                setIsQuickEnrollOpen(true);
              }}
              title="1-Click Membership"
              className="flex items-center justify-center gap-1 py-2 px-1 rounded-lg bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-bold shadow-xs transition-colors"
            >
              <Crown className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span className="truncate">Membership</span>
            </button>

            {/* Repeat Last Order */}
            <button
              type="button"
              onClick={() => {
                setRepeatSearchTerm('');
                setIsCustomerModalOpen(true);
              }}
              title="Repeat Last Order"
              className="flex items-center justify-center gap-1 py-2 px-1 rounded-lg bg-purple-700 active:bg-purple-800 text-white text-[11px] font-bold shadow-xs transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Repeat</span>
            </button>

            {/* F5 Hold */}
            <button
              type="button"
              onClick={handleHoldCurrentBill}
              title="Hold active bill"
              className="flex items-center justify-center gap-1 py-2 px-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 active:bg-amber-100 text-amber-800 dark:text-amber-300 text-[11px] font-bold shadow-xs transition-colors"
            >
              <PauseCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Hold</span>
            </button>

            {/* F6 Parked Bills */}
            <button
              type="button"
              onClick={() => setIsHeldModalOpen(true)}
              title="View parked bills"
              className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg border text-[11px] font-bold shadow-xs transition-colors ${
                heldBills.length > 0
                  ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 active:bg-blue-100'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:bg-slate-100'
              }`}
            >
              <PlayCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Parked ({heldBills.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Khata & Repeat Order Ribbon (When customer is selected) */}
      {selectedCustomer && (
        <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse shrink-0" />
            <span className="font-bold text-purple-900 dark:text-purple-300 break-words">
              Khata: {selectedCustomer.name} ({selectedCustomer.phone})
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              Due: <strong className="text-rose-600 font-bold">₹{selectedCustomer.currentDue.toFixed(2)}</strong>
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              Limit: ₹{selectedCustomer.creditLimit}
            </span>
          </div>

          <button
            onClick={() => openRepeatOrderForCustomer(selectedCustomer)}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Load Last Order ({selectedCustomer.name})</span>
          </button>
        </div>
      )}

      {/* Customer Membership & Loyalty Ribbon */}
      {currentMember ? (
        <div className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs ${
          isMemberDiscountActive
            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
            : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`h-6 w-6 rounded-md flex items-center justify-center font-bold text-white shadow-xs ${
              memberTierInfo.tier === '20%' ? 'bg-purple-700' : 'bg-emerald-700'
            }`}>
              <Crown className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
              {currentMember.membershipId}
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              • {currentMember.customerName}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              currentMemberExpiryInfo?.isExpired
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                : currentMemberExpiryInfo?.computedStatus === 'SUSPENDED'
                ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                : memberTierInfo.tier === '20%'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            }`}>
              {currentMemberExpiryInfo?.statusLabel} {isMemberDiscountActive ? `— ${memberTierInfo.percent}% Discount` : ''}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              | Preceding 3-Mo Net: <strong>{formatINR(customerPurchaseAgg.rollingPurchases)}</strong>
              {customerPurchaseAgg.rollingPurchases < membershipSettings.purchaseThreshold ? ` (${formatINR(memberTierInfo.amountNeededForHigherTier)} more for 20%)` : ' (20% Top Tier ★)'}
            </span>
            <span className="text-slate-400 text-[11px]">
              (Valid till: {currentMember.expiryDate})
            </span>
          </div>

          {membershipDiscountAmount > 0 && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded border border-emerald-400 dark:border-emerald-700 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                Member Savings on Bill:
              </span>
              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                -{formatINR(membershipDiscountAmount)}
              </span>
            </div>
          )}
        </div>
      ) : cart.some((it) => it.itemCategory === 'MEMBERSHIP') ? (
        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-medium">
            <Crown className="h-4 w-4 text-amber-500 shrink-0" />
            <span>
              <strong>Membership Service in Cart:</strong> Instant 10% loyalty discount active on all eligible medicines in this bill!
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setQuickEnrollName(selectedCustomer ? selectedCustomer.name : (walkinName !== 'Walk-in Cash Customer' ? walkinName : ''));
              setQuickEnrollPhone(currentActivePhone);
              setIsQuickEnrollOpen(true);
            }}
            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors shrink-0"
          >
            <Crown className="h-3.5 w-3.5 text-amber-300" />
            <span>Modify Membership</span>
          </button>
        </div>
      ) : null}

      {quickEnrollSuccessMsg && (
        <div className="p-2 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{quickEnrollSuccessMsg}</span>
        </div>
      )}

      {/* 2. Fast-Selling OTC Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Fast OTC:</span>
        {fastOTCList.map((med) => (
          <button
            key={med.id}
            onClick={() => handleSelectMedicine(med)}
            className="shrink-0 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1"
          >
            <span>+ {med.name}</span>
            <span className="font-mono text-[10px] text-slate-400 font-normal">(₹{med.batches[0]?.mrp || 0})</span>
          </button>
        ))}
      </div>

      {/* 3. Main Billing Spreadsheet Table (Desktop Only - Strictly Preserved for Large Screens) */}
      <div className="hidden xl:block bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto min-h-[340px] max-h-[460px] overflow-y-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th className="w-8 text-center">#</th>
                <th>Medicine Brand & Composition</th>
                <th>Batch No</th>
                <th>Expiry</th>
                <th>Rack</th>
                <th className="text-center w-44">Billing Mode & Qty</th>
                <th className="text-right">Strip MRP</th>
                <th className="text-right">Rate / Unit (₹)</th>
                <th className="text-center w-16">Disc %</th>
                <th className="text-center">GST %</th>
                <th className="text-right">Net Total (₹)</th>
                <th className="text-center w-10">Del</th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-slate-400">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-xs">Counter Billing Cart is Empty</p>
                    <p className="text-[11px] flex items-center justify-center gap-1.5 flex-wrap">
                      <span>Press</span>
                      <kbd className="kbd-shortcut">Shift+M</kbd>
                      <span>or</span>
                      <kbd className="kbd-shortcut">Shift+F2</kbd>
                      <span>to search medical, or</span>
                      <kbd className="kbd-shortcut">Shift+C</kbd>
                      <span>to search customer.</span>
                    </p>
                  </td>
                </tr>
              ) : (
                cart.map((item, index) => {
                  const isLoose = item.unitType === 'LOOSE';
                  const packCount = item.unitsPerPack || 10;
                  const isMembership = item.itemCategory === 'MEMBERSHIP';

                  if (isMembership) {
                    return (
                      <tr
                        key={item.id}
                        className="bg-amber-50/60 dark:bg-amber-950/30 border-l-4 border-amber-500"
                      >
                        <td className="text-center font-mono text-amber-700 dark:text-amber-400 font-bold">
                          {index + 1}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              {item.medicineName}
                            </p>
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold text-[9px] border border-amber-300 dark:border-amber-700">
                              PAID SERVICE
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                            Member: <strong>{item.membershipDetails?.customerName || walkinName}</strong> ({item.membershipDetails?.customerPhone || walkinPhone}) • Duration: {item.membershipDetails?.durationLabel || '12 Months'}
                          </p>
                        </td>
                        <td className="font-mono text-amber-800 dark:text-amber-300 font-bold text-xs">
                          {item.batchNumber}
                        </td>
                        <td className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                          {item.expiryDate}
                        </td>
                        <td className="font-mono text-slate-400 text-[11px]">
                          {item.hsnCode || '998319'}
                        </td>

                        {/* Quantity: Fixed 1 Service */}
                        <td className="text-center">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 font-mono font-bold text-xs text-amber-800 dark:text-amber-300 shadow-xs">
                            1 Service
                          </span>
                        </td>

                        <td className="text-right font-mono text-slate-500">₹{item.mrp.toFixed(2)}</td>
                        <td className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          <div>₹{item.rate.toFixed(2)}</div>
                          <span className="text-[9px] font-normal text-slate-400">Fixed Fee</span>
                        </td>

                        {/* Line Discount: 0% */}
                        <td className="text-center font-mono text-xs text-slate-400">
                          0%
                        </td>

                        <td className="text-center font-mono text-slate-500">0%</td>

                        <td className="text-right font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                          ₹{item.totalAmount.toFixed(2)}
                        </td>

                        {/* Remove Service from Bill */}
                        <td className="text-center">
                          <button
                            onClick={() => removeItemFromCart(index)}
                            title="Remove membership service from current bill"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={item.id} className={isLoose ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''}>
                      <td className="text-center font-mono text-slate-400">{index + 1}</td>
                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{item.medicineName}</p>
                          {isLoose && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold text-[9px] border border-purple-300 dark:border-purple-700">
                              Cut-Strip ({item.quantity} Tabs)
                            </span>
                          )}
                          {isMemberDiscountActive && (
                            <button
                              type="button"
                              onClick={() => toggleItemMemberDiscount(index)}
                              title={item.isMemberDiscountEligible !== false ? 'Loyalty Disc Applied (Click to deselect)' : 'Excluded from Loyalty Disc (Click to include)'}
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono transition-all ${
                                item.isMemberDiscountEligible !== false
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200 line-through'
                              }`}
                            >
                              {item.isMemberDiscountEligible !== false ? 'Disc: YES' : 'Disc: EXCLUDED'}
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {item.genericName} • {packCount > 1 ? `Pack: ${packCount} Tab/Strip` : '1 Unit'}
                        </p>
                      </td>
                      <td className="font-mono">
                        <button
                          type="button"
                          onClick={() => handleOpenBatchSwitchForCartItem(index)}
                          title="Click to manually choose a different batch"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 font-mono font-bold text-xs transition-colors cursor-pointer group"
                        >
                          <span>{item.batchNumber}</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-emerald-500 font-sans underline">change</span>
                        </button>
                      </td>
                      <td className="font-mono text-slate-500 text-[11px]">{item.expiryDate}</td>
                      <td className="font-mono text-slate-400 text-[11px]">{item.hsnCode}</td>

                      {/* Billing Mode & Quantity Selector (Strip vs Loose Tab) */}
                      <td className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {/* Unit Mode Switcher Pill */}
                          {packCount > 1 && (
                            <div className="inline-flex rounded p-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => toggleItemUnitType(index, 'STRIP')}
                                className={`px-2 py-0.5 rounded transition-all ${
                                  !isLoose
                                    ? 'bg-emerald-700 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                              >
                                Strip
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleItemUnitType(index, 'LOOSE')}
                                className={`px-2 py-0.5 rounded transition-all ${
                                  isLoose
                                    ? 'bg-purple-700 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                              >
                                Loose Tab
                              </button>
                            </div>
                          )}

                          {/* Quantity Counter */}
                          <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 shadow-inner">
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(index, item.quantity - 1)}
                              className="px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-12 text-center font-mono font-bold text-xs bg-transparent outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(index, item.quantity + 1)}
                              className="px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 font-bold"
                            >
                              +
                            </button>
                          </div>

                          <span className="text-[10px] font-mono text-slate-500">
                            {isLoose ? `${item.quantity} Loose Tabs` : `${item.quantity} Full Strips`}
                          </span>
                        </div>
                      </td>

                      <td className="text-right font-mono text-slate-500">₹{item.mrp.toFixed(2)}</td>
                      <td className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        <div>₹{item.rate.toFixed(2)}</div>
                        <span className="text-[9px] font-normal text-slate-400">
                          per {isLoose ? 'Tab' : 'Strip'}
                        </span>
                      </td>

                      {/* Line Discount */}
                      <td className="text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => updateItemDiscount(index, parseFloat(e.target.value) || 0)}
                          className="w-12 text-center font-mono text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 py-0.5"
                        />
                      </td>

                      <td className="text-center font-mono text-slate-500">{item.gstRate}%</td>

                      <td className="text-right font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                        ₹{item.totalAmount.toFixed(2)}
                      </td>

                      {/* Remove Medicine from Bill */}
                      <td className="text-center">
                        <button
                          onClick={() => removeItemFromCart(index)}
                          title="Remove medicine from current bill"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Bottom Running Bill Summary & Checkout Ribbon (Strict Single-Line Layout) */}
        <div className="bg-slate-100 dark:bg-slate-950 border-t border-slate-300 dark:border-slate-800 px-3 py-2 flex items-center justify-between gap-2.5 md:gap-3 overflow-x-auto whitespace-nowrap min-w-0">
          {/* Left Side: Summary Metrics & Bill Discount */}
          <div className="flex items-center gap-2.5 md:gap-3 text-xs shrink-0">
            <div className="shrink-0">
              <span className="text-[9px] uppercase text-slate-400 font-bold block leading-tight">Total Formulations / Units</span>
              <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                {cart.length} Items ({cart.reduce((s, i) => s + i.quantity, 0)} Units/Strips)
              </span>
            </div>

            <div className="shrink-0 border-l border-slate-200 dark:border-slate-800 pl-2.5 md:pl-3">
              <span className="text-[9px] uppercase text-slate-400 font-bold block leading-tight">Gross Amount</span>
              <span className="font-mono font-semibold text-xs text-slate-700 dark:text-slate-300">
                ₹{grossTotal.toFixed(2)}
              </span>
            </div>

            <div className="shrink-0 border-l border-slate-200 dark:border-slate-800 pl-2.5 md:pl-3">
              <span className="text-[9px] uppercase text-slate-400 font-bold block leading-tight">GST Tax</span>
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                ₹{totalTax.toFixed(2)}
              </span>
            </div>

            {membershipDiscountAmount > 0 && (
              <div className="flex items-center gap-1.5 border-l border-emerald-300 dark:border-emerald-700 pl-2.5 md:pl-3 shrink-0">
                <Crown className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[9px] uppercase text-emerald-700 dark:text-emerald-400 font-bold block leading-tight">
                    Member Disc ({effectiveMemberDiscountPercent}%):
                  </span>
                  <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-400">
                    -₹{membershipDiscountAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {!currentMember && !cart.some((it) => it.itemCategory === 'MEMBERSHIP') && (
              <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-2.5 md:pl-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setQuickEnrollName(selectedCustomer ? selectedCustomer.name : (walkinName !== 'Walk-in Cash Customer' ? walkinName : ''));
                    setQuickEnrollPhone(currentActivePhone);
                    setIsQuickEnrollOpen(true);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:underline transition-colors"
                  title="1-Click Customer Loyalty Membership"
                >
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  <span>1-Click Member</span>
                </button>
              </div>
            )}

            {/* Bill Level Discount */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-2.5 md:pl-3 shrink-0">
              <span className="text-[9px] uppercase text-slate-500 font-bold">Bill Disc %:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={overallDiscountPercent}
                onChange={(e) => setOverallDiscountPercent(parseFloat(e.target.value) || 0)}
                className="w-11 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold text-center"
              />
            </div>
          </div>

          {/* Right Side: Grand Total & Instant Single-Line Checkout Actions */}
          <div className="flex items-center gap-2.5 shrink-0 ml-auto pl-2">
            <div className="text-right shrink-0">
              <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block leading-tight">
                Net Payable (Round Off {roundOff >= 0 ? `+${roundOff}` : roundOff})
              </span>
              <span className="font-mono text-lg md:text-xl font-black text-emerald-700 dark:text-emerald-400 leading-none">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleClearCart}
              disabled={cart.length === 0}
              className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold disabled:opacity-40 shrink-0 whitespace-nowrap transition-colors"
            >
              F8 Clear
            </button>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs md:text-sm flex items-center gap-1.5 shadow-sm disabled:opacity-40 shrink-0 whitespace-nowrap transition-colors"
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span>Shift+F4 Collect & Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. DEDICATED MOBILE & TABLET CART VIEW (Zero Horizontal Scroll Needed!)
         ========================================================================= */}
      <div className="xl:hidden space-y-2.5 pb-40">
        {cart.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 shadow-xs">
            <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30 text-emerald-600" />
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Billing Cart is Empty</p>
            <p className="text-xs text-slate-500 mt-1">Search medicine above or tap fast OTC pills to add items.</p>
          </div>
        ) : (
          cart.map((item, index) => {
            const isLoose = item.unitType === 'LOOSE';
            const packCount = item.unitsPerPack || 10;
            const isMembership = item.itemCategory === 'MEMBERSHIP';

            if (isMembership) {
              return (
                <div
                  key={item.id}
                  className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-3 shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                        <Crown className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{item.medicineName}</p>
                        <p className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold">
                          PAID SERVICE • {item.membershipDetails?.durationLabel || '12 Months'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItemFromCart(index)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-amber-200 dark:border-amber-900 text-xs font-mono font-bold">
                    <span className="text-slate-500">Fixed Fee:</span>
                    <span className="text-amber-700 dark:text-amber-400 font-black text-sm">
                      ₹{item.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5"
              >
                {/* Header: Item Index, Brand Name, Salt & Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400">
                        #{index + 1}
                      </span>
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {item.medicineName}
                      </p>
                      {isLoose && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold text-[9px] border border-purple-300 dark:border-purple-800">
                          Loose Tab
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {item.genericName} • Batch:{' '}
                      <button
                        type="button"
                        onClick={() => handleOpenBatchSwitchForCartItem(index)}
                        className="font-mono font-bold text-slate-800 dark:text-slate-200 underline decoration-slate-400 hover:text-emerald-600"
                        title="Click to switch batch"
                      >
                        {item.batchNumber} ✎
                      </button>{' '}
                      ({item.expiryDate})
                    </p>
                  </div>
                  <button
                    onClick={() => removeItemFromCart(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Middle: Mode Switcher & Quantity Counter */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {/* Mode Selector */}
                  {packCount > 1 ? (
                    <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => toggleItemUnitType(index, 'STRIP')}
                        className={`px-2 py-1 rounded-md transition-all ${
                          !isLoose ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Strip
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleItemUnitType(index, 'LOOSE')}
                        className={`px-2 py-1 rounded-md transition-all ${
                          isLoose ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Tab
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">1 Unit/Pack</span>
                  )}

                  {/* Touch Quantity Counter with Big Touch Targets */}
                  <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 shadow-inner overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(index, item.quantity - 1)}
                      className="h-8 w-8 flex items-center justify-center font-black text-base text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                      className="w-12 text-center font-mono font-bold text-xs bg-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(index, item.quantity + 1)}
                      className="h-8 w-8 flex items-center justify-center font-black text-base text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Bottom: Rate per Unit & Net Line Total */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="text-[11px] text-slate-500 font-mono">
                    <span>₹{item.rate.toFixed(2)}/{isLoose ? 'tab' : 'strip'}</span>
                    {item.discountPercent > 0 && (
                      <span className="text-amber-600 font-bold ml-1.5">({item.discountPercent}% off)</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 mr-1.5 font-medium">Net:</span>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                      ₹{item.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Running Bill Checkout Summary Card (Zero Horizontal Scroll!) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Total Items ({cart.length}):</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              ₹{grossTotal.toFixed(2)}
            </span>
          </div>
          {membershipDiscountAmount > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold">
              <span>Member Savings ({effectiveMemberDiscountPercent}%):</span>
              <span className="font-mono">-₹{membershipDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>GST Tax (CGST+SGST):</span>
            <span className="font-mono font-semibold">₹{totalTax.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">Net Payable:</span>
            <span className="font-mono font-black text-lg text-emerald-700 dark:text-emerald-400">
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleClearCart}
              disabled={cart.length === 0}
              className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold disabled:opacity-40"
            >
              Clear Cart
            </button>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className={`py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md ${
                cart.length > 0 ? 'bg-emerald-700 hover:bg-emerald-800 active:scale-95' : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              <Printer className="h-4 w-4" />
              <span>Collect &amp; Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. STICKY MOBILE BOTTOM CHECKOUT DOCK (Speed & 1-Tap Checkout)
          Visible only on mobile/tablet viewports (< xl: 1280px)
         ========================================================================= */}
      {cart.length > 0 && (
        <aside aria-label="Mobile Checkout Dock" className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-2.5 px-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
          <div className="max-w-2xl mx-auto space-y-2">
            {/* Top Row: Cart quick stats & Grand Total */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase">
                  {cart.length} {cart.length === 1 ? 'Med' : 'Meds'} • {totalUnitsInCart} Qty
                </span>
                {effectiveMemberDiscountPercent > 0 && (
                  <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {effectiveMemberDiscountPercent}% Off
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Net Payable</span>
                <span className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-400 leading-tight">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Payment Mode Selector Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'UPI', label: 'UPI / QR', icon: IndianRupee },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'CREDIT', label: 'Khata Due', icon: BookOpen },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(m.id as any);
                      if (m.id === 'CASH' && !cashTendered) {
                        setCashTendered(Math.ceil(grandTotal).toString());
                      }
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all ${
                      active
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cash Denominations & Change indicator (if Cash selected) */}
            {paymentMode === 'CASH' && (
              <div className="flex items-center justify-between gap-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Tender:</span>
                  {quickCashOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCashTendered(opt.toString())}
                      className={`px-2 py-0.5 text-[11px] rounded font-mono font-bold shrink-0 ${
                        cashTendered === opt.toString()
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {opt === Math.ceil(grandTotal) ? `Exact (₹${opt})` : `₹${opt}`}
                    </button>
                  ))}
                </div>
                {parseFloat(cashTendered) > grandTotal && (
                  <div className="shrink-0 text-right font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-black">
                    Return: ₹{changeDue.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {/* Action Row: Clear Cart + 1-Tap Pay & Collect */}
            <div className="grid grid-cols-4 gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleClearCart}
                className="col-span-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-xs font-bold"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="col-span-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Printer className="h-4 w-4" />
                <span>Pay ₹{grandTotal.toFixed(2)} &amp; Print (Shift+F4)</span>
              </button>
            </div>
          </div>
        </aside>
      )}



      {/* MODAL 1: REPEAT & CUSTOMIZE PATIENT'S LAST ORDER */}
      <Modal
        isOpen={repeatOrderModalOpen}
        onClose={() => {
          setRepeatOrderModalOpen(false);
          searchInputRef.current?.focus();
        }}
        title={selectedCustomer ? `Repeat Last Order: ${selectedCustomer.name}` : 'Repeat Last Order'}
        subtitle="Full keyboard controls: [Space] toggle, [C] switch Cut-Strip/Loose mode, [Enter] load directly to cart"
        maxWidth="4xl"
      >
        <div className="space-y-3">
          {/* Desktop Repeat Order Table (md: and up) */}
          <div className="hidden md:block border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto shadow-xs">
            <table className="erp-table w-full table-fixed">
              <thead>
                <tr>
                  <th className="w-10 text-center">Pick</th>
                  <th className="w-[32%] text-left">Medicine Formulation</th>
                  <th className="w-[15%] text-left">Batch No</th>
                  <th className="w-[25%] text-center">Mode & Quantity</th>
                  <th className="w-[14%] text-right">Rate (₹)</th>
                  <th className="w-[14%] text-right">Amount (₹)</th>
                  <th className="w-10 text-center">Del</th>
                </tr>
              </thead>
              <tbody>
                {repeatItems.map((item, idx) => {
                  const isHighlighted = idx === repeatHighlightedIndex;
                  const isLoose = item.unitType === 'LOOSE';
                  const packCount = item.unitsPerPack || 10;

                  return (
                    <tr
                      key={idx}
                      ref={isHighlighted ? repeatActiveRowRef : undefined}
                      onMouseEnter={() => setRepeatHighlightedIndex(idx)}
                      className={`transition-colors ${
                        !item.isSelected
                          ? 'opacity-40 bg-slate-100/60 dark:bg-slate-900/60'
                          : isHighlighted
                          ? 'bg-emerald-100/95 dark:bg-emerald-950/80 border-l-4 border-l-emerald-600 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Include Checkbox */}
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={item.isSelected}
                          onChange={() => handleToggleRepeatItem(idx)}
                          className="h-4 w-4 rounded text-emerald-700 cursor-pointer"
                        />
                      </td>

                      <td className="truncate">
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                          {item.medicineName}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {item.genericName} • {packCount > 1 ? `Pack: ${packCount} Tab` : '1 Unit'}
                        </p>
                      </td>

                      <td className="font-mono text-slate-600 text-xs truncate font-semibold">
                        {item.batchNumber}
                      </td>

                      {/* Mode & Quantity (Cut-Strip Toggle via 'C' or Click) */}
                      <td className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {/* Unit Mode Pill */}
                          {packCount > 1 && (
                            <div className="inline-flex rounded p-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[9px] font-bold">
                              <button
                                type="button"
                                onClick={() => toggleRepeatItemUnitType(idx)}
                                className={`px-1.5 py-0.5 rounded transition-all ${
                                  !isLoose
                                    ? 'bg-emerald-700 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                Strip
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleRepeatItemUnitType(idx)}
                                className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 ${
                                  isLoose
                                    ? 'bg-purple-700 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                <span>Loose</span>
                                <kbd className="text-[7px] bg-black/20 px-0.5 rounded font-mono">C</kbd>
                              </button>
                            </div>
                          )}

                          {/* Quantity Selector */}
                          <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 shadow-inner">
                            <button
                              type="button"
                              onClick={() => handleUpdateRepeatQuantity(idx, item.quantity - 1)}
                              className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateRepeatQuantity(idx, parseInt(e.target.value) || 1)}
                              className="w-10 text-center font-mono font-bold text-xs bg-transparent outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateRepeatQuantity(idx, item.quantity + 1)}
                              className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">
                            {isLoose ? `${item.quantity} Tabs` : `${item.quantity} Strips`}
                          </span>
                        </div>
                      </td>

                      <td className="text-right font-mono font-semibold text-xs">
                        <div>₹{item.rate.toFixed(2)}</div>
                        <span className="text-[9px] text-slate-400 font-normal">
                          per {isLoose ? 'Tab' : 'Strip'}
                        </span>
                      </td>

                      <td className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        ₹{(item.rate * item.quantity).toFixed(2)}
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRepeatItem(idx)}
                          title="Remove item"
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Repeat Order Card List (md:hidden) */}
          <div className="md:hidden space-y-2 max-h-80 overflow-y-auto">
            {repeatItems.map((item, idx) => {
              const isLoose = item.unitType === 'LOOSE';
              const packCount = item.unitsPerPack || 10;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    !item.isSelected
                      ? 'opacity-50 bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                      : 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.isSelected}
                        onChange={() => handleToggleRepeatItem(idx)}
                        className="mt-0.5 h-4 w-4 rounded text-emerald-700 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {item.medicineName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Batch: {item.batchNumber} • Rate: ₹{item.rate.toFixed(2)}
                        </p>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveRepeatItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {/* Unit Switcher */}
                    {packCount > 1 ? (
                      <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => toggleRepeatItemUnitType(idx)}
                          className={`px-2 py-0.5 rounded transition-all ${
                            !isLoose ? 'bg-emerald-700 text-white' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Strip
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRepeatItemUnitType(idx)}
                          className={`px-2 py-0.5 rounded transition-all ${
                            isLoose ? 'bg-purple-700 text-white' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Tab
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400">1 Unit</span>
                    )}

                    {/* Quantity Counter */}
                    <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-inner">
                      <button
                        type="button"
                        onClick={() => handleUpdateRepeatQuantity(idx, item.quantity - 1)}
                        className="px-2.5 py-0.5 text-xs font-bold text-slate-600"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateRepeatQuantity(idx, parseInt(e.target.value) || 1)}
                        className="w-10 text-center font-mono font-bold text-xs bg-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateRepeatQuantity(idx, item.quantity + 1)}
                        className="px-2.5 py-0.5 text-xs font-bold text-slate-600"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-400">
                      ₹{(item.rate * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Repeat Order Summary Box */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              Selected to Re-order: <strong>{repeatItems.filter((i) => i.isSelected).length} of {repeatItems.length} Medicines</strong>
            </span>
            <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
              Est. Total: ₹{repeatItems.filter((i) => i.isSelected).reduce((s, i) => s + i.rate * i.quantity, 0).toFixed(2)}
            </span>
          </div>

          {/* Action Buttons & Instant Keyboard Load */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setRepeatOrderModalOpen(false);
                searchInputRef.current?.focus();
              }}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel (Esc)
            </button>
            <button
              type="button"
              onClick={handleLoadRepeatOrderToCart}
              className="flex-2 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
            >
              <span>Load into Billing Cart (Fully Editable)</span>
              <kbd className="bg-black/25 px-1.5 py-0.5 rounded font-mono text-[10px]">↵ Enter</kbd>
            </button>
          </div>

          {/* Keyboard Helper Footer */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-2 rounded-lg text-center text-[10.5px] text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">
            <kbd className="kbd-shortcut">↑ / ↓</kbd> Move • <kbd className="kbd-shortcut">Space</kbd> Pick/Unpick • <kbd className="kbd-shortcut">C</kbd> Toggle Cut-Strip • <kbd className="kbd-shortcut">+ / -</kbd> Qty • <kbd className="kbd-shortcut">↵ Enter</kbd> Load Cart • <kbd className="kbd-shortcut">Esc</kbd> Cancel
          </div>
        </div>
      </Modal>

      {/* MODAL 2: FIFO / FEFO Batch Selection */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setEditingCartItemIndex(null);
          searchInputRef.current?.focus();
        }}
        title={
          editingCartItemIndex !== null && selectedMed
            ? `Switch Batch: ${selectedMed.name}`
            : selectedMed
            ? `Select Batch: ${selectedMed.name}`
            : 'Select Batch'
        }
        subtitle={
          editingCartItemIndex !== null
            ? `Currently active: Batch ${cart[editingCartItemIndex]?.batchNumber} • Select replacement batch below`
            : 'Batches sorted automatically by FEFO (First-Expiry-First-Out) • Use [↑/↓] or [1-9] to pick'
        }
        maxWidth="lg"
      >
        {selectedMed && (
          <div className="space-y-3">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded p-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                Formula: <strong>{selectedMed.genericName}</strong> • {selectedMed.packSize}
              </span>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                Total Stock: <strong>{selectedMed.totalStock} units</strong>
              </span>
            </div>

            <div className="overflow-y-auto max-h-80">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th className="w-10 text-center">Key</th>
                    <th>Batch No</th>
                    <th>Expiry Date</th>
                    <th>Rack Location</th>
                    <th className="text-center">Available Stock</th>
                    <th className="text-right">Cost (₹)</th>
                    <th className="text-right">MRP / Sale Rate</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMed.batches.map((batch, bIdx) => {
                    const isHighlighted = bIdx === batchHighlightedIndex;
                    return (
                      <tr
                        key={batch.id}
                        ref={isHighlighted ? batchActiveRowRef : undefined}
                        onMouseEnter={() => setBatchHighlightedIndex(bIdx)}
                        onClick={() => handleBatchSelect(selectedMed, batch)}
                        className={`cursor-pointer transition-colors ${
                          isHighlighted
                            ? 'bg-emerald-100/90 dark:bg-emerald-950/70 border-l-4 border-l-emerald-600 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <td className="text-center">
                          <kbd
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                              isHighlighted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {bIdx + 1}
                          </kbd>
                        </td>
                        <td className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {batch.batchNumber}
                        </td>
                        <td className="font-mono font-semibold">
                          <span
                            className={
                              batch.status === 'NEAR_EXPIRY'
                                ? 'text-orange-600 dark:text-orange-400'
                                : batch.status === 'EXPIRED'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }
                          >
                            {batch.expiryDate} {batch.status === 'NEAR_EXPIRY' && '(Near Expiry)'}
                          </span>
                        </td>
                        <td className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                          📍 {batch.rackLocation}
                        </td>
                        <td className="text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              batch.availableQuantity <= 10
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {batch.availableQuantity}
                          </span>
                        </td>
                        <td className="text-right font-mono text-slate-500 dark:text-slate-400">₹{batch.purchaseRate}</td>
                        <td className="text-right font-mono font-black text-emerald-700 dark:text-emerald-400">
                          ₹{batch.saleRate || batch.mrp}
                        </td>
                        <td className="text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBatchSelect(selectedMed, batch);
                            }}
                            disabled={batch.availableQuantity <= 0}
                            className={`px-3 py-1 rounded font-bold text-xs shadow-xs ${
                              isHighlighted
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white ring-2 ring-emerald-400'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            } disabled:opacity-30`}
                          >
                            Select (↵)
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Payment Checkout, Split Payment & Khata Credit Manager */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Complete Payment & Print Bill"
        subtitle={`Invoice Net Amount: ₹${grandTotal.toFixed(2)}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Bill Summary Breakdown & Loyalty Discount */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Gross Items Subtotal ({cart.length} items):</span>
              <span className="font-mono font-semibold">₹{grossTotal.toFixed(2)}</span>
            </div>

            {lineDiscounts + billDiscountAmount > 0 && (
              <div className="flex justify-between items-center text-amber-700 dark:text-amber-400">
                <span>Standard Line / Bill Discount:</span>
                <span className="font-mono font-semibold">-₹{(lineDiscounts + billDiscountAmount).toFixed(2)}</span>
              </div>
            )}

            {membershipDiscountAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <span className="flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-emerald-600" />
                  <span>
                    Member Loyalty Discount ({effectiveMemberDiscountPercent}% — {memberTierInfo.summaryLabel}):
                  </span>
                </span>
                <span className="font-mono font-black text-sm">-₹{membershipDiscountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Total GST (CGST + SGST):</span>
              <span className="font-mono font-semibold">₹{totalTax.toFixed(2)}</span>
            </div>

            {roundOff !== 0 && (
              <div className="flex justify-between items-center text-slate-500 text-[11px]">
                <span>Round Off:</span>
                <span className="font-mono">
                  {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 font-bold">
              <span className="text-slate-900 dark:text-slate-100 text-sm">Net Payable by Patient:</span>
              <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Mode Selection */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {[
              { id: 'CASH', label: 'Cash', icon: Banknote },
              { id: 'UPI', label: 'UPI', icon: IndianRupee },
              { id: 'SPLIT', label: 'Split (Cash+UPI)', icon: Layers },
              { id: 'CARD', label: 'Card', icon: CreditCard },
              { id: 'CREDIT', label: 'Credit / Khata', icon: BookOpen },
              { id: 'POS_TERMINAL', label: 'Pine Labs POS Terminal', icon: SmartphoneNfc },
            ].map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setPaymentMode(mode.id as any)}
                  className={`p-2 rounded-lg border text-center font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                    paymentMode === mode.id
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] leading-tight text-center">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mode 1: CASH */}
          {paymentMode === 'CASH' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span>Total Bill Amount:</span>
                <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100">₹{grandTotal.toFixed(2)}</span>
              </div>
              <div>
                <label className="text-[11px] font-bold block mb-1">Cash Tendered by Patient (₹)</label>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder="Enter cash received (e.g. 500)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold bg-white dark:bg-slate-900"
                />
              </div>

              {/* Quick Cash Tender Denomination Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickCashOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCashTendered(opt.toString())}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-all ${
                      cashTendered === opt.toString()
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500'
                    }`}
                  >
                    {opt === Math.ceil(grandTotal) ? `Exact (₹${opt})` : `₹${opt}`}
                  </button>
                ))}
              </div>
              {parseFloat(cashTendered) > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Change to Return:</span>
                  <span className="font-mono text-base font-black text-emerald-600">₹{changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: UPI */}
          {paymentMode === 'UPI' && (
            <div className="p-5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-300 dark:border-emerald-700 flex flex-col items-center text-center space-y-3">
              <div className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-mono text-lg font-black shadow-xs">
                UPI Total: ₹{grandTotal.toFixed(2)}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Collect via Counter / Personal UPI</p>
                <span className="text-[11px] font-mono text-slate-500 bg-white dark:bg-slate-900 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-800 inline-block font-semibold">
                  Payment Mode: UPI
                </span>
              </div>
            </div>
          )}

          {/* Mode 3: SPLIT (Cash + UPI) */}
          {paymentMode === 'SPLIT' && (
            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 text-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-purple-200 dark:border-purple-800">
                <span className="font-black text-purple-950 dark:text-purple-200 uppercase tracking-wide">
                  Split Payment Breakdown
                </span>
                <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">
                  Total Bill: ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cash Portion Card */}
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">1. Cash Portion (₹)</span>
                    <span className="text-[10px] text-slate-400">Paid at Counter</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    value={splitCashAmount}
                    onChange={(e) => setSplitCashAmount(e.target.value)}
                    placeholder="Enter cash amount (e.g. 200)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono font-bold text-sm bg-slate-50 dark:bg-slate-800"
                  />
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Note Given by Patient (for Change):</label>
                    <input
                      type="number"
                      value={splitCashTendered}
                      onChange={(e) => setSplitCashTendered(e.target.value)}
                      placeholder="Note given (e.g. 500)"
                      className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 font-mono text-xs bg-transparent"
                    />
                  </div>
                  {splitChangeDue > 0 && (
                    <div className="pt-1 text-[11px] font-bold text-emerald-700 flex justify-between">
                      <span>Change to Return:</span>
                      <span className="font-mono">₹{splitChangeDue.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* UPI Portion Card */}
                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between text-center space-y-2">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-slate-700 dark:text-slate-300">2. Remaining UPI (₹)</span>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                      ₹{splitUpi.toFixed(2)}
                    </span>
                  </div>

                  {splitUpi > 0 ? (
                    <div className="p-3 w-full rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
                      <span className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300 block font-mono">
                        UPI: ₹{splitUpi.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Collect on Counter UPI</span>
                    </div>
                  ) : (
                    <div className="py-4 text-slate-400 text-xs font-bold">
                      Full amount covered in cash
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mode 4: CREDIT / KHATA */}
          {paymentMode === 'CREDIT' && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-300 dark:border-amber-700 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800 pb-1.5">
                <span className="font-bold text-amber-900 dark:text-amber-300 uppercase">
                  Patient Khata Account
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {selectedCustomer ? selectedCustomer.name : walkinName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Previous Khata Balance:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{existingCustomerDue.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] text-slate-400 block font-sans">This Bill Total:</span>
                  <span className="font-bold text-emerald-700">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Partial Down Payment / Cash Paid now */}
              <div>
                <label className="text-[11px] font-bold block mb-1">Partial Cash / UPI Received Now (₹)</label>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={creditDownPayment}
                  onChange={(e) => setCreditDownPayment(e.target.value)}
                  placeholder="0 (Full Credit)"
                  className="w-full px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-700 font-mono font-bold text-xs bg-white dark:bg-slate-900"
                />
              </div>

              <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex justify-between items-center">
                <span className="font-bold text-rose-800 dark:text-rose-300">
                  New Total Outstanding Khata Due:
                </span>
                <span className="font-mono font-black text-rose-700 dark:text-rose-400 text-sm">
                  ₹{totalAfterThisBillDue.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Mode 5: PINE LABS POS TERMINAL */}
          {paymentMode === 'POS_TERMINAL' && (
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3.5 shadow-xl">
              {/* Terminal Header & Device Meta */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-inner">
                    <SmartphoneNfc className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black tracking-wide uppercase text-slate-100">
                        Pine Labs POS Terminal
                      </h4>
                      {((settings.posTerminalBaseUrl || '').includes('ngrok') || (settings.posTerminalBaseUrl || '').startsWith('https://')) ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-950/80 text-sky-400 border border-sky-800 flex items-center gap-1">
                          <Globe className="h-2.5 w-2.5" /> Remote Ngrok
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                          Local Sim
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>ID: <strong className="text-emerald-400">{settings.posTerminalDeviceId || 'PINELABS-POS-M884'}</strong></span>
                      <span>•</span>
                      <span className="truncate max-w-[200px]" title={settings.posTerminalBaseUrl || 'http://localhost:3001'}>
                        {settings.posTerminalBaseUrl || 'http://localhost:3001'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickTerminalConfigOpen((prev) => !prev);
                      setQuickConfigMsg(null);
                    }}
                    title="Change Terminal URL or Pair Code"
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border ${
                      isQuickTerminalConfigOpen
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <SettingsIcon className="h-3 w-3" />
                    <span>{isQuickTerminalConfigOpen ? 'Close' : 'Switch / Pair'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => checkTerminalHealthStatus()}
                    disabled={isCheckingTerminalHealth}
                    title="Refresh device status"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isCheckingTerminalHealth ? 'animate-spin text-emerald-400' : ''}`} />
                  </button>

                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                      terminalHealth?.status === 'HEALTHY'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        terminalHealth?.status === 'HEALTHY' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                      }`}
                    />
                    {terminalHealth?.status === 'HEALTHY' ? 'Connected' : 'Offline'}
                  </div>
                </div>
              </div>

              {/* Quick Remote Terminal Switcher & Pairing Inline Panel */}
              {isQuickTerminalConfigOpen && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      Configure POS Terminal Endpoint
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Counter-1</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">
                        Terminal Base URL (Local or Remote Ngrok Tunnel)
                      </label>
                      <input
                        type="text"
                        value={quickTerminalUrl}
                        onChange={(e) => setQuickTerminalUrl(e.target.value)}
                        placeholder="https://xxxx.ngrok-free.dev or http://localhost:3001"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">
                          6-Digit Pairing Code (From Terminal Screen)
                        </label>
                        <input
                          type="text"
                          maxLength={8}
                          value={quickPairingCode}
                          onChange={(e) => setQuickPairingCode(e.target.value)}
                          placeholder="e.g. 800261 (or leave blank to auto-pair)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-emerald-400 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-end gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveQuickTerminalConfig}
                          disabled={isTerminalActionLoading || !quickTerminalUrl.trim()}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          Save URL
                        </button>
                        <button
                          type="button"
                          onClick={handleQuickPairWithTerminal}
                          disabled={isTerminalActionLoading}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow disabled:opacity-50"
                        >
                          {isTerminalActionLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <span>Pair Now</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {quickConfigMsg && (
                    <div
                      className={`p-2 rounded-lg text-[11px] font-medium ${
                        quickConfigMsg.type === 'success'
                          ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                          : quickConfigMsg.type === 'info'
                          ? 'bg-sky-950/70 border border-sky-800 text-sky-300'
                          : 'bg-rose-950/70 border border-rose-800 text-rose-300'
                      }`}
                    >
                      {quickConfigMsg.text}
                    </div>
                  )}
                </div>
              )}

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-medium">Configured Merchant:</span>
                  <span className="font-bold text-slate-200 truncate block text-[11px]">
                    {settings.posTerminalMerchantName || 'CarePlus Pharmacy & Wellness'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-medium">Terminal Readiness:</span>
                  <span
                    className={`font-bold text-[11px] uppercase ${
                      terminalHealth?.terminalStatus === 'READY'
                        ? 'text-emerald-400'
                        : terminalHealth?.terminalStatus === 'BUSY'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {terminalHealth?.terminalStatus || 'Checking...'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-medium">Target Invoice:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {`INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(5, '0')}`}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-medium">Payment State:</span>
                  <span
                    className={`font-mono font-black text-[11px] ${
                      terminalPaymentState === 'SUCCESS'
                        ? 'text-emerald-400'
                        : terminalPaymentState === 'PROCESSING' || terminalPaymentState === 'REQUESTED'
                        ? 'text-amber-400 animate-pulse'
                        : terminalPaymentState === 'FAILED' || terminalPaymentState === 'TIMED_OUT'
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {terminalPaymentState}
                  </span>
                </div>
              </div>

              {/* Exact Payable Amount Banner */}
              <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex justify-between items-center shadow-inner">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Payable Bill Total
                  </span>
                  <span className="text-[10px] text-slate-400">Includes all taxes, round-off & discounts</span>
                </div>
                <span className="font-mono text-xl font-black text-emerald-400">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* In-Flight Waiting / Processing Banner with Live Timer */}
              {['REQUESTED', 'PROCESSING'].includes(terminalPaymentState) && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 space-y-2.5 text-center shadow-lg">
                  <div className="flex items-center justify-center gap-2 text-amber-300 text-xs font-bold">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>
                      Waiting for Customer on POS Terminal ({terminalElapsedSeconds}s)...
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans">
                    Ask customer to tap contactless card, insert chip & PIN, or scan Bharat UPI QR on the terminal screen.
                  </p>
                  {activePaymentAttempt?.requestId && (
                    <p className="text-[9.5px] font-mono text-slate-400">
                      Req ID: {activePaymentAttempt.requestId}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleCancelTerminalPayment}
                    disabled={isTerminalActionLoading}
                    className="mt-1 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Cancel Payment on Terminal</span>
                  </button>
                </div>
              )}

              {/* Error / Failure Banner */}
              {(terminalPaymentState === 'FAILED' || terminalPaymentState === 'CANCELLED' || terminalPaymentState === 'TIMED_OUT' || terminalErrorMsg) &&
                !['REQUESTED', 'PROCESSING'].includes(terminalPaymentState) && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-700/50 text-rose-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>Terminal Notice: {terminalPaymentState}</span>
                    </div>
                    {terminalErrorMsg && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-300 pl-5">{terminalErrorMsg}</p>
                        {(terminalErrorMsg.toLowerCase().includes('token') ||
                          terminalErrorMsg.toLowerCase().includes('unauthorized') ||
                          terminalErrorMsg.toLowerCase().includes('bearer')) && (
                          <div className="pl-5 pt-1">
                            <button
                              type="button"
                              onClick={handleQuickPairWithTerminal}
                              disabled={isTerminalActionLoading}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <RefreshCw className={`h-3 w-3 ${isTerminalActionLoading ? 'animate-spin' : ''}`} />
                              <span>Auto-Fix & Re-Pair Terminal Now</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              {/* Reconciliation Notice */}
              {terminalPaymentState === 'RECONCILIATION_REQUIRED' && (
                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-600 text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Reconciliation Required</span>
                  </div>
                  <p className="text-[11px]">
                    Transaction status could not be authoritatively verified. Check simulator terminal before re-attempting.
                  </p>
                  {activePaymentAttempt?.transactionId && (
                    <button
                      type="button"
                      onClick={() =>
                        verifyAndFinalizeTerminalPayment(
                          activePaymentAttempt.transactionId!,
                          activePaymentAttempt.requestId,
                          activePaymentAttempt.invoiceNumber,
                          activePaymentAttempt.amount
                        )
                      }
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs"
                    >
                      Retry Verification Now
                    </button>
                  )}
                </div>
              )}

              {/* Primary Collect Action Button */}
              {!['REQUESTED', 'PROCESSING'].includes(terminalPaymentState) && (
                <button
                  type="button"
                  onClick={handleCollectPaymentOnTerminal}
                  disabled={isTerminalActionLoading || cart.length === 0 || grandTotal <= 0}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {isTerminalActionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Transmitting to POS Terminal...</span>
                    </>
                  ) : (
                    <>
                      <SmartphoneNfc className="h-4 w-4" />
                      <span>Collect Payment on Terminal (₹{grandTotal.toFixed(2)})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Confirm Action Button (Only for Non-Terminal Payment Modes) */}
          {paymentMode !== 'POS_TERMINAL' && (
            <button
              onClick={handleCompleteSale}
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm shadow-md transition-transform active:scale-[0.99]"
            >
              {paymentMode === 'CREDIT'
                ? `Confirm Khata Entry (Due: ₹${creditBalanceDue.toFixed(2)}) & Print Receipt`
                : paymentMode === 'SPLIT'
                ? `Confirm Split Bill (Cash: ₹${splitCash.toFixed(2)} + UPI: ₹${splitUpi.toFixed(2)}) & Print`
                : 'Confirm & Print Tax Receipt (Enter / Shift+F4)'}
            </button>
          )}
        </div>
      </Modal>

      {/* MODAL 4: Patient Khata & Repeat Order Search Directory */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          searchInputRef.current?.focus();
        }}
        title="Patient Directory, Khata Dues & Repeat Orders"
        subtitle="Spacious CRM directory to lookup patient khata, previous prescriptions, and repeat orders in 1 click"
        maxWidth="5xl"
      >
        <div className="space-y-3">
          {/* Top Control Bar: Search Input + Filter Tabs + New Patient Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                ref={customerSearchInputRef}
                type="text"
                value={repeatSearchTerm}
                onChange={(e) => setRepeatSearchTerm(e.target.value)}
                placeholder="Search patient by name, mobile number, doctor, or address..."
                className="w-full pl-9 pr-24 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                {filteredCustomers.length} Found
              </span>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setCustomerFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  customerFilter === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-emerald-700 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All Patients ({customers.length})
              </button>

              <button
                type="button"
                onClick={() => setCustomerFilter('DUE_ONLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  customerFilter === 'DUE_ONLY'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60'
                }`}
              >
                <span>Pending Khata ({totalPatientsWithDue})</span>
                <span className="font-mono text-[11px] font-black">₹{totalKhataDueAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQuickAddForm(!showQuickAddForm)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  showQuickAddForm
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <span>{showQuickAddForm ? '✕ Close Form' : '+ New Patient'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset all memberships to clean initial dataset (Rajesh, Sunita, Anand) and clean duplicate members?')) {
                    resetMemberships();
                  }
                }}
                title="Reset all memberships to initial demo members and deduplicate customer records"
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 shadow-xs"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset All Members</span>
              </button>
            </div>
          </div>

          {/* Quick Register New Patient Form (Collapsible / Expandable) */}
          {showQuickAddForm && (
            <form
              onSubmit={handleQuickAddCustomer}
              className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-300 dark:border-emerald-800 space-y-2.5 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-300">
                  + Register New Patient Profile & Auto-Attach
                </span>
                <span className="text-[10px] text-slate-500">Will be saved to permanent customer ledger</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  data-quick-add="true"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Full Name (e.g. Ramesh Patil)"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 font-semibold"
                />
                <input
                  type="tel"
                  required
                  data-quick-add="true"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="10-Digit Mobile"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  data-quick-add="true"
                  value={newCustDoctor}
                  onChange={(e) => setNewCustDoctor(e.target.value)}
                  placeholder="Doctor Name (e.g. Dr. Joshi)"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                />
                <input
                  type="number"
                  data-quick-add="true"
                  value={newCustCreditLimit}
                  onChange={(e) => setNewCustCreditLimit(parseInt(e.target.value) || 0)}
                  placeholder="Credit Limit (₹)"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddForm(false)}
                  className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
                >
                  Save & Attach to Bill (Enter)
                </button>
              </div>
            </form>
          )}

          {/* Existing Patients Khata & Repeat Table (Desktop View: md: and up) */}
          <div className="hidden md:block border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto shadow-xs">
            <table className="erp-table w-full table-fixed">
              <thead>
                <tr>
                  <th className="w-8 text-center">#</th>
                  <th className="w-[28%] text-left">PATIENT NAME & ADDRESS</th>
                  <th className="w-[16%] text-left">MOBILE</th>
                  <th className="w-[16%] text-left">PRESCRIBING DOCTOR</th>
                  <th className="w-[12%] text-right">CREDIT LIMIT</th>
                  <th className="w-[14%] text-right">PENDING KHATA DUES (₹)</th>
                  <th className="w-[14%] text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="font-bold">No matching patients found</p>
                      <p className="text-[11px] mt-0.5">Click <strong>+ New Patient</strong> above to register a new customer.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c, idx) => {
                    const isHighlighted = idx === customerHighlightedIndex;

                    return (
                      <tr
                        key={c.id}
                        ref={isHighlighted ? customerActiveRowRef : undefined}
                        onMouseEnter={() => setCustomerHighlightedIndex(idx)}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setWalkinName(c.name);
                          setWalkinPhone(c.phone);
                          if (c.doctorName) setDoctorName(c.doctorName);
                          setIsCustomerModalOpen(false);
                          searchInputRef.current?.focus();
                        }}
                        className={`cursor-pointer transition-colors ${
                          isHighlighted
                            ? 'bg-emerald-100/95 dark:bg-emerald-950/80 border-l-4 border-l-emerald-600 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {/* Index Number */}
                        <td className="text-center font-mono text-slate-400 text-xs">
                          {isHighlighted ? (
                            <span className="inline-block px-1 rounded bg-emerald-600 text-white font-black text-[9px]">
                              ►
                            </span>
                          ) : (
                            idx + 1
                          )}
                        </td>

                        {/* Patient Name & Address */}
                        <td className="truncate">
                          <span className={`font-bold text-xs truncate block ${isHighlighted ? 'text-emerald-950 dark:text-emerald-200' : 'text-slate-900 dark:text-slate-100'}`}>
                            {c.name}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {c.address || 'Shop Counter Regular Patient'}
                          </span>
                        </td>

                        {/* Mobile Number */}
                        <td className="font-mono text-slate-700 dark:text-slate-300 text-xs truncate font-semibold">
                          {c.phone}
                        </td>

                        {/* Prescribing Doctor */}
                        <td className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {c.doctorName || 'Self / Direct'}
                        </td>

                        {/* Credit Limit */}
                        <td className="text-right font-mono text-slate-500 text-xs">
                          ₹{c.creditLimit.toLocaleString('en-IN')}
                        </td>

                        {/* Khata Dues */}
                        <td className="text-right font-mono font-black text-xs">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              c.currentDue > 0
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black'
                                : 'bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            ₹{c.currentDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 1-Click Enroll Membership */}
                            {(() => {
                              const isCustMember = !!getMemberByPhone(c.phone);
                              if (!isCustMember) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCustomer(c);
                                      walkinName !== c.name && setWalkinName(c.name);
                                      setWalkinPhone(c.phone);
                                      if (c.doctorName) setDoctorName(c.doctorName);
                                      setQuickEnrollName(c.name);
                                      setQuickEnrollPhone(c.phone);
                                      setIsCustomerModalOpen(false);
                                      setIsQuickEnrollOpen(true);
                                    }}
                                    title="1-Click Enroll into Pharmacy Club Membership"
                                    className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95"
                                  >
                                    <Crown className="h-3 w-3 text-amber-200" />
                                    <span>+ Club</span>
                                  </button>
                                );
                              }
                              return (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold">
                                  ★ Member
                                </span>
                              );
                            })()}

                            {/* Repeat Last Order Button (R) */}
                            <button
                              type="button"
                              onClick={() => openRepeatOrderForCustomer(c)}
                              title="Press [R] to repeat last prescription order"
                              className="px-2 py-1 rounded bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Repeat</span>
                              <kbd className="hidden sm:inline-block text-[8px] bg-purple-900 px-1 py-0.2 rounded font-mono">
                                R
                              </kbd>
                            </button>

                            {/* Select for New Bill (Enter) */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c);
                                walkinName !== c.name && setWalkinName(c.name);
                                setWalkinPhone(c.phone);
                                if (c.doctorName) setDoctorName(c.doctorName);
                                setIsCustomerModalOpen(false);
                                searchInputRef.current?.focus();
                              }}
                              title="Press [Enter] to select patient"
                              className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold shadow-xs transition-transform active:scale-95"
                            >
                              Select ↵
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Patient Cards (md:hidden - Zero Horizontal Scroll!) */}
          <div className="md:hidden space-y-2 max-h-[380px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="font-bold">No matching patients found</p>
              </div>
            ) : (
              filteredCustomers.map((c, idx) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {c.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {c.phone} • Dr. {c.doctorName || 'Self'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                        c.currentDue > 0
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {c.currentDue > 0 ? `Due: ₹${c.currentDue.toFixed(2)}` : 'No Dues'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {(() => {
                      const isCustMember = !!getMemberByPhone(c.phone);
                      if (!isCustMember) {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setWalkinName(c.name);
                              setWalkinPhone(c.phone);
                              if (c.doctorName) setDoctorName(c.doctorName);
                              setQuickEnrollName(c.name);
                              setQuickEnrollPhone(c.phone);
                              setIsCustomerModalOpen(false);
                              setIsQuickEnrollOpen(true);
                            }}
                            className="py-1.5 px-2 rounded-lg bg-amber-600 active:bg-amber-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Crown className="h-3 w-3 text-amber-200" />
                            <span>+ Club</span>
                          </button>
                        );
                      }
                      return (
                        <span className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold">
                          ★ Member
                        </span>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => openRepeatOrderForCustomer(c)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-purple-700 active:bg-purple-800 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Repeat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setWalkinName(c.name);
                        setWalkinPhone(c.phone);
                        if (c.doctorName) setDoctorName(c.doctorName);
                        setIsCustomerModalOpen(false);
                        searchInputRef.current?.focus();
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-bold shadow-xs text-center"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Clean Keyboard Guide & Highlighted Status Footer */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Selected: {filteredCustomers[customerHighlightedIndex]?.name || 'None'}
              </span>
              {filteredCustomers[customerHighlightedIndex] && (
                <span className="text-[10px] text-slate-500">
                  (Khata Due: ₹{filteredCustomers[customerHighlightedIndex].currentDue.toFixed(2)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span>
                <kbd className="kbd-shortcut">↑ / ↓</kbd> Navigate • <kbd className="kbd-shortcut">↵ Enter</kbd> Select Patient • <kbd className="kbd-shortcut">R</kbd> Repeat Last Order
              </span>
              <span>
                <kbd className="kbd-shortcut">Esc</kbd> Close
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: Parked / Held Bills Directory (F6 Resume) */}
      <Modal
        isOpen={isHeldModalOpen}
        onClose={() => {
          setIsHeldModalOpen(false);
          searchInputRef.current?.focus();
        }}
        title="Parked / Held Bills (F6 Resume)"
        subtitle={`Currently holding ${heldBills.length} parked customer bills in active memory`}
        maxWidth="lg"
      >
        <div className="space-y-3">
          {heldBills.length === 0 ? (
            <div className="text-center py-8 space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                  <PauseCircle className="h-8 w-8" />
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Parked Bills in Queue</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When you are serving a customer and need to temporarily pause their bill, press <kbd className="kbd-shortcut">Shift+F5</kbd> to park it. Press <kbd className="kbd-shortcut">Shift+F6</kbd> anytime to resume.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsHeldModalOpen(false);
                  searchInputRef.current?.focus();
                }}
                className="mt-2 px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Back to Billing (Esc)
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Held Bills Table (md: and up) */}
              <div className="hidden md:block overflow-y-auto max-h-80">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th className="w-10 text-center">Key</th>
                      <th>Parked Time</th>
                      <th>Patient / Customer</th>
                      <th>Items in Cart</th>
                      <th className="text-right">Bill Total (₹)</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heldBills.map((held, hIdx) => {
                      const isHighlighted = hIdx === heldHighlightedIndex;
                      return (
                        <tr
                          key={held.id}
                          ref={isHighlighted ? heldActiveRowRef : undefined}
                          onMouseEnter={() => setHeldHighlightedIndex(hIdx)}
                          onClick={() => handleResumeBill(held)}
                          className={`cursor-pointer transition-colors ${
                            isHighlighted
                              ? 'bg-emerald-100/90 dark:bg-emerald-950/70 border-l-4 border-l-emerald-600 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <td className="text-center">
                            <kbd
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                isHighlighted
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {hIdx + 1}
                            </kbd>
                          </td>
                          <td className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span>{held.holdTime}</span>
                            </div>
                          </td>
                          <td>
                            <p className="font-black text-slate-900 dark:text-slate-100">{held.customerName}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {held.customerPhone || 'Walk-in'} • Dr. {held.doctorName}
                            </p>
                          </td>
                          <td className="text-xs">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {held.items.length} {held.items.length === 1 ? 'medicine' : 'medicines'}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                              {held.items.map((i) => `${i.medicineName} (${i.quantity})`).join(', ')}
                            </p>
                          </td>
                          <td className="text-right font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                            ₹{held.totalAmount.toFixed(2)}
                          </td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleResumeBill(held)}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                  isHighlighted
                                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white ring-2 ring-emerald-400'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                } shadow-xs`}
                              >
                                Resume (↵)
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteHeldBill(held.id)}
                                title="Discard parked bill"
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Parked Bills Card List (md:hidden) */}
              <div className="md:hidden space-y-2.5 overflow-y-auto max-h-80 p-0.5">
                {heldBills.map((held, hIdx) => (
                  <div
                    key={held.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-500">#{hIdx + 1}</span>
                          <h4 className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">{held.customerName}</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {held.customerPhone || 'Walk-in'} • Dr. {held.doctorName}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{held.holdTime}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                          ₹{held.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded truncate">
                      {held.items.length} items: {held.items.map((i) => `${i.medicineName} (${i.quantity})`).join(', ')}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleResumeBill(held)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs text-center"
                      >
                        Resume Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteHeldBill(held.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 active:bg-rose-50 rounded-lg border border-slate-200 dark:border-slate-700"
                        title="Discard"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* MODAL 6: In-POS Quick Member Enrollment */}
      <Modal
        isOpen={isQuickEnrollOpen}
        onClose={() => setIsQuickEnrollOpen(false)}
        title="Register Membership"
        subtitle="Paid customer membership service"
        maxWidth="xl"
      >
        <div className="py-1">
          <CompactMembershipRegistrationForm
            isModal
            initialCustomerName={selectedCustomer ? selectedCustomer.name : (walkinName !== 'Walk-in Cash Customer' ? walkinName : '')}
            initialCustomerPhone={currentActivePhone}
            onSuccessAdded={() => {
              setIsQuickEnrollOpen(false);
            }}
            onCancel={() => setIsQuickEnrollOpen(false)}
          />
        </div>
      </Modal>

      {/* MODAL 7: Quick Barcode Link & Rename to Medicine */}
      <Modal
        isOpen={isBarcodeLinkModalOpen}
        onClose={() => {
          setIsBarcodeLinkModalOpen(false);
          setLinkSuccessMsg('');
        }}
        title="Link Packaging Barcode to Medicine"
        subtitle="Associate physical manufacturer barcode with ERP medicine formulation without relabeling"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBarcodeLink} className="space-y-4 py-1">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <span className="text-lg">🔫</span>
            <div>
              <p className="font-bold">Scanned Barcode: <span className="font-mono bg-amber-200/60 dark:bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-100">{unmappedBarcodeToLink}</span></p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                This barcode is not yet mapped in your medicine master. Select the medicine below to link it. Next time you scan this box, strip, or bottle, it will add directly to billing!
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Medicine to Link
            </label>
            <select
              value={selectedMedIdForLink}
              onChange={(e) => setSelectedMedIdForLink(e.target.value)}
              required
              className="w-full text-xs font-medium px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- Choose Medicine Formulation --</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.dosageForm}) - {m.manufacturer} [Stock: {m.totalStock}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Default Dispensing Unit
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                selectedUnitTypeForLink === 'STRIP'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 font-bold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}>
                <input
                  type="radio"
                  name="unitTypeLink"
                  checked={selectedUnitTypeForLink === 'STRIP'}
                  onChange={() => setSelectedUnitTypeForLink('STRIP')}
                  className="accent-primary-600"
                />
                Full Strip / Box / Bottle
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                selectedUnitTypeForLink === 'LOOSE'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 font-bold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}>
                <input
                  type="radio"
                  name="unitTypeLink"
                  checked={selectedUnitTypeForLink === 'LOOSE'}
                  onChange={() => setSelectedUnitTypeForLink('LOOSE')}
                  className="accent-primary-600"
                />
                Loose Tablet / Individual Unit
              </label>
            </div>
          </div>

          {linkSuccessMsg && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-300">
              ✓ {linkSuccessMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsBarcodeLinkModalOpen(false);
                setLinkSuccessMsg('');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedMedIdForLink}
              className="px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm"
            >
              Save Link & Add to Cart
            </button>
          </div>
        </form>
      </Modal>

      {/* Invoice Print & WhatsApp Preview Modal */}
      {completedInvoice && (
        <PrintInvoiceModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setCompletedInvoice(null);
          }}
          invoice={completedInvoice}
        />
      )}
    </div>
  );
};
