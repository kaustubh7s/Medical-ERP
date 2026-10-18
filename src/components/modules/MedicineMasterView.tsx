'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { Medicine, Batch, ScheduleType } from '@/types/pharmacy';
import { Modal } from '@/components/common/Modal';
import {
  Pill,
  Search,
  Plus,
  Edit,
  Trash2,
  Star,
  Layers,
  History,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';

export const MedicineMasterView: React.FC = () => {
  const {
    medicines,
    invoices,
    purchases,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    toggleFavoriteMedicine,
    toggleMedicineMembershipDiscount,
  } = usePharmacy();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);

  // Form states for Add / Edit
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [category, setCategory] = useState('Antibiotics');
  const [dosageForm, setDosageForm] = useState<Medicine['dosageForm']>('TABLET');
  const [strength, setStrength] = useState('500mg');
  const [packSize, setPackSize] = useState('10 Tablets / Strip');
  const [hsnCode, setHSNCode] = useState('30049099');
  const [gstRate, setGSTRate] = useState(12);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('NORMAL');
  const [reorderLevel, setReorderLevel] = useState(20);
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [isMembershipEligible, setIsMembershipEligible] = useState(true);

  // Initial Batch fields (if adding new medicine)
  const [initialBatchNo, setInitialBatchNo] = useState('');
  const [initialExpiry, setInitialExpiry] = useState('2027-06-30');
  const [initialQty, setInitialQty] = useState(100);
  const [initialCostRate, setInitialCostRate] = useState(60);
  const [initialMrp, setInitialMrp] = useState(85);
  const [initialRack, setInitialRack] = useState('Rack A-1');

  const filtered = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.genericName.toLowerCase().includes(search.toLowerCase()) ||
      m.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      m.hsnCode.includes(search)
  );

  const handleOpenAdd = () => {
    setEditingMed(null);
    setName('');
    setGenericName('');
    setManufacturer('');
    setCategory('Analgesic / Antipyretic');
    setDosageForm('TABLET');
    setStrength('650mg');
    setPackSize('15 Tablets / Strip');
    setHSNCode('30049099');
    setGSTRate(12);
    setScheduleType('NORMAL');
    setReorderLevel(25);
    setRequiresPrescription(false);
    setIsMembershipEligible(true);
    setInitialBatchNo(`BTH-${Math.floor(1000 + Math.random() * 9000)}`);
    setInitialExpiry('2027-12-31');
    setInitialQty(100);
    setInitialCostRate(50);
    setInitialMrp(75);
    setInitialRack('Rack A-1');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (m: Medicine) => {
    setEditingMed(m);
    setName(m.name);
    setGenericName(m.genericName);
    setManufacturer(m.manufacturer);
    setCategory(m.category);
    setDosageForm(m.dosageForm);
    setStrength(m.strength);
    setPackSize(m.packSize);
    setHSNCode(m.hsnCode);
    setGSTRate(m.gstRate);
    setScheduleType(m.scheduleType);
    setReorderLevel(m.reorderLevel);
    setRequiresPrescription(m.requiresPrescription);
    setIsMembershipEligible(m.isMembershipDiscountEligible !== false);
    setIsAddModalOpen(true);
  };

  const handleOpenDetail = (m: Medicine) => {
    setSelectedMed(m);
    setDetailModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMed) {
      updateMedicine(editingMed.id, {
        name,
        genericName,
        manufacturer,
        category,
        dosageForm,
        strength,
        packSize,
        hsnCode,
        gstRate,
        scheduleType,
        reorderLevel,
        requiresPrescription,
        isMembershipDiscountEligible: isMembershipEligible,
      });
    } else {
      addMedicine({
        name,
        genericName,
        manufacturer,
        category,
        dosageForm,
        strength,
        packSize,
        hsnCode,
        gstRate,
        scheduleType,
        reorderLevel,
        maxStockLevel: reorderLevel * 4,
        requiresPrescription,
        isMembershipDiscountEligible: isMembershipEligible,
        initialBatch: initialBatchNo
          ? {
              batchNumber: initialBatchNo,
              mfgDate: '2025-01-01',
              expiryDate: initialExpiry,
              quantity: initialQty,
              availableQuantity: initialQty,
              purchaseRate: initialCostRate,
              mrp: initialMrp,
              saleRate: initialMrp,
              rackLocation: initialRack,
              barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            }
          : undefined,
      });
    }
    setIsAddModalOpen(false);
  };

  // Medicine Sales & Purchase History calculation for detail view
  const medSales = selectedMed
    ? invoices
        .filter((inv) => inv.items.some((i) => i.medicineId === selectedMed.id))
        .map((inv) => {
          const item = inv.items.find((i) => i.medicineId === selectedMed.id);
          return {
            invoiceNumber: inv.invoiceNumber,
            date: inv.invoiceDate,
            customer: inv.customerName,
            batch: item?.batchNumber || '',
            qty: item?.quantity || 0,
            amount: item?.totalAmount || 0,
          };
        })
    : [];

  const medPurchases = selectedMed
    ? purchases
        .filter((pur) => pur.items.some((i) => i.medicineId === selectedMed.id))
        .map((pur) => {
          const item = pur.items.find((i) => i.medicineId === selectedMed.id);
          return {
            grnNumber: pur.grnNumber,
            billNo: pur.billNumber,
            date: pur.billDate,
            supplier: pur.supplierName,
            batch: item?.batchNumber || '',
            qty: (item?.quantity || 0) + (item?.freeQuantity || 0),
            cost: item?.purchaseRate || 0,
          };
        })
    : [];

  const totalUnitsSold = medSales.reduce((s, i) => s + i.qty, 0);
  const totalRevenueGenerated = medSales.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-3">
      {/* Top Header Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Pill className="h-4 w-4 text-emerald-700" />
            Pharmaceutical Drug Master Directory ({medicines.length} Formulations)
          </h2>
          <p className="text-[11px] text-slate-500 font-mono">
            HSN classification, Drug Schedule compliance (Schedule H/H1), and multi-batch distribution
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Add New Medicine</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by brand name, generic composition, manufacturer, or HSN code..."
          className="w-full pl-9 pr-4 py-1.5 rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        />
      </div>

      {/* Spreadsheet Master Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th className="w-8 text-center">Fav</th>
                <th>Brand Name</th>
                <th>Generic Composition</th>
                <th>Dosage / Pack</th>
                <th>HSN Code</th>
                <th className="text-center">GST %</th>
                <th className="text-center">Schedule</th>
                <th className="text-center">Batches</th>
                <th className="text-center">Total Stock</th>
                <th className="text-right">MRP (₹)</th>
                <th className="text-center">Member Disc</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  {/* Favorite Toggle */}
                  <td className="text-center">
                    <button
                      onClick={() => toggleFavoriteMedicine(m.id)}
                      className={`p-0.5 ${m.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-slate-400'}`}
                    >
                      <Star className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </td>

                  {/* Brand & Manufacturer */}
                  <td
                    onClick={() => handleOpenDetail(m)}
                    className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-emerald-700"
                  >
                    {m.name}
                    <span className="block text-[10px] text-slate-400 font-normal">{m.manufacturer}</span>
                  </td>

                  <td className="text-slate-600 dark:text-slate-300 text-[11px]">{m.genericName}</td>
                  <td className="text-slate-500 text-[10px] font-mono">{m.packSize}</td>
                  <td className="font-mono text-slate-500 text-[11px]">{m.hsnCode}</td>
                  <td className="text-center font-mono text-slate-600">{m.gstRate}%</td>

                  {/* Schedule Badge */}
                  <td className="text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        m.scheduleType === 'SCHEDULE_H1'
                          ? 'bg-red-100 text-red-800'
                          : m.scheduleType === 'SCHEDULE_H'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.scheduleType}
                    </span>
                  </td>

                  <td className="text-center font-mono font-bold text-slate-600">{m.batches.length}</td>

                  {/* Total Stock */}
                  <td className="text-center font-mono font-black">
                    <span className={m.totalStock <= m.reorderLevel ? 'text-rose-600' : 'text-emerald-700'}>
                      {m.totalStock}
                    </span>
                  </td>

                  <td className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    ₹{m.batches[0]?.mrp || 0}
                  </td>

                  {/* Member Loyalty Discount Toggle */}
                  <td className="text-center">
                    <button
                      type="button"
                      onClick={() => toggleMedicineMembershipDiscount(m.id)}
                      title={m.isMembershipDiscountEligible !== false ? '10%/20% Loyalty Disc Eligible (Click to exclude)' : 'Excluded from Loyalty Disc (Click to include)'}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                        m.isMembershipDiscountEligible !== false
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200'
                      }`}
                    >
                      {m.isMembershipDiscountEligible !== false ? '✓ 10/20%' : '✗ Excluded'}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenDetail(m)}
                        title="View Full Medicine Audit & Batch Details"
                        className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-[10px] font-bold"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => handleOpenEdit(m)}
                        title="Edit Master Specifications"
                        className="p-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Comprehensive Medicine Deep Dive Detail Page */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedMed ? `${selectedMed.name} (${selectedMed.strength})` : 'Medicine Detail'}
        subtitle={selectedMed ? `Generic: ${selectedMed.genericName} | Mfr: ${selectedMed.manufacturer}` : ''}
        maxWidth="xl"
      >
        {selectedMed && (
          <div className="space-y-4 text-xs">
            {/* Quick KPI Row */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Stock</span>
                <span className="font-mono text-base font-black text-emerald-700">{selectedMed.totalStock} Units</span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Batches</span>
                <span className="font-mono text-base font-black text-slate-800 dark:text-slate-200">{selectedMed.batches.length}</span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Units Sold</span>
                <span className="font-mono text-base font-black text-blue-700">{totalUnitsSold}</span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Revenue Generated</span>
                <span className="font-mono text-base font-black text-purple-700">₹{totalRevenueGenerated.toFixed(2)}</span>
              </div>
            </div>

            {/* Section 1: Multi-Batch Expiry Distribution */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[11px] mb-1.5">
                1. Batch Inventory & Expiry Schedule
              </h4>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Batch No</th>
                    <th>Mfg Date</th>
                    <th>Expiry Date</th>
                    <th>Rack / Shelf</th>
                    <th className="text-center">Available Stock</th>
                    <th className="text-right">Purchase Rate</th>
                    <th className="text-right">MRP</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMed.batches.map((b) => (
                    <tr key={b.id}>
                      <td className="font-mono font-bold">{b.batchNumber}</td>
                      <td className="font-mono text-slate-500">{b.mfgDate}</td>
                      <td className="font-mono font-semibold">{b.expiryDate}</td>
                      <td className="font-mono text-slate-500">{b.rackLocation}</td>
                      <td className="text-center font-mono font-bold">{b.availableQuantity}</td>
                      <td className="text-right font-mono text-slate-500">₹{b.purchaseRate}</td>
                      <td className="text-right font-mono font-bold text-emerald-700">₹{b.saleRate || b.mrp}</td>
                      <td className="text-center font-bold text-[10px]">
                        <span className={b.status === 'NEAR_EXPIRY' ? 'text-orange-600' : b.status === 'EXPIRED' ? 'text-red-600' : 'text-emerald-700'}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 2: Recent Sales Invoices for this Medicine */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[11px] mb-1.5">
                2. Recent Sales Dispensing Register ({medSales.length})
              </h4>
              <div className="max-h-36 overflow-y-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Batch</th>
                      <th className="text-center">Qty Dispensed</th>
                      <th className="text-right">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medSales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-3 text-slate-400">No sales recorded yet.</td>
                      </tr>
                    ) : (
                      medSales.map((s, idx) => (
                        <tr key={idx}>
                          <td className="font-mono font-bold">{s.invoiceNumber}</td>
                          <td className="font-mono text-slate-500">{s.date}</td>
                          <td>{s.customer}</td>
                          <td className="font-mono">{s.batch}</td>
                          <td className="text-center font-mono font-bold">{s.qty}</td>
                          <td className="text-right font-mono font-bold text-emerald-700">₹{s.amount.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Add / Edit Medicine Master Form */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingMed ? `Edit: ${editingMed.name}` : 'Add New Medicine Formulation'}
        subtitle="Specify brand name, active salts, regulatory schedule, and initial batch"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold block mb-1">Brand Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dolo 650"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1">Generic / Salt Formula *</label>
              <input
                type="text"
                required
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g. Paracetamol 650mg"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold block mb-1">Manufacturer</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Micro Labs"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1">Packaging Form</label>
              <input
                type="text"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder="e.g. 15 Tablets / Strip"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1">HSN Code *</label>
              <input
                type="text"
                required
                value={hsnCode}
                onChange={(e) => setHSNCode(e.target.value)}
                placeholder="30049099"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold block mb-1">GST Tax Rate</label>
              <select
                value={gstRate}
                onChange={(e) => setGSTRate(parseInt(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5% (Life Saving)</option>
                <option value={12}>12% (Standard Pharma)</option>
                <option value={18}>18% (Supplements/Cosmetic)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1">Drug Schedule</label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
              >
                <option value="NORMAL">Normal / OTC</option>
                <option value="SCHEDULE_H">Schedule H (Prescription)</option>
                <option value="SCHEDULE_H1">Schedule H1 (Controlled Antibiotic)</option>
                <option value="SCHEDULE_X">Schedule X (Narcotic)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1">Reorder Minimum Qty</label>
              <input
                type="number"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(parseInt(e.target.value) || 20)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-mono text-xs"
              />
            </div>
          </div>

          {!editingMed && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Initial Opening Batch</span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Batch No (e.g. DL65-812)"
                  value={initialBatchNo}
                  onChange={(e) => setInitialBatchNo(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono"
                />
                <input
                  type="date"
                  value={initialExpiry}
                  onChange={(e) => setInitialExpiry(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono"
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={initialQty}
                  onChange={(e) => setInitialQty(parseInt(e.target.value) || 0)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono"
                />
                <input
                  type="number"
                  placeholder="Cost Price (₹)"
                  value={initialCostRate}
                  onChange={(e) => setInitialCostRate(parseFloat(e.target.value) || 0)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono"
                />
                <input
                  type="number"
                  placeholder="MRP Price (₹)"
                  value={initialMrp}
                  onChange={(e) => setInitialMrp(parseFloat(e.target.value) || 0)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold"
                />
                <input
                  type="text"
                  placeholder="Rack (e.g. Rack A-1)"
                  value={initialRack}
                  onChange={(e) => setInitialRack(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Membership Loyalty Discount Eligibility
              </span>
              <span className="text-[10px] text-slate-500">
                Eligible medicines receive 10% / 20% discount for registered club members
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isMembershipEligible}
                onChange={(e) => setIsMembershipEligible(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm"
          >
            Save Drug Master Specifications
          </button>
        </form>
      </Modal>
    </div>
  );
};
