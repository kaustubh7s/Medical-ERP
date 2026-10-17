'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { Supplier } from '@/types/pharmacy';
import { Modal } from '@/components/common/Modal';
import { Building2, Plus, Search, Phone, Mail, Edit, ShieldCheck } from 'lucide-react';

export const SupplierManagementView: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier } = usePharmacy();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [drugLicenseNumber, setDrugLicenseNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.companyName.toLowerCase().includes(search.toLowerCase()) ||
      s.gstNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingSup(null);
    setName('');
    setCompanyName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstNumber('');
    setDrugLicenseNumber('');
    setPaymentTerms('Net 30 Days');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSup(s);
    setName(s.name);
    setCompanyName(s.companyName);
    setPhone(s.phone);
    setEmail(s.email);
    setAddress(s.address);
    setGstNumber(s.gstNumber);
    setDrugLicenseNumber(s.drugLicenseNumber);
    setPaymentTerms(s.paymentTerms);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSup) {
      updateSupplier(editingSup.id, {
        name,
        companyName,
        phone,
        email,
        address,
        gstNumber,
        drugLicenseNumber,
        paymentTerms,
      });
    } else {
      addSupplier({
        name,
        companyName,
        phone,
        email,
        address,
        gstNumber,
        drugLicenseNumber,
        paymentTerms,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Distributors & Wholesale Suppliers Directory ({suppliers.length})
          </h2>
          <p className="text-xs text-slate-500">
            Manage authorized pharmaceutical distributors, drug license authorizations, and payment credit terms.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
        >
          <Plus className="h-4 w-4" />
          Add Pharma Distributor
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by distributor name, firm company, or GST number..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{s.name}</h3>
                  <p className="text-xs text-slate-500">{s.companyName}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600">
                  {s.paymentTerms}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p className="font-mono">GSTIN: <strong className="text-slate-800 dark:text-slate-200">{s.gstNumber}</strong></p>
                <p className="font-mono">DL No: {s.drugLicenseNumber}</p>
                <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {s.phone}</p>
                <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {s.email}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Ledger Balance Due:</span>
                <span className="font-mono font-black text-rose-600 text-sm">
                  ₹{s.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                onClick={() => handleOpenEdit(s)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSup ? `Edit: ${editingSup.name}` : 'Add Pharmaceutical Distributor'}
        subtitle="Specify wholesale credentials, GSTIN, and credit payment terms"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1">Agency / Distributor Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MedSource Pharma Distributors"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Company Legal Firm Name *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. MedSource Logistics Pvt Ltd"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1">GSTIN Number *</label>
              <input
                type="text"
                required
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="e.g. 27AAECM4455P1ZK"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Drug License No (DL)</label>
              <input
                type="text"
                value={drugLicenseNumber}
                onChange={(e) => setDrugLicenseNumber(e.target.value)}
                placeholder="e.g. MH-SZ1-20B-33441"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9811122334"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="Immediate / COD">Immediate / COD</option>
                <option value="Net 7 Days">Net 7 Days</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 21 Days">Net 21 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
          >
            Save Distributor Profile
          </button>
        </form>
      </Modal>
    </div>
  );
};
