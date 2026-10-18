'use client';

import React, { useState } from 'react';
import { SalesInvoice } from '@/types/pharmacy';
import { usePharmacy } from '@/lib/store';
import { Modal } from '@/components/common/Modal';
import { Printer, Share2, FileText, CheckCircle2, MessageSquare, Download, Crown } from 'lucide-react';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesInvoice | null;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const { settings, memberships, setActiveTab } = usePharmacy();
  const [printFormat, setPrintFormat] = useState<'THERMAL' | 'A4'>('THERMAL');
  const [copied, setCopied] = useState(false);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const generateWhatsAppLink = () => {
    const itemsList = invoice.items
      .map((item, idx) => `${idx + 1}. *${item.medicineName}* (${item.quantity} ${item.unitType === 'LOOSE' ? 'Tabs' : 'Strips'}) - ₹${item.totalAmount.toFixed(2)}`)
      .join('%0A');

    const splitInfo = invoice.paymentMode === 'SPLIT' && invoice.splitDetails
      ? `%0A*Split Breakup:* Cash ₹${invoice.splitDetails.cash.toFixed(2)} + UPI ₹${invoice.splitDetails.upi.toFixed(2)}`
      : '';

    const terminalInfo = invoice.paymentMode === 'POS_TERMINAL'
      ? `%0A💳 *POS Terminal:* ${invoice.terminalDeviceId || 'PINELABS-POS-M884'}%0A*Txn ID:* ${invoice.terminalTransactionId || 'N/A'}${invoice.terminalAuthCode ? `%0A*Auth Code:* ${invoice.terminalAuthCode}` : ''}${invoice.terminalCardLast4 ? `%0A*Card:* **** ${invoice.terminalCardLast4} (${invoice.terminalCardNetwork || 'CARD'})` : ''}${invoice.terminalUpiVpa ? `%0A*UPI:* ${invoice.terminalUpiVpa}` : ''}`
      : '';

    const membershipInfo = invoice.membershipId
      ? `%0A⭐ *Club Member:* ${invoice.membershipId} (${invoice.membershipDiscountPercent}% Tier - Saved ₹${(invoice.membershipDiscountAmount || 0).toFixed(2)})`
      : '';

    const message = `*${settings.storeName.toUpperCase()}*%0A` +
      `🏥 *Tax Invoice:* ${invoice.invoiceNumber}%0A` +
      `📅 *Date:* ${invoice.invoiceDate}%0A` +
      `👤 *Patient:* ${invoice.customerName}%0A` +
      (invoice.doctorName ? `👨‍⚕️ *Doctor:* ${invoice.doctorName}%0A` : '') +
      membershipInfo +
      `━━━━━━━━━━━━━━━━━━%0A` +
      `*Billed Medicines:*%0A` +
      itemsList +
      `%0A━━━━━━━━━━━━━━━━━━%0A` +
      `💰 *Grand Total: ₹${invoice.grandTotal.toFixed(2)}*%0A` +
      `💳 *Payment:* ${invoice.paymentMode === 'POS_TERMINAL' ? 'Pine Labs POS Terminal' : invoice.paymentMode} (${invoice.paymentStatus})${splitInfo}${terminalInfo}%0A` +
      (invoice.balanceDue > 0 ? `⚠️ *Pending Khata Due:* ₹${invoice.balanceDue.toFixed(2)}%0A` : '') +
      `━━━━━━━━━━━━━━━━━━%0A` +
      `📍 ${settings.address}%0A` +
      `📞 ${settings.phone}%0A` +
      `✨ _Wish you a speedy recovery!_`;

    const phone = invoice.customerPhone ? invoice.customerPhone.replace(/[^0-9]/g, '') : '';
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`;
  };

  const activeMembership = memberships.find(
    (m) =>
      m.membershipId === invoice.membershipMemberId ||
      m.invoiceId === invoice.id ||
      (invoice.customerPhone && m.customerPhone === invoice.customerPhone)
  );

  const isMembershipSale =
    invoice.saleCategory === 'MEMBERSHIP' ||
    invoice.saleCategory === 'COMBINED' ||
    invoice.items.some((i) => i.itemCategory === 'MEMBERSHIP');

  const isMembershipActivated =
    invoice.paymentStatus === 'PAID' &&
    (invoice.membershipActivationStatus === 'ACTIVATED' ||
      Boolean(invoice.membershipMemberId) ||
      (isMembershipSale && activeMembership?.status === 'ACTIVE'));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print & Export Invoice"
      subtitle={`Invoice #${invoice.invoiceNumber} • ${invoice.customerName}`}
      maxWidth="4xl"
    >
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setPrintFormat('THERMAL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              printFormat === 'THERMAL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            POS Thermal (80mm)
          </button>
          <button
            onClick={() => setPrintFormat('A4')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              printFormat === 'A4'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Standard A4 GST Invoice
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={generateWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp Invoice
          </a>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print Now
          </button>
        </div>
      </div>

      {/* 9. Membership Activated Successfully Confirmation Alert */}
      {isMembershipActivated && (
        <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 border border-emerald-300 dark:border-emerald-700 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                  <span>Membership Activated Successfully</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                    PAID & ACTIVE
                  </span>
                </h4>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Customer loyalty benefits (10% - 20% discount on medicines) unlocked immediately.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveTab('customer-membership');
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-xs"
            >
              View Member Profile →
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Member ID</span>
              <strong className="font-mono text-emerald-700 dark:text-emerald-400 text-xs">
                {activeMembership?.membershipId || invoice.membershipMemberId || invoice.membershipId || 'MEM-ACTIVE'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
              <strong className="truncate block">{invoice.customerName}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Plan</span>
              <strong>{activeMembership?.durationLabel || invoice.membershipPlanName || 'Annual Plan'}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount Paid</span>
              <strong className="font-mono text-emerald-600">₹{(invoice.membershipFeeAmount || activeMembership?.feePaid || 0).toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Start Date</span>
              <span className="font-mono text-[11px]">{activeMembership?.startDate || invoice.invoiceDate.split(' ')[0]}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Expiry Date</span>
              <strong className="font-mono text-[11px] text-amber-700 dark:text-amber-400">
                {activeMembership?.expiryDate || '—'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Previews Container */}
      <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl overflow-x-auto flex justify-center">
        {printFormat === 'THERMAL' ? (
          /* Thermal POS Receipt Layout */
          <div
            id="printable-invoice"
            className="w-[320px] bg-white text-black p-5 font-mono text-[11px] leading-tight border border-slate-300 shadow-lg rounded-sm"
          >
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h2 className="text-sm font-black tracking-tight">{settings.storeName}</h2>
              <p className="text-[10px] mt-0.5">{settings.address}</p>
              <p className="text-[10px]">Ph: {settings.phone}</p>
              <p className="text-[10px]">DL: {settings.drugLicenseNumber}</p>
              <p className="text-[10px] font-bold">GSTIN: {settings.gstNumber}</p>
            </div>

            <div className="py-2 border-b border-dashed border-black text-[10px]">
              <div className="flex justify-between">
                <span>Inv: {invoice.invoiceNumber}</span>
                <span>{invoice.invoiceDate.split(' ')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span>Time: {invoice.invoiceDate.split(' ')[1] || '10:00:00'}</span>
                <span>Type: {invoice.invoiceType}</span>
              </div>
              <div className="mt-1 font-bold">Patient: {invoice.customerName}</div>
              {invoice.customerPhone && <div>Phone: {invoice.customerPhone}</div>}
              {invoice.membershipId && (
                <div className="font-bold text-[9px] mt-0.5">
                  ★ MEMBER: {invoice.membershipId} {invoice.membershipTier ? `(${invoice.membershipTier})` : ''}
                </div>
              )}
              {invoice.doctorName && <div>Doctor: {invoice.doctorName}</div>}
              <div>Billed By: {invoice.cashierName}</div>
            </div>

            {/* Table */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="flex justify-between font-bold pb-1 border-b border-black text-[10px]">
                <span className="w-1/2">Item/Batch</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/6 text-right">Rate</span>
                <span className="w-1/6 text-right">Amt</span>
              </div>
              <div className="space-y-1.5 pt-1.5">
                {invoice.items.map((item) => {
                  const isMembership = item.itemCategory === 'MEMBERSHIP';
                  return (
                    <div key={item.id}>
                      <div className="font-bold truncate">
                        {isMembership ? `★ ${item.medicineName}` : item.medicineName}{' '}
                        {item.unitType === 'LOOSE' ? `(${item.quantity} Tabs Loose)` : ''}
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-600">
                        <span className="w-1/2">
                          {isMembership
                            ? `ID:${item.batchNumber} (HSN:${item.hsnCode || '998319'})`
                            : `B:${item.batchNumber} (Exp:${item.expiryDate?.substring(0, 7)})`}
                        </span>
                        <span className="w-1/6 text-center font-bold">
                          {isMembership ? '1 Svc' : `${item.quantity} ${item.unitType === 'LOOSE' ? 'Tab' : 'Strip'}`}
                        </span>
                        <span className="w-1/6 text-right">{item.rate.toFixed(2)}</span>
                        <span className="w-1/6 text-right font-bold">{item.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Sub Total:</span>
                <span>₹{invoice.subTotal.toFixed(2)}</span>
              </div>
              {invoice.membershipDiscountAmount && invoice.membershipDiscountAmount > 0 ? (
                <>
                  <div className="flex justify-between font-bold">
                    <span>Member Disc ({invoice.membershipDiscountPercent}%):</span>
                    <span>-₹{invoice.membershipDiscountAmount.toFixed(2)}</span>
                  </div>
                  {invoice.totalDiscount - invoice.membershipDiscountAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Other Discount:</span>
                      <span>-₹{(invoice.totalDiscount - invoice.membershipDiscountAmount).toFixed(2)}</span>
                    </div>
                  )}
                </>
              ) : invoice.totalDiscount > 0 ? (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-₹{invoice.totalDiscount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[9px]">
                <span>CGST ({invoice.items[0]?.gstRate / 2 || 6}%):</span>
                <span>₹{invoice.totalCgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span>SGST ({invoice.items[0]?.gstRate / 2 || 6}%):</span>
                <span>₹{invoice.totalSgst.toFixed(2)}</span>
              </div>
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between">
                  <span>Round Off:</span>
                  <span>{invoice.roundOff > 0 ? `+₹${invoice.roundOff.toFixed(2)}` : `-₹${Math.abs(invoice.roundOff).toFixed(2)}`}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
                <span>GRAND TOTAL:</span>
                <span>₹{invoice.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] pt-0.5">
                <span>Payment Mode:</span>
                <span className="font-bold">
                  {invoice.paymentMode === 'SPLIT' && invoice.splitDetails
                    ? `SPLIT (Cash: ₹${invoice.splitDetails.cash.toFixed(0)} | UPI: ₹${invoice.splitDetails.upi.toFixed(0)})`
                    : invoice.paymentMode === 'POS_TERMINAL'
                    ? `PINE LABS POS TERMINAL (${invoice.paymentStatus})`
                    : `${invoice.paymentMode} (${invoice.paymentStatus})`}
                </span>
              </div>
            </div>

            {/* POS Terminal Settlement Info */}
            {invoice.paymentMode === 'POS_TERMINAL' ? (
              <div className="py-2 border-b border-dashed border-black text-[9px] font-mono space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>TERMINAL DEVICE:</span>
                  <span>{invoice.terminalDeviceId || 'PINELABS-POS-M884'}</span>
                </div>
                {invoice.terminalTransactionId && (
                  <div className="flex justify-between">
                    <span>TXN ID:</span>
                    <span>{invoice.terminalTransactionId}</span>
                  </div>
                )}
                {invoice.terminalAuthCode && (
                  <div className="flex justify-between">
                    <span>AUTH CODE:</span>
                    <span>{invoice.terminalAuthCode}</span>
                  </div>
                )}
                {invoice.terminalRrn && (
                  <div className="flex justify-between">
                    <span>RRN:</span>
                    <span>{invoice.terminalRrn}</span>
                  </div>
                )}
                {invoice.terminalCardLast4 && (
                  <div className="flex justify-between">
                    <span>CARD:</span>
                    <span>**** {invoice.terminalCardLast4} ({invoice.terminalCardNetwork || 'CARD'})</span>
                  </div>
                )}
                {invoice.terminalUpiVpa && (
                  <div className="flex justify-between">
                    <span>UPI VPA:</span>
                    <span>{invoice.terminalUpiVpa}</span>
                  </div>
                )}
                <div className="flex justify-between text-[8px] text-gray-600 pt-0.5 font-bold">
                  <span>TERMINAL STATUS:</span>
                  <span className="text-emerald-700">VERIFIED SUCCESS (DEMO)</span>
                </div>
              </div>
            ) : (
              /* Payment & UPI Verification */
              <div className="py-2 text-center border-b border-dashed border-black">
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider">
                  UPI / Digital Payment
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 text-center text-[9px] text-gray-700">
              <p>{settings.invoiceFooterMessage}</p>
              <p className="font-bold mt-1">*** GET WELL SOON ***</p>
            </div>
          </div>
        ) : (
          /* Standard A4 GST Tax Invoice Layout */
          <div
            id="printable-invoice"
            className="w-[780px] bg-white text-black p-8 text-xs font-sans border border-slate-300 shadow-xl rounded-sm leading-normal"
          >
            {/* Pharmacy Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">{settings.storeName}</h1>
                <p className="text-[11px] font-semibold text-slate-600">{settings.tagline}</p>
                <p className="text-[10px] text-slate-500 mt-1">{settings.address}</p>
                <p className="text-[10px] text-slate-500">
                  Phone: <strong>{settings.phone}</strong> | Email: {settings.email}
                </p>
              </div>
              <div className="text-right text-[10px] font-mono space-y-0.5">
                <div className="bg-slate-900 text-white font-bold px-2 py-0.5 rounded text-center mb-1">
                  TAX INVOICE (RETAIL)
                </div>
                <p><strong>GSTIN:</strong> {settings.gstNumber}</p>
                <p><strong>D.L. 20B/21B:</strong> {settings.drugLicenseNumber}</p>
                <p><strong>FSSAI Lic:</strong> {settings.fssaiNumber}</p>
              </div>
            </div>

            {/* Invoice Meta & Patient Info Grid */}
            <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200 text-[11px]">
              <div>
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Patient / Customer Info:</p>
                <p className="font-black text-sm text-slate-900">{invoice.customerName}</p>
                <p className="text-slate-600 font-mono">Mobile: {invoice.customerPhone}</p>
                {invoice.membershipId && (
                  <p className="text-emerald-700 font-bold font-mono text-[10px] mt-0.5">
                    ★ Member ID: {invoice.membershipId} • {invoice.membershipTier || 'Loyalty Member'}
                  </p>
                )}
                <p className="text-slate-600">Prescribing Doctor: <strong>{invoice.doctorName || 'Self / OTC'}</strong></p>
              </div>
              <div className="text-right font-mono space-y-1">
                <p>Invoice No: <strong className="text-sm text-emerald-800">{invoice.invoiceNumber}</strong></p>
                <p>Date & Time: <strong>{invoice.invoiceDate}</strong></p>
                <p>
                  Payment: <strong className="uppercase">
                    {invoice.paymentMode === 'POS_TERMINAL' ? 'Pine Labs POS Terminal' : invoice.paymentMode}
                  </strong>{' '}
                  {invoice.paymentMode === 'SPLIT' && invoice.splitDetails
                    ? `(Cash: ₹${invoice.splitDetails.cash.toFixed(2)} | UPI: ₹${invoice.splitDetails.upi.toFixed(2)})`
                    : `(${invoice.paymentStatus})`}
                </p>
                {invoice.paymentMode === 'POS_TERMINAL' && (
                  <div className="text-[10px] text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 mt-1 text-left font-mono">
                    <p className="font-bold text-slate-900">Pine Labs-style POS Terminal Verification (Demo)</p>
                    <p>Device: {invoice.terminalDeviceId || 'PINELABS-POS-M884'}</p>
                    {invoice.terminalTransactionId && <p>Txn ID: {invoice.terminalTransactionId}</p>}
                    {invoice.terminalAuthCode && <p>Auth: {invoice.terminalAuthCode} | RRN: {invoice.terminalRrn || 'N/A'}</p>}
                    {invoice.terminalCardLast4 && <p>Card: **** {invoice.terminalCardLast4} ({invoice.terminalCardNetwork})</p>}
                    {invoice.terminalUpiVpa && <p>UPI: {invoice.terminalUpiVpa}</p>}
                    <p className="text-[9px] text-emerald-700 font-bold">Status: Authoritatively Verified & Settled</p>
                  </div>
                )}
                <p>Billed By: {invoice.cashierName}</p>
              </div>
            </div>

            {/* Invoice Line Items Spreadsheet */}
            <table className="w-full mt-3 border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold text-[11px]">
                  <th className="p-2 w-8 text-center">#</th>
                  <th className="p-2">Description of Goods</th>
                  <th className="p-2 text-center">HSN</th>
                  <th className="p-2 text-center">Batch</th>
                  <th className="p-2 text-center">Exp</th>
                  <th className="p-2 text-center">Unit / Qty</th>
                  <th className="p-2 text-right">MRP</th>
                  <th className="p-2 text-right">Rate</th>
                  <th className="p-2 text-center">GST %</th>
                  <th className="p-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item, idx) => {
                  const isMembership = item.itemCategory === 'MEMBERSHIP';
                  return (
                    <tr
                      key={item.id}
                      className={isMembership ? 'bg-amber-50/60 dark:bg-amber-950/20' : 'hover:bg-slate-50'}
                    >
                      <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2">
                        <p className="font-bold text-slate-900 flex items-center gap-1">
                          {isMembership && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                          <span>{item.medicineName}</span>
                          {item.unitType === 'LOOSE' ? ' (Loose Tabs)' : ''}
                        </p>
                        <p className="text-[10px] text-slate-500 italic">
                          {isMembership
                            ? `Customer: ${item.membershipDetails?.customerName || invoice.customerName} (${item.membershipDetails?.customerPhone || invoice.customerPhone}) • Duration: ${item.membershipDetails?.durationLabel || '12 Months'}`
                            : item.genericName}
                        </p>
                      </td>
                      <td className="p-2 text-center font-mono text-slate-600">{item.hsnCode || '998319'}</td>
                      <td className="p-2 text-center font-mono font-semibold">{item.batchNumber}</td>
                      <td className="p-2 text-center font-mono text-slate-600">{item.expiryDate?.substring(0, 7) || '—'}</td>
                      <td className="p-2 text-center font-bold font-mono">
                        {isMembership ? '1 Service' : `${item.quantity} ${item.unitType === 'LOOSE' ? 'Tabs (Loose)' : 'Strips'}`}
                      </td>
                      <td className="p-2 text-right font-mono">{item.mrp.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-semibold">{item.rate.toFixed(2)}</td>
                      <td className="p-2 text-center font-mono">{item.gstRate}%</td>
                      <td className="p-2 text-right font-mono font-bold">{item.totalAmount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Calculations & GST Breakup */}
            <div className="mt-4 grid grid-cols-2 gap-4 pt-3 border-t-2 border-slate-300">
              <div className="text-[10px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 uppercase tracking-wider">GST Tax Summary:</p>
                <div className="border border-slate-200 rounded p-2 bg-slate-50 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Taxable Value:</span>
                    <span>₹{(invoice.subTotal - invoice.totalDiscount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Central GST (CGST):</span>
                    <span>₹{invoice.totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>State GST (SGST):</span>
                    <span>₹{invoice.totalSgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-slate-300 pt-1">
                    <span>Total Tax Liability:</span>
                    <span>₹{(invoice.totalCgst + invoice.totalSgst + invoice.totalIgst).toFixed(2)}</span>
                  </div>
                </div>
                <p className="italic text-[10px] pt-1">
                  * Schedule H & H1 drugs sold strictly against registered medical practitioner prescription.
                </p>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Sub Total:</span>
                  <span>₹{invoice.subTotal.toFixed(2)}</span>
                </div>
                {invoice.membershipDiscountAmount && invoice.membershipDiscountAmount > 0 ? (
                  <>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Member Discount ({invoice.membershipDiscountPercent}%):</span>
                      <span>-₹{invoice.membershipDiscountAmount.toFixed(2)}</span>
                    </div>
                    {invoice.totalDiscount - invoice.membershipDiscountAmount > 0 && (
                      <div className="flex justify-between text-amber-600 font-semibold">
                        <span>Standard Discount:</span>
                        <span>-₹{(invoice.totalDiscount - invoice.membershipDiscountAmount).toFixed(2)}</span>
                      </div>
                    )}
                  </>
                ) : invoice.totalDiscount > 0 ? (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span>-₹{invoice.totalDiscount.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-slate-600">
                  <span>Total GST:</span>
                  <span>₹{(invoice.totalCgst + invoice.totalSgst + invoice.totalIgst).toFixed(2)}</span>
                </div>
                {invoice.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Round Off:</span>
                    <span>{invoice.roundOff > 0 ? `+₹${invoice.roundOff.toFixed(2)}` : `-₹${Math.abs(invoice.roundOff).toFixed(2)}`}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2">
                  <span>Grand Total:</span>
                  <span>₹{invoice.grandTotal.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-sans pt-1">
                  Amount Received: ₹{invoice.amountPaid.toFixed(2)} | Balance Due: ₹{invoice.balanceDue.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Footer / Signatory */}
            <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-end text-[10px]">
              <div>
                <p className="font-bold">{settings.invoiceFooterMessage}</p>
                <p className="text-slate-500 mt-1">Subject to {settings.jurisdiction}</p>
              </div>
              <div className="text-center">
                <div className="h-10"></div>
                <p className="font-bold uppercase tracking-wider text-slate-800 border-t border-slate-400 pt-1 px-4">
                  For {settings.storeName}
                </p>
                <p className="text-slate-500 text-[9px]">(Authorized Signatory / Pharmacist)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
