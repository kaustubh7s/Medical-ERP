'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePharmacy } from '@/lib/store';
import { Medicine, Batch, InvoiceItem, Customer, HeldBills, PaymentMode } from '@/types/pharmacy';
import { PrintInvoiceModal } from '@/components/common/PrintInvoiceModal';
import { Modal } from '@/components/common/Modal';
import { parseUnitsPerPack, getPerUnitRate, formatStockDisplay } from '@/lib/units';
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
} from 'lucide-react';
import {
  getMembershipExpiryInfo,
  calculateCustomerPurchases,
  getDiscountTierInfo,
  calculateExpiryDate,
  formatINR,
} from '@/lib/membershipUtils';

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
  } = usePharmacy();

  // Search & Input state
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchHighlightedIndex, setBatchHighlightedIndex] = useState<number>(0);

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
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'SPLIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [creditDownPayment, setCreditDownPayment] = useState<string>('0'); // Patient pays partial cash, rest on credit
  const [splitCashAmount, setSplitCashAmount] = useState<string>(''); // For SPLIT mode cash portion
  const [splitCashTendered, setSplitCashTendered] = useState<string>(''); // Cash note given for split portion

  // Held Bills Modal
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [heldHighlightedIndex, setHeldHighlightedIndex] = useState<number>(0);

  // Completed Invoice & Print Modal
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  // Instant search filter
  const filteredMedicines = searchTerm.trim()
    ? medicines.filter(
        (m) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.barcode && m.barcode.includes(searchTerm))
      )
    : [];

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
            (m.genericName.toLowerCase() === currentPreviewMed.genericName.toLowerCase() ||
              m.category.toLowerCase() === currentPreviewMed.category.toLowerCase())
        )
        .slice(0, 3)
    : [];

  // Reset highlighted index on search term change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

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

    const handleBatchKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setBatchHighlightedIndex((prev) => (prev < selectedMed.batches.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setBatchHighlightedIndex((prev) => (prev > 0 ? prev - 1 : selectedMed.batches.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const chosenBatch = selectedMed.batches[batchHighlightedIndex];
        if (chosenBatch && chosenBatch.availableQuantity > 0) {
          addItemToCart(selectedMed, chosenBatch);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsBatchModalOpen(false);
        searchInputRef.current?.focus();
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (selectedMed.batches[idx] && selectedMed.batches[idx].availableQuantity > 0) {
          e.preventDefault();
          addItemToCart(selectedMed, selectedMed.batches[idx]);
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
      } else if (e.key === 'c' || e.key === 'C') {
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

  // Focus search input on mount & global POS keyboard shortcuts
  useEffect(() => {
    searchInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if user is inside any modal
      if (isBatchModalOpen || isHeldModalOpen || isCustomerModalOpen || isPaymentModalOpen || repeatOrderModalOpen) return;

      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsDropdownOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) setIsPaymentModalOpen(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleHoldCurrentBill();
      } else if (e.key === 'F6') {
        e.preventDefault();
        setHeldHighlightedIndex(0);
        setIsHeldModalOpen(true);
      } else if (e.key === 'F8') {
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

  const handleSelectMedicine = (med: Medicine) => {
    setSelectedMed(med);
    if (med.batches.length === 1) {
      addItemToCart(med, med.batches[0]);
    } else {
      setIsBatchModalOpen(true);
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

  return (
    <div className="space-y-2.5">
      {/* 1. Fast Counter Barcode / Medicine Search Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        {/* Medicine / Barcode Input with Keyboard Arrow Support */}
        <div ref={searchContainerRef} className="relative flex-1 min-w-[280px]">
          <div className="flex items-center gap-1.5">
            <Search className="h-4 w-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onFocus={() => {
                if (searchTerm.trim().length > 0) setIsDropdownOpen(true);
              }}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onKeyDown={(e) => {
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
                  e.preventDefault();
                  if (filteredMedicines.length > 0) {
                    const targetMed =
                      filteredMedicines[Math.min(highlightedIndex, filteredMedicines.length - 1)] ||
                      filteredMedicines[0];
                    if (targetMed) handleSelectMedicine(targetMed);
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsDropdownOpen(false);
                }
              }}
              placeholder="F2: Scan Barcode or type medicine brand name, salt (e.g. Dolo, Paracetamol)..."
              className="w-full pl-9 pr-16 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
            />
            <div className="absolute right-2.5 top-1.5 flex items-center gap-1.5">
              <kbd className="kbd-shortcut">F2</kbd>
            </div>
          </div>

          {/* Instant Dropdown Spreadsheet Results + Live Interactive Medicine Preview */}
          {isDropdownOpen && filteredMedicines.length > 0 && (
            <div className="absolute left-0 right-0 top-11 z-50 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[520px] w-full min-w-[700px] xl:min-w-[900px] animate-in fade-in zoom-in-95 duration-100">
              
              {/* Left Column: Search Results Spreadsheet (approx 56%) */}
              <div className="lg:w-7/12 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800">
                <div className="bg-slate-900 text-white px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-wide text-slate-100">
                    MATCHING MEDICINES ({filteredMedicines.length})
                  </span>
                </div>

                <div className="overflow-y-auto max-h-[440px] flex-1">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th className="w-6 text-center">#</th>
                        <th>Brand Medicine</th>
                        <th>Generic Salt</th>
                        <th>Pack</th>
                        <th className="text-center">Stock Breakdown</th>
                        <th className="text-right">Strip MRP</th>
                        <th className="text-right">Per Tab Rate</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMedicines.map((med, idx) => {
                        const isHighlighted = idx === highlightedIndex;
                        const packCount = parseUnitsPerPack(med.packSize, med.dosageForm, med.unitsPerPack);
                        const stripPrice = med.batches[0]?.saleRate || med.batches[0]?.mrp || 0;
                        const perTabPrice = getPerUnitRate(stripPrice, packCount);
                        const stockInfo = formatStockDisplay(med.totalStock, packCount, med.dosageForm);

                        return (
                          <tr
                            key={med.id}
                            ref={isHighlighted ? activeRowRef : undefined}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onClick={() => handleSelectMedicine(med)}
                            className={`cursor-pointer transition-colors ${
                              isHighlighted
                                ? 'bg-emerald-100/95 dark:bg-emerald-950/70 border-l-4 border-l-emerald-600 font-bold'
                                : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <td className="text-center text-[10px] font-mono text-slate-400">
                              {isHighlighted ? (
                                <span className="inline-block px-1 rounded bg-emerald-600 text-white font-black text-[9px]">
                                  ►
                                </span>
                              ) : (
                                idx + 1
                              )}
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-black text-xs ${isHighlighted ? 'text-emerald-950 dark:text-emerald-200' : 'text-slate-900 dark:text-slate-100'}`}>
                                  {med.name}
                                </span>
                                {med.requiresPrescription && (
                                  <span className="px-1 py-0.2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-black text-[9px]">
                                    Rx
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-slate-600 dark:text-slate-400 text-[11px] font-medium truncate max-w-[130px]">
                              {med.genericName}
                            </td>
                            <td className="text-slate-500 dark:text-slate-400 text-[10px] font-medium">{med.packSize}</td>
                            <td className="text-center font-mono font-bold text-[10.5px]">
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  med.totalStock <= med.reorderLevel
                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black'
                                    : 'bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                                }`}
                              >
                                {stockInfo.displayText}
                              </span>
                            </td>
                            <td className="text-right font-mono font-black text-slate-900 dark:text-slate-100">
                              ₹{stripPrice.toFixed(2)}
                            </td>
                            <td className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                              {packCount > 1 ? `₹${perTabPrice.toFixed(2)}/tab` : '—'}
                            </td>
                            <td className="text-center">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] transition-transform active:scale-95 ${
                                  isHighlighted
                                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                + Pick
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Live Pharma & FEFO Batch Preview Card (approx 44%) */}
              {currentPreviewMed && (
                <div className="lg:w-5/12 bg-slate-50 dark:bg-slate-950/90 p-3.5 flex flex-col justify-between overflow-y-auto max-h-[480px] space-y-3">
                  {/* Top Live Badge + Brand & Dosage Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          Live Medicine Preview
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {currentPreviewMed.dosageForm}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black text-slate-950 dark:text-white leading-tight">
                          {currentPreviewMed.name}
                        </h4>
                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                          {currentPreviewMed.genericName}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${
                          currentPreviewMed.scheduleType === 'OTC'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : currentPreviewMed.scheduleType === 'SCHEDULE_H1'
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                            : currentPreviewMed.scheduleType === 'NARCOTIC'
                            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {currentPreviewMed.scheduleType.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Loose Tablet vs Full Strip Rate Highlight Box */}
                    {(() => {
                      const packCount = parseUnitsPerPack(currentPreviewMed.packSize, currentPreviewMed.dosageForm, currentPreviewMed.unitsPerPack);
                      const stripRate = currentPreviewMed.batches[0]?.saleRate || currentPreviewMed.batches[0]?.mrp || 0;
                      const tabRate = getPerUnitRate(stripRate, packCount);
                      const stockInfo = formatStockDisplay(currentPreviewMed.totalStock, packCount, currentPreviewMed.dosageForm);

                      return (
                        <div className="mt-2.5 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Full Strip Rate ({packCount} Units):
                            </span>
                            <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-xs">
                              ₹{stripRate.toFixed(2)}
                            </span>
                          </div>
                          {packCount > 1 && (
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                              <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                💊 Loose Tablet / Cut-Strip Price:
                              </span>
                              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-xs bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                                ₹{tabRate.toFixed(2)} / Tablet
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                            <span>Available Stock:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {stockInfo.displayText}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Metadata Strip */}
                    <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px]">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">Manufacturer</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {currentPreviewMed.manufacturer}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">HSN & Tax</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {currentPreviewMed.hsnCode} • {currentPreviewMed.gstRate}% GST
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Available Batches Breakdown (FEFO Order) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                        Available Batches (FEFO Sorted)
                      </span>
                    </div>

                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {currentPreviewMed.batches.map((b) => {
                        const packCount = parseUnitsPerPack(currentPreviewMed.packSize, currentPreviewMed.dosageForm, currentPreviewMed.unitsPerPack);
                        const stockInfo = formatStockDisplay(b.availableQuantity, packCount, currentPreviewMed.dosageForm);
                        const rate = b.saleRate || b.mrp;
                        const unitRate = getPerUnitRate(rate, packCount);

                        return (
                          <div
                            key={b.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                  {b.batchNumber}
                                </span>
                                <span
                                  className={`text-[9px] px-1 rounded font-bold ${
                                    b.status === 'NEAR_EXPIRY'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                      : b.status === 'EXPIRED'
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  Exp: {b.expiryDate}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                📍 {b.rackLocation || 'Shelf A-1'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 block">
                                ₹{rate.toFixed(2)} {packCount > 1 ? `(₹${unitRate.toFixed(2)}/tab)` : ''}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                                Stock: {stockInfo.displayText}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Generic Salt Substitutes (Alternative Medicines in Stock) */}
                  {saltSubstitutes.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-400 tracking-wider block mb-1">
                        Salt Substitutes in Stock:
                      </span>
                      <div className="space-y-1">
                        {saltSubstitutes.map((sub) => (
                          <div
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectMedicine(sub);
                            }}
                            className="bg-purple-50/80 dark:bg-purple-950/30 hover:bg-purple-100/80 border border-purple-200 dark:border-purple-900/40 rounded p-1.5 flex items-center justify-between text-xs cursor-pointer transition-colors"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100">{sub.name}</span>
                              <span className="text-[10px] text-purple-600 dark:text-purple-300 block">
                                {sub.packSize} • ₹{sub.batches[0]?.mrp || 0}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-600 text-white">
                              {sub.totalStock} in stock →
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer & Prescriber Quick Inputs + Repeat Order Button */}
        <div className="flex items-center gap-2">
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
              onClick={() => setIsCustomerModalOpen(true)}
              className="text-[10px] font-bold text-emerald-700 hover:underline"
            >
              Search/Add
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
            title="F5: Hold active bill"
            className="flex items-center gap-1 px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold"
          >
            <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>F5 Hold</span>
          </button>

          <button
            onClick={() => setIsHeldModalOpen(true)}
            title="F6: Resume parked bills"
            className="flex items-center gap-1 px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold"
          >
            <PlayCircle className="h-3.5 w-3.5 text-blue-600" />
            <span>F6 ({heldBills.length})</span>
          </button>
        </div>
      </div>

      {/* Customer Khata & Repeat Order Ribbon (When customer is selected) */}
      {selectedCustomer && (
        <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
            <span className="font-bold text-purple-900 dark:text-purple-300">
              Khata Patient: {selectedCustomer.name} ({selectedCustomer.phone})
            </span>
            <span className="text-slate-500 font-mono">
              | Existing Pending Due: <strong className="text-rose-600 font-bold">₹{selectedCustomer.currentDue.toFixed(2)}</strong>
            </span>
            <span className="text-slate-500 font-mono">
              | Credit Limit: ₹{selectedCustomer.creditLimit}
            </span>
          </div>

          <button
            onClick={() => openRepeatOrderForCustomer(selectedCustomer)}
            className="px-3 py-1 rounded bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Load & Edit Last Order ({selectedCustomer.name})</span>
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
      ) : currentActivePhone && currentActivePhone.replace(/\D/g, '').length >= 10 ? (
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <Crown className="h-4 w-4 text-amber-500" />
            <span>
              <strong>{selectedCustomer ? selectedCustomer.name : walkinName}</strong> ({currentActivePhone}) is not enrolled in Pharmacy Club.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setQuickEnrollName(selectedCustomer ? selectedCustomer.name : (walkinName !== 'Walk-in Cash Customer' ? walkinName : ''));
              setQuickEnrollPhone(currentActivePhone);
              setIsQuickEnrollOpen(true);
            }}
            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>1-Click Enroll Member (10%-20% Discount)</span>
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

      {/* 3. Main Billing Spreadsheet Table (100% Fully Editable) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
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
                    <p className="text-[11px]">
                      Press <kbd className="kbd-shortcut">F2</kbd> to search/scan, or click <strong>Repeat Last Order</strong> above to copy a customer's prior prescription.
                    </p>
                  </td>
                </tr>
              ) : (
                cart.map((item, index) => {
                  const isLoose = item.unitType === 'LOOSE';
                  const packCount = item.unitsPerPack || 10;

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
                      <td className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{item.batchNumber}</td>
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

        {/* 4. Bottom Running Bill Summary & Checkout Ribbon */}
        <div className="bg-slate-100 dark:bg-slate-950 border-t border-slate-300 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-4">
          {/* Item Count & Special Discount */}
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Total Formulations / Units</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {cart.length} Items ({cart.reduce((s, i) => s + i.quantity, 0)} Units/Strips)
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Gross Amount</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                ₹{grossTotal.toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold block">GST Tax</span>
              <span className="font-mono text-slate-600">
                ₹{totalTax.toFixed(2)}
              </span>
            </div>

            {membershipDiscountAmount > 0 && (
              <div className="flex items-center gap-1.5 border-l border-emerald-300 dark:border-emerald-700 pl-3">
                <Crown className="h-4 w-4 text-emerald-600" />
                <div>
                  <span className="text-[10px] uppercase text-emerald-700 dark:text-emerald-400 font-bold block">
                    Member Disc ({effectiveMemberDiscountPercent}%):
                  </span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                    -₹{membershipDiscountAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Bill Level Discount */}
            <div className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-700 pl-3">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Bill Disc %:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={overallDiscountPercent}
                onChange={(e) => setOverallDiscountPercent(parseFloat(e.target.value) || 0)}
                className="w-12 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold"
              />
            </div>
          </div>

          {/* Grand Total & Instant Checkout Actions */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                Net Payable (Round Off {roundOff >= 0 ? `+${roundOff}` : roundOff})
              </span>
              <span className="font-mono text-2xl font-black text-emerald-700 dark:text-emerald-400">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleClearCart}
              disabled={cart.length === 0}
              className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-200 text-slate-600 text-xs font-bold disabled:opacity-40"
            >
              F8 Clear
            </button>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className="px-6 py-2.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm flex items-center gap-2 shadow-sm disabled:opacity-40"
            >
              <span>F4 Collect & Print</span>
              <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px]">F4</span>
            </button>
          </div>
        </div>
      </div>

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
          <div className="border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto shadow-xs">
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
          searchInputRef.current?.focus();
        }}
        title={selectedMed ? `Select Batch: ${selectedMed.name}` : 'Select Batch'}
        subtitle="Batches sorted automatically by FEFO (First-Expiry-First-Out) • Use [↑/↓] or [1-9] to pick"
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
                        onClick={() => addItemToCart(selectedMed, batch)}
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
                              addItemToCart(selectedMed, batch);
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
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { id: 'CASH', label: 'Cash', icon: Banknote },
              { id: 'UPI', label: 'UPI', icon: IndianRupee },
              { id: 'SPLIT', label: 'Split (Cash+UPI)', icon: Layers },
              { id: 'CARD', label: 'Card', icon: CreditCard },
              { id: 'CREDIT', label: 'Credit / Khata', icon: BookOpen },
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
                  <span className="text-[10.5px] leading-tight">{mode.label}</span>
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

          {/* Confirm Action Button */}
          <button
            onClick={handleCompleteSale}
            className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm shadow-md transition-transform active:scale-[0.99]"
          >
            {paymentMode === 'CREDIT'
              ? `Confirm Khata Entry (Due: ₹${creditBalanceDue.toFixed(2)}) & Print Receipt`
              : paymentMode === 'SPLIT'
              ? `Confirm Split Bill (Cash: ₹${splitCash.toFixed(2)} + UPI: ₹${splitUpi.toFixed(2)}) & Print`
              : 'Confirm & Print Tax Receipt (Enter)'}
          </button>
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

          {/* Existing Patients Khata & Repeat Table (Wide, Organized & High Density) */}
          <div className="border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto shadow-xs">
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
                                setWalkinName(c.name);
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
                When you are serving a customer and need to temporarily pause their bill, press <kbd className="kbd-shortcut">F5</kbd> to park it. Press <kbd className="kbd-shortcut">F6</kbd> anytime to resume.
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
              <div className="overflow-y-auto max-h-80">
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
            </>
          )}
        </div>
      </Modal>

      {/* MODAL 6: In-POS Quick Member Enrollment */}
      <Modal
        isOpen={isQuickEnrollOpen}
        onClose={() => setIsQuickEnrollOpen(false)}
        title="1-Click Customer Loyalty Enrollment"
        subtitle="Instantly register customer for 10% / 20% loyalty discounts without leaving POS"
        maxWidth="md"
      >
        <form onSubmit={handleQuickEnrollSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
              <Crown className="h-4 w-4 text-amber-500" />
              <span>Pharmacy Club Membership Registration</span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              New members start at 10% loyalty discount on all eligible medicines. Once rolling 3-month purchases reach {formatINR(membershipSettings.purchaseThreshold, false)}, tier automatically upgrades to 20%!
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={quickEnrollName}
                onChange={(e) => setQuickEnrollName(e.target.value)}
                placeholder="Patient / Customer Full Name"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Mobile Number (Lookup Key) <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={quickEnrollPhone}
                onChange={(e) => setQuickEnrollPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Membership Plan & Fee
                </label>
                <span className="text-[10px] text-emerald-700 font-bold">Paid Club Membership</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { months: 1, label: '1 Month', price: 29 },
                  { months: 3, label: '3 Months', price: 59 },
                  { months: 6, label: '6 Months', price: 99 },
                  { months: 12, label: '1 Year', price: 149 },
                ].map((dur) => (
                  <button
                    key={dur.months}
                    type="button"
                    onClick={() => {
                      setQuickEnrollDuration(dur.months);
                      setQuickEnrollFee(dur.price);
                    }}
                    className={`p-1.5 rounded-lg border text-center transition-colors ${
                      quickEnrollDuration === dur.months
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="block font-bold text-xs">{dur.label}</span>
                    <span className={`text-[10px] font-mono block ${quickEnrollDuration === dur.months ? 'text-emerald-100 font-bold' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      ₹{dur.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Fee Collected (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={quickEnrollFee}
                  onChange={(e) => setQuickEnrollFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['UPI', 'CASH', 'CARD'] as PaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setQuickEnrollPayMode(mode)}
                      className={`py-1.5 rounded text-[10px] font-bold border transition-colors ${
                        quickEnrollPayMode === mode
                          ? 'bg-slate-900 text-white dark:bg-emerald-600 border-slate-900 dark:border-emerald-600'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>Calculated Expiry Date:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {calculateExpiryDate(new Date().toISOString().split('T')[0], quickEnrollDuration)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsQuickEnrollOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-sm"
            >
              Confirm & Enroll Member
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
