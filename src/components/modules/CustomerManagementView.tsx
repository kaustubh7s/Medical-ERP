'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { Customer, SalesInvoice } from '@/types/pharmacy';
import { Modal } from '@/components/common/Modal';
import {
  Users,
  Search,
  Plus,
  Edit,
  Phone,
  Calendar,
  IndianRupee,
  ShoppingBag,
  History,
  Clock,
  ArrowRight,
  UserCheck,
  RotateCcw,
  MessageSquare,
  Crown,
} from 'lucide-react';

export const CustomerManagementView: React.FC = () => {
  const { customers, invoices, memberships, settings, addCustomer, updateCustomer, setActiveTab } = usePharmacy();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [editingCust, setEditingCust] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [creditLimit, setCreditLimit] = useState(5000);

  const sendWhatsAppDueReminder = (c: Customer) => {
    const phoneNum = c.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phoneNum.length === 10 ? `91${phoneNum}` : phoneNum;
    const message = `*${settings.storeName.toUpperCase()}*%0A` +
      `Namaste ${c.name} ji,%0A` +
      `This is a gentle reminder regarding your pending Khata balance of *₹${c.currentDue.toFixed(2)}* at ${settings.storeName}.%0A%0A` +
      `📲 You can pay via UPI: *bhaleraomedical@icici*%0A` +
      `📞 Contact us: ${settings.phone}%0A` +
      `Thank you for your valued patronage! 🙏`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`, '_blank');
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.doctorName && c.doctorName.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingCust(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setDoctorName('');
    setCreditLimit(5000);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCust(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || '');
    setAddress(c.address || '');
    setDoctorName(c.doctorName || '');
    setCreditLimit(c.creditLimit);
    setIsModalOpen(true);
  };

  const handleOpenHistory = (c: Customer) => {
    setSelectedCust(c);
    setHistoryModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCust) {
      updateCustomer(editingCust.id, {
        name,
        phone,
        email,
        address,
        doctorName,
        creditLimit,
      });
    } else {
      addCustomer({
        name,
        phone,
        email,
        address,
        doctorName,
        creditLimit,
      });
    }
    setIsModalOpen(false);
  };

  // Compute Last Month's purchase summary for a given customer
  const getCustomerPurchaseStats = (cust: Customer) => {
    const custInvoices = invoices.filter((i) => i.customerId === cust.id || i.customerPhone === cust.phone);

    // Sort by date descending
    const sorted = [...custInvoices].sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    const lastInvoice = sorted[0];

    // Compute last month (e.g. previous 30-60 days or previous calendar month)
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    // Also fallback to any invoices before current month
    const lastMonthInvoices = custInvoices.filter((i) => i.invoiceDate.startsWith(prevMonthStr) || i.invoiceDate < now.toISOString().substring(0, 7));
    const lastMonthTotalSpend = lastMonthInvoices.reduce((s, i) => s + i.grandTotal, 0);

    const lastMonthMedicines = lastMonthInvoices.flatMap((i) =>
      i.items.map((item) => ({
        name: item.medicineName,
        qty: item.quantity,
        date: i.invoiceDate.substring(0, 10),
        amount: item.totalAmount,
      }))
    );

    return {
      allInvoices: sorted,
      lastInvoiceDate: lastInvoice ? lastInvoice.invoiceDate.substring(0, 10) : 'Never',
      lastInvoiceAmount: lastInvoice ? lastInvoice.grandTotal : 0,
      lastMonthTotalSpend,
      lastMonthMedicines,
      totalInvoicesCount: custInvoices.length,
    };
  };

  return (
    <div className="space-y-3">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-emerald-700" />
            Patient & Customer Directory ({customers.length} Profiles)
          </h2>
          <p className="text-[11px] text-slate-500 font-mono">
            Track patient khata dues, credit limits, doctor associations, and last month prescription history.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Register New Patient</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient name, mobile number, or prescribing doctor..."
          className="w-full pl-9 pr-4 py-1.5 rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        />
      </div>

      {/* High-Density Customer Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Mobile Number</th>
                <th>Prescribing Doctor</th>
                <th className="text-right">Last Purchase Date</th>
                <th className="text-right">Last Month Purchases</th>
                <th className="text-right">Credit Limit</th>
                <th className="text-right">Current Dues (₹)</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const stats = getCustomerPurchaseStats(c);
                const member = memberships.find(
                  (m) => m.customerPhone === c.phone || (m.customerId && m.customerId === c.id)
                );
                const isMemberActive = Boolean(member && member.status === 'ACTIVE');

                return (
                  <tr key={c.id}>
                    <td
                      onClick={() => handleOpenHistory(c)}
                      className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-emerald-700"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{c.name}</span>
                        {isMemberActive && (
                          <span
                            title="Active Pharmacy Club Member"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                          >
                            <Crown className="h-2.5 w-2.5 text-amber-500" />
                            {member?.membershipId || 'MEMBER'}
                          </span>
                        )}
                      </div>
                      {c.address && <span className="block text-[10px] text-slate-400 font-normal truncate max-w-[180px]">{c.address}</span>}
                    </td>
                    <td className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{c.phone}</td>
                    <td className="text-slate-600 dark:text-slate-400">{c.doctorName || 'Self / Direct'}</td>

                    {/* Last Purchase Date */}
                    <td className="text-right font-mono text-slate-600">
                      {stats.lastInvoiceDate !== 'Never' ? (
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {stats.lastInvoiceDate} (₹{stats.lastInvoiceAmount.toFixed(0)})
                        </span>
                      ) : (
                        <span className="text-slate-400">No prior bills</span>
                      )}
                    </td>

                    {/* Last Month Purchases */}
                    <td className="text-right font-mono font-bold text-purple-700 dark:text-purple-400">
                      {stats.lastMonthTotalSpend > 0 ? (
                        <span title={`${stats.lastMonthMedicines.length} medicines purchased`}>
                          ₹{stats.lastMonthTotalSpend.toFixed(2)} ({stats.lastMonthMedicines.length} items)
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">₹0.00</span>
                      )}
                    </td>

                    <td className="text-right font-mono text-slate-500">₹{c.creditLimit}</td>

                    {/* Current Due */}
                    <td className="text-right font-mono font-black">
                      <span className={c.currentDue > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        ₹{c.currentDue.toFixed(2)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {c.currentDue > 0 && (
                          <button
                            onClick={() => sendWhatsAppDueReminder(c)}
                            title="Send 1-Click WhatsApp Khata Due Reminder"
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>Remind</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenHistory(c)}
                          title="View Last Month Purchase History & Past Prescriptions"
                          className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-[10px] font-bold text-slate-700 dark:text-slate-200"
                        >
                          History
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Customer Profile"
                          className="p-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Comprehensive Customer Last Month Purchase History */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={selectedCust ? `Patient History: ${selectedCust.name}` : 'Purchase History'}
        subtitle={selectedCust ? `Mobile: ${selectedCust.phone} | Doctor: ${selectedCust.doctorName || 'Self'}` : ''}
        maxWidth="lg"
      >
        {selectedCust && (
          <div className="space-y-4 text-xs">
            {/* Quick KPI Row */}
            {(() => {
              const stats = getCustomerPurchaseStats(selectedCust);
              return (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Purchase Date</span>
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">
                        {stats.lastInvoiceDate}
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Month Spend</span>
                      <span className="font-mono text-sm font-black text-purple-700 dark:text-purple-400">
                        ₹{stats.lastMonthTotalSpend.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Khata Dues</span>
                      <span className="font-mono text-sm font-black text-rose-600">
                        ₹{selectedCust.currentDue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Membership Status Ribbon */}
                  {(() => {
                    const custMember = memberships.find(
                      (m) => m.customerPhone === selectedCust.phone || (m.customerId && m.customerId === selectedCust.id)
                    );
                    if (custMember) {
                      return (
                        <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Crown className="h-5 w-5 text-amber-500 shrink-0" />
                            <div>
                              <span className="font-bold text-amber-900 dark:text-amber-200">
                                Pharmacy Club Member: {custMember.membershipId}
                              </span>
                              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                                Plan: <strong>{custMember.durationLabel}</strong> • Expiry: <strong>{custMember.expiryDate}</strong> • Status:{' '}
                                <span className="font-bold uppercase">{custMember.status}</span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryModalOpen(false);
                              setActiveTab('customer-membership');
                            }}
                            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs"
                          >
                            Manage / Renew →
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-400">
                          Customer is not enrolled in Pharmacy Club.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryModalOpen(false);
                            setActiveTab('customer-membership');
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                        >
                          + Enroll in Club (₹29-₹149)
                        </button>
                      </div>
                    );
                  })()}

                  {/* Last Month's Purchased Medicines List */}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[11px] mb-1.5 flex items-center justify-between">
                      <span>Medicines Purchased Last Month ({stats.lastMonthMedicines.length} Formulations)</span>
                      <button
                        onClick={() => {
                          setHistoryModalOpen(false);
                          setActiveTab('pos');
                        }}
                        className="text-[10px] text-emerald-700 hover:underline flex items-center gap-1 font-bold"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Refill / Bill in POS
                      </button>
                    </h4>
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Medicine Form</th>
                          <th className="text-center">Qty Taken</th>
                          <th className="text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.lastMonthMedicines.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-3 text-slate-400">
                              No purchases recorded in the last month.
                            </td>
                          </tr>
                        ) : (
                          stats.lastMonthMedicines.map((m, idx) => (
                            <tr key={idx}>
                              <td className="font-mono text-slate-500">{m.date}</td>
                              <td className="font-bold text-slate-900 dark:text-slate-100">{m.name}</td>
                              <td className="text-center font-mono font-bold">{m.qty} Units</td>
                              <td className="text-right font-mono font-bold text-emerald-700">₹{m.amount.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* All Lifetime Invoices */}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[11px] mb-1.5">
                      Lifetime Bill History ({stats.allInvoices.length} Invoices)
                    </h4>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="erp-table">
                        <thead>
                          <tr>
                            <th>Inv #</th>
                            <th>Date</th>
                            <th className="text-right">Grand Total</th>
                            <th className="text-center">Payment Mode</th>
                            <th className="text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.allInvoices.map((inv) => (
                            <tr key={inv.id}>
                              <td className="font-mono font-bold">{inv.invoiceNumber}</td>
                              <td className="font-mono text-slate-500">{inv.invoiceDate}</td>
                              <td className="text-right font-mono font-bold text-emerald-700">₹{inv.grandTotal.toFixed(2)}</td>
                              <td className="text-center font-mono text-[10px]">{inv.paymentMode}</td>
                              <td className="text-center font-bold text-[10px]">{inv.paymentStatus}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* MODAL: Add / Edit Customer Profile */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCust ? `Edit: ${editingCust.name}` : 'Register New Patient / Customer'}
        subtitle="Manage customer contact, credit limit, and doctor references"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold block mb-1">Patient Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kulkarni"
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold block mb-1">Mobile Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9822114455"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1">Prescribing Doctor</label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="e.g. Dr. Joshi (Cardiologist)"
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1">Residential Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Flat 302, Sai Vihar, Station Road, Pune"
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm"
          >
            Save Patient Profile
          </button>
        </form>
      </Modal>
    </div>
  );
};
