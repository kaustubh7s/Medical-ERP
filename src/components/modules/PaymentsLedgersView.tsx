'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { PaymentMode, Customer, Supplier } from '@/types/pharmacy';
import { Modal } from '@/components/common/Modal';
import { WalletCards, Plus, Users, Building2, CheckCircle2, ArrowDownLeft, ArrowUpRight, Search, IndianRupee } from 'lucide-react';

export const PaymentsLedgersView: React.FC = () => {
  const { customers, suppliers, payments, recordPayment } = usePharmacy();
  const [activeSubTab, setActiveSubTab] = useState<'RECEIVABLES' | 'PAYABLES' | 'HISTORY'>('RECEIVABLES');
  const [searchTerm, setSearchTerm] = useState('');

  // Record Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'CUSTOMER_COLLECTION' | 'SUPPLIER_PAYMENT'>('CUSTOMER_COLLECTION');
  const [selectedPartyId, setSelectedPartyId] = useState<string>(customers[0]?.id || '');
  const [amount, setAmount] = useState<number>(1000);
  const [mode, setMode] = useState<PaymentMode>('CASH');
  const [refNo, setRefNo] = useState('');
  const [notes, setNotes] = useState('');

  const totalReceivables = customers.reduce((sum, c) => sum + c.currentDue, 0);
  const totalPayables = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  const dueCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleOpenCollect = (c: Customer) => {
    setPaymentType('CUSTOMER_COLLECTION');
    setSelectedPartyId(c.id);
    setAmount(c.currentDue);
    setIsModalOpen(true);
  };

  const handleOpenPay = (s: Supplier) => {
    setPaymentType('SUPPLIER_PAYMENT');
    setSelectedPartyId(s.id);
    setAmount(s.currentBalance);
    setIsModalOpen(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const partyName =
      paymentType === 'CUSTOMER_COLLECTION'
        ? customers.find((c) => c.id === selectedPartyId)?.name || 'Customer'
        : suppliers.find((s) => s.id === selectedPartyId)?.name || 'Supplier';

    recordPayment({
      type: paymentType,
      partyId: selectedPartyId,
      partyName,
      partyType: paymentType === 'CUSTOMER_COLLECTION' ? 'CUSTOMER' : 'SUPPLIER',
      amount,
      paymentMode: mode,
      referenceNumber: refNo,
      notes,
    });

    setIsModalOpen(false);
    setRefNo('');
    setNotes('');
  };

  return (
    <div className="space-y-3">
      {/* Top Header Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <WalletCards className="h-4 w-4 text-emerald-700" />
            Patient Khata Dues & Distributor Payables Ledger
          </h2>
          <p className="text-[11px] text-slate-500 font-mono">
            Total Outstanding Customer Dues: <strong className="text-rose-600">₹{totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> | Supplier Payables: <strong className="text-indigo-600">₹{totalPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {[
            { id: 'RECEIVABLES', label: `1. Patient Khata Dues (${customers.filter((c) => c.currentDue > 0).length})` },
            { id: 'PAYABLES', label: `2. Distributor Payables (${suppliers.filter((s) => s.currentBalance > 0).length})` },
            { id: 'HISTORY', label: `3. Collection Vouchers (${payments.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                activeSubTab === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab 1: PATIENT KHATA DUES */}
      {activeSubTab === 'RECEIVABLES' && (
        <div className="space-y-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patient by name or mobile number to check pending dues..."
              className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Mobile Number</th>
                    <th>Doctor Association</th>
                    <th className="text-right">Credit Limit</th>
                    <th className="text-right">Pending Khata Due</th>
                    <th className="text-center">Due Status</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dueCustomers.map((c) => (
                    <tr key={c.id}>
                      <td className="font-bold text-slate-900 dark:text-slate-100">
                        {c.name}
                        {c.address && <span className="block text-[10px] text-slate-400 font-normal">{c.address}</span>}
                      </td>
                      <td className="font-mono text-slate-600">{c.phone}</td>
                      <td className="text-slate-500">{c.doctorName || 'Self'}</td>
                      <td className="text-right font-mono text-slate-500">₹{c.creditLimit}</td>

                      {/* Pending Due Amount */}
                      <td className="text-right font-mono font-black text-sm">
                        <span className={c.currentDue > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          ₹{c.currentDue.toFixed(2)}
                        </span>
                      </td>

                      <td className="text-center font-bold text-[10px]">
                        {c.currentDue > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                            PAYMENT PENDING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            CLEARED (₹0)
                          </span>
                        )}
                      </td>

                      {/* Collect Cash Button */}
                      <td className="text-center">
                        <button
                          onClick={() => handleOpenCollect(c)}
                          disabled={c.currentDue <= 0}
                          className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] disabled:opacity-30 shadow-xs"
                        >
                          + Collect Cash
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-slate-100 dark:bg-slate-800">
                    <td colSpan={4} className="text-right">Total Outstanding Khata Dues:</td>
                    <td className="text-right font-mono font-black text-rose-600 text-sm">
                      ₹{totalReceivables.toFixed(2)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: DISTRIBUTOR PAYABLES */}
      {activeSubTab === 'PAYABLES' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Distributor Agency</th>
                  <th>Company Firm</th>
                  <th>GSTIN</th>
                  <th>Payment Terms</th>
                  <th className="text-right">Payable Balance</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                    <td className="text-slate-500">{s.companyName}</td>
                    <td className="font-mono text-slate-500">{s.gstNumber}</td>
                    <td className="text-slate-600 font-semibold">{s.paymentTerms}</td>
                    <td className="text-right font-mono font-black text-indigo-700 text-sm">
                      ₹{s.currentBalance.toFixed(2)}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleOpenPay(s)}
                        disabled={s.currentBalance <= 0}
                        className="px-2.5 py-1 rounded bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px] disabled:opacity-30 shadow-xs"
                      >
                        Record Payout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 3: TRANSACTION VOUCHER HISTORY */}
      {activeSubTab === 'HISTORY' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Party Name</th>
                  <th>Voucher Type</th>
                  <th className="text-center">Payment Mode</th>
                  <th className="text-right">Settled Amount (₹)</th>
                  <th>Reference / Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">No payment settlement vouchers logged yet.</td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono text-slate-500">{p.date}</td>
                      <td className="font-bold">{p.partyName}</td>
                      <td className="font-mono text-[10px]">
                        <span className={p.type === 'CUSTOMER_COLLECTION' ? 'text-emerald-700 font-bold' : 'text-indigo-700 font-bold'}>
                          {p.type}
                        </span>
                      </td>
                      <td className="text-center font-mono text-[11px]">{p.paymentMode}</td>
                      <td className="text-right font-mono font-bold text-emerald-700">₹{p.amount.toFixed(2)}</td>
                      <td className="text-slate-500 text-[11px]">{p.notes || p.referenceNumber || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Record Collection / Deposit Voucher */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={paymentType === 'CUSTOMER_COLLECTION' ? 'Collect Customer Khata Payment' : 'Pay Supplier Invoice'}
        subtitle="Immediately updates party ledger balance and adds cash to drawer"
        maxWidth="sm"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold block mb-1">
              {paymentType === 'CUSTOMER_COLLECTION' ? 'Patient Name' : 'Supplier'}
            </label>
            <input
              type="text"
              readOnly
              value={
                paymentType === 'CUSTOMER_COLLECTION'
                  ? customers.find((c) => c.id === selectedPartyId)?.name || ''
                  : suppliers.find((s) => s.id === selectedPartyId)?.name || ''
              }
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-bold bg-slate-100 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1">Amount to Receive / Settle (₹) *</label>
            <input
              type="number"
              min="1"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1">Payment Channel</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PaymentMode)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="CARD">Debit / Credit Card</option>
              <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1">Receipt Note / Ref</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared full month medicine balance"
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm"
          >
            Record Payment Voucher & Update Ledger
          </button>
        </form>
      </Modal>
    </div>
  );
};
