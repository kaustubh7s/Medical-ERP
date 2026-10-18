import {
  Membership,
  MembershipSettings,
  MembershipStatus,
  SalesInvoice,
  SalesReturn,
} from '@/types/pharmacy';

/**
 * Format currency in Indian Rupees format (e.g. ₹3,000 or ₹12,450.50)
 */
export function formatINR(amount: number, showDecimals: boolean = true): string {
  const rounded = Math.round(amount * 100) / 100;
  if (!showDecimals && Number.isInteger(rounded)) {
    return '₹' + rounded.toLocaleString('en-IN');
  }
  return (
    '₹' +
    rounded.toLocaleString('en-IN', {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Calculate the expiry date given a start date (YYYY-MM-DD) and duration in months.
 * Strictly adheres to calendar-month arithmetic and handles month-end dates correctly
 * (e.g. Jan 31 + 1 month = Feb 28 in non-leap years, Feb 29 in leap years, Mar 31 + 1 month = Apr 30).
 */
export function calculateExpiryDate(startDateStr: string, durationMonths: number, customDays?: number): string {
  if (!startDateStr) {
    const today = new Date();
    startDateStr = today.toISOString().split('T')[0];
  }
  const parts = startDateStr.split('-');
  const startYear = parseInt(parts[0], 10);
  const startMonth = parseInt(parts[1], 10); // 1-12
  const startDay = parseInt(parts[2], 10);

  if (customDays && customDays > 0) {
    const date = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    date.setUTCDate(date.getUTCDate() + customDays);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Calendar month arithmetic:
  const totalMonths = (startMonth - 1) + durationMonths;
  const targetYear = startYear + Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12; // 0-11
  
  // Find max days in target month using UTC to avoid timezone shifts
  const maxDaysInTargetMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const targetDay = Math.min(startDay, maxDaysInTargetMonth);

  const formattedMonth = String(targetMonthIndex + 1).padStart(2, '0');
  const formattedDay = String(targetDay).padStart(2, '0');
  return `${targetYear}-${formattedMonth}-${formattedDay}`;
}

export interface MembershipExpiryInfo {
  daysRemaining: number;
  computedStatus: MembershipStatus;
  isExpiringSoon: boolean;
  isExpired: boolean;
  isUrgent: boolean;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'slate';
  statusLabel: string;
}

/**
 * Inspect a member's expiry date and configuration to compute days remaining and active status
 */
export function getMembershipExpiryInfo(
  member: Membership,
  settings: MembershipSettings,
  referenceDate: Date = new Date()
): MembershipExpiryInfo {
  // If explicitly suspended or cancelled by admin, respect manual override
  if (member.status === 'SUSPENDED') {
    return {
      daysRemaining: 0,
      computedStatus: 'SUSPENDED',
      isExpiringSoon: false,
      isExpired: false,
      isUrgent: false,
      badgeColor: 'slate',
      statusLabel: 'Suspended',
    };
  }

  if (member.status === 'CANCELLED') {
    return {
      daysRemaining: 0,
      computedStatus: 'CANCELLED',
      isExpiringSoon: false,
      isExpired: true,
      isUrgent: false,
      badgeColor: 'slate',
      statusLabel: 'Cancelled',
    };
  }

  const expDate = new Date(`${member.expiryDate}T23:59:59`);
  const diffTime = expDate.getTime() - referenceDate.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      daysRemaining: Math.max(0, daysRemaining),
      computedStatus: 'EXPIRED',
      isExpiringSoon: false,
      isExpired: true,
      isUrgent: false,
      badgeColor: 'rose',
      statusLabel: 'Expired',
    };
  }

  if (daysRemaining <= settings.expiryAlertDaysUrgent) {
    return {
      daysRemaining,
      computedStatus: 'EXPIRING_SOON',
      isExpiringSoon: true,
      isExpired: false,
      isUrgent: true,
      badgeColor: 'rose',
      statusLabel: `Expiring Soon (${daysRemaining}d)`,
    };
  }

  if (daysRemaining <= settings.expiryAlertDaysWarning) {
    return {
      daysRemaining,
      computedStatus: 'EXPIRING_SOON',
      isExpiringSoon: true,
      isExpired: false,
      isUrgent: false,
      badgeColor: 'amber',
      statusLabel: `Expiring Soon (${daysRemaining}d)`,
    };
  }

  return {
    daysRemaining,
    computedStatus: 'ACTIVE',
    isExpiringSoon: false,
    isExpired: false,
    isUrgent: false,
    badgeColor: 'emerald',
    statusLabel: 'Active',
  };
}

export interface CustomerPurchasesAggregation {
  totalNetPurchases: number;
  totalLifetimePurchases: number;
  rollingPurchases: number;
  totalReturns: number;
  totalSavings: number;
  invoiceCount: number;
  averagePurchaseValue: number;
  matchedInvoices: SalesInvoice[];
  matchedReturns: SalesReturn[];
}

/**
 * Calculates customer purchases over rolling N months (default: 3 months),
 * accounting for sales returns and excluding non-eligible products.
 */
export function calculateCustomerPurchases(
  customerPhone: string,
  invoices: SalesInvoice[],
  salesReturns: SalesReturn[],
  settings: MembershipSettings,
  referenceDate: Date = new Date()
): CustomerPurchasesAggregation {
  if (!customerPhone) {
    return {
      totalNetPurchases: 0,
      totalLifetimePurchases: 0,
      rollingPurchases: 0,
      totalReturns: 0,
      totalSavings: 0,
      invoiceCount: 0,
      averagePurchaseValue: 0,
      matchedInvoices: [],
      matchedReturns: [],
    };
  }

  const cleanPhone = customerPhone.replace(/\D/g, '');

  // Calculate cutoff for rolling window
  const cutoff = new Date(referenceDate);
  cutoff.setMonth(cutoff.getMonth() - settings.qualificationPeriodMonths);
  const cutoffDateStr = cutoff.toISOString().split('T')[0];

  const matchedInvoices = invoices.filter((inv) => {
    const invPhone = (inv.customerPhone || '').replace(/\D/g, '');
    return invPhone.endsWith(cleanPhone) || cleanPhone.endsWith(invPhone);
  });

  const matchedReturns = salesReturns.filter((ret) => {
    // Check by matching original invoice ID or customer ID
    return matchedInvoices.some((inv) => inv.id === ret.originalInvoiceId);
  });

  let totalLifetimePurchases = 0;
  let rollingPurchases = 0;
  let totalSavings = 0;
  let totalReturns = 0;

  matchedReturns.forEach((ret) => {
    totalReturns += ret.totalRefundAmount || 0;
  });

  matchedInvoices.forEach((inv) => {
    // Only completed / paid transactions qualify for customer loyalty net purchases
    if (inv.paymentStatus !== 'PAID') {
      return;
    }

    const invoiceDate = inv.invoiceDate.split(' ')[0];
    const isWithinRollingWindow = invoiceDate >= cutoffDateStr;

    // Do not count the membership fee itself as a medicine purchase for qualifying customer discounts
    const membershipFeeTotal = inv.items
      .filter((item) => item.itemCategory === 'MEMBERSHIP' || item.medicineId === 'SERVICE_MEMBERSHIP')
      .reduce((sum, item) => sum + (item.totalAmount || item.rate * item.quantity), 0);

    // Subtract return amount and membership fee to obtain pure medicine net purchases
    const netMedicineAmount = Math.max(0, inv.grandTotal - (inv.returnAmount || 0) - membershipFeeTotal);

    totalLifetimePurchases += netMedicineAmount;
    totalSavings += (inv.membershipDiscountAmount || 0) + (inv.totalDiscount || 0);

    if (isWithinRollingWindow) {
      rollingPurchases += netMedicineAmount;
    }
  });

  // Subtract rolling returns
  matchedReturns.forEach((ret) => {
    const retDate = ret.returnDate.split(' ')[0];
    if (retDate >= cutoffDateStr) {
      rollingPurchases = Math.max(0, rollingPurchases - ret.totalRefundAmount);
    }
  });

  const invoiceCount = matchedInvoices.length;
  const averagePurchaseValue =
    invoiceCount > 0 ? Math.round((totalLifetimePurchases / invoiceCount) * 100) / 100 : 0;

  return {
    totalNetPurchases: rollingPurchases,
    totalLifetimePurchases: Math.round(totalLifetimePurchases * 100) / 100,
    rollingPurchases: Math.round(rollingPurchases * 100) / 100,
    totalReturns: Math.round(totalReturns * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
    invoiceCount,
    averagePurchaseValue,
    matchedInvoices,
    matchedReturns,
  };
}

export interface DiscountTierInfo {
  tier: '10%' | '20%' | 'NONE';
  percent: number;
  isHigherTier: boolean;
  amountNeededForHigherTier: number;
  threshold: number;
  summaryLabel: string;
}

/**
 * Determine discount tier:
 * - Below ₹3,000: 10% discount
 * - ₹3,000 or above: 20% discount (Important: ₹3,000 exactly qualifies for 20%)
 */
export function getDiscountTierInfo(
  rollingEligiblePurchases: number,
  settings: MembershipSettings,
  isMemberActive: boolean = true
): DiscountTierInfo {
  if (!isMemberActive) {
    return {
      tier: 'NONE',
      percent: 0,
      isHigherTier: false,
      amountNeededForHigherTier: settings.purchaseThreshold,
      threshold: settings.purchaseThreshold,
      summaryLabel: 'No Discount (Inactive/Expired)',
    };
  }

  // Exactly threshold (default ₹3,000) or higher qualifies for higher tier (default 20%)
  if (rollingEligiblePurchases >= settings.purchaseThreshold) {
    return {
      tier: '20%',
      percent: settings.higherTierDiscountPercent,
      isHigherTier: true,
      amountNeededForHigherTier: 0,
      threshold: settings.purchaseThreshold,
      summaryLabel: `${settings.higherTierDiscountPercent}% Tier (Elite Member)`,
    };
  }

  // Below threshold: lower tier (default 10%)
  const amountNeeded = Math.max(0, settings.purchaseThreshold - rollingEligiblePurchases);
  return {
    tier: '10%',
    percent: settings.lowerTierDiscountPercent,
    isHigherTier: false,
    amountNeededForHigherTier: Math.round(amountNeeded * 100) / 100,
    threshold: settings.purchaseThreshold,
    summaryLabel: `${settings.lowerTierDiscountPercent}% Tier (Standard Member)`,
  };
}
