'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { Expense, PaymentMode } from '@/types/pharmacy';
import { Modal } from '@/components/common/Modal';
import { PaymentModeBadge } from '@/components/common/Badge';
import { Coins, Plus, Trash2, Calendar, FileText } from 'lucide-react';

export const ExpenseManagementView: React.FC = () => {
  const { expenses, addExpense, deleteExpense } = usePharmacy();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('MISCELLANEOUS');
  const [amount, setAmount] = useState<number>(1000);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [paidTo, setPaidTo] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addExpense({
      date: new Date().toISOString().substring(0, 10),
      category,
      title,
      amount,
      paymentMode,
      paidTo,
      receiptNumber,
      notes,
    });
    setIsModalOpen(false);
    setTitle('');
    setPaidTo('');
    setReceiptNumber('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Operational Expense Management ({expenses.length})
          </h2>
          <p className="text-xs text-slate-500">
            Total Overheads Logged: <strong className="text-rose-600 font-mono">₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md"
        >
          <Plus className="h-4 w-4" />
          Add Expense Voucher
        </button>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-slate-400 uppercase text-[10px]">
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Expense Title</th>
                <th className="p-2.5">Paid To</th>
                <th className="p-2.5">Mode</th>
                <th className="p-2.5 text-right">Amount (₹)</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td className="p-2.5 font-mono text-slate-500">{exp.date}</td>
                  <td className="p-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{exp.title}</p>
                    {exp.receiptNumber && <p className="text-[10px] text-slate-400">Rcpt: {exp.receiptNumber}</p>}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-300">{exp.paidTo}</td>
                  <td className="p-2.5"><PaymentModeBadge mode={exp.paymentMode} /></td>
                  <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                    ₹{exp.amount.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record New Expense Voucher"
        subtitle="Log rent, electricity, salaries, or miscellaneous costs"
        maxWidth="md"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1">Expense Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Expense['category'])}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            >
              <option value="RENT">Shop Rent</option>
              <option value="ELECTRICITY">Electricity & AC Power</option>
              <option value="SALARIES">Staff Salaries</option>
              <option value="PACKAGING">Packaging & Carry Bags</option>
              <option value="INTERNET">Internet & Software</option>
              <option value="MAINTENANCE">Maintenance & Repairs</option>
              <option value="MISCELLANEOUS">Miscellaneous Overheads</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Expense Title / Description *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MSEB Commercial Power Bill"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-right"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="UPI">UPI / QR</option>
                <option value="CASH">Cash Drawer</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Paid To *</label>
            <input
              type="text"
              required
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="e.g. MSEB Maharashtra"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md"
          >
            Save Expense Voucher
          </button>
        </form>
      </Modal>
    </div>
  );
};
