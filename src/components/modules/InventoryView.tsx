'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { Medicine, Batch } from '@/types/pharmacy';
import { Modal } from '@/components/common/Modal';
import { BarcodeGeneratorModal } from '@/components/common/BarcodeGeneratorModal';
import { parseUnitsPerPack, formatStockDisplay } from '@/lib/units';
import {
  Boxes,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  QrCode,
  Edit,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  PlusCircle,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { medicines, adjustStock, transferBatchLocation, addBatchToMedicine, addMedicine } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'HEALTHY' | 'LOW_STOCK' | 'NEAR_EXPIRY' | 'EXPIRED'>('ALL');

  // Manual Add Medicine & Batch Modal
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newGenericName, setNewGenericName] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('Cipla / Sun Pharma');
  const [newPackSize, setNewPackSize] = useState('10 Tablets / Strip');
  const [newHsn, setNewHsn] = useState('30049099');
  const [newGst, setNewGst] = useState(12);
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newMfgDate, setNewMfgDate] = useState('2025-01-01');
  const [newExpiryDate, setNewExpiryDate] = useState('2027-12-31');
  const [newQty, setNewQty] = useState(50);
  const [newCostRate, setNewCostRate] = useState(40);
  const [newMrp, setNewMrp] = useState(65);
  const [newRack, setNewRack] = useState('Rack A-1');

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical Stock Reconciliation');

  // Barcode Sheet Modal
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeBatch, setBarcodeBatch] = useState<{ batch: Batch; medicine: Medicine } | null>(null);

  const today = new Date();

  // Flatten medicines and batches into spreadsheet rows
  const allRows = medicines.flatMap((med) =>
    med.batches.map((batch) => {
      const exp = new Date(batch.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const totalMedStock = med.batches.reduce((s, b) => s + b.availableQuantity, 0);

      let statusType: 'HEALTHY' | 'LOW_STOCK' | 'NEAR_EXPIRY' | 'EXPIRED' = 'HEALTHY';
      if (diffDays <= 0) {
        statusType = 'EXPIRED';
      } else if (diffDays <= 90) {
        statusType = 'NEAR_EXPIRY';
      } else if (totalMedStock <= med.reorderLevel) {
        statusType = 'LOW_STOCK';
      }

      const marginPercent = batch.mrp > 0 ? (((batch.mrp - batch.purchaseRate) / batch.mrp) * 100).toFixed(1) : '0';
      const stockValuation = batch.availableQuantity * batch.purchaseRate;

      return {
        medicine: med,
        batch,
        diffDays,
        statusType,
        marginPercent,
        stockValuation,
      };
    })
  );

  const filteredRows = allRows.filter((row) => {
    const matchesSearch =
      row.medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.medicine.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.batch.rackLocation.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'ALL') return true;
    return row.statusType === activeFilter;
  });

  const totalHoldingValue = allRows.reduce((sum, r) => sum + r.stockValuation, 0);

  const handleOpenAdjust = (med: Medicine, batch: Batch) => {
    setSelectedMed(med);
    setSelectedBatch(batch);
    setNewStockQty(batch.availableQuantity);
    setAdjustReason('Physical Stock Audit Difference');
    setAdjustModalOpen(true);
  };

  const handleSaveAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMed && selectedBatch) {
      adjustStock(selectedMed.id, selectedBatch.id, newStockQty, adjustReason);
      setAdjustModalOpen(false);
    }
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName || !newBatchNo) return;

    // Check if medicine already exists
    const existingMed = medicines.find((m) => m.name.toLowerCase() === newMedName.toLowerCase());

    if (existingMed) {
      addBatchToMedicine(existingMed.id, {
        batchNumber: newBatchNo,
        mfgDate: newMfgDate,
        expiryDate: newExpiryDate,
        quantity: newQty,
        availableQuantity: newQty,
        purchaseRate: newCostRate,
        mrp: newMrp,
        saleRate: newMrp,
        rackLocation: newRack,
        barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      });
    } else {
      addMedicine({
        name: newMedName,
        genericName: newGenericName || newMedName,
        manufacturer: newManufacturer,
        category: 'General Therapeutics',
        dosageForm: 'TABLET',
        strength: 'Standard',
        packSize: newPackSize,
        hsnCode: newHsn,
        gstRate: newGst,
        scheduleType: 'NORMAL',
        reorderLevel: 20,
        maxStockLevel: 200,
        requiresPrescription: false,
        initialBatch: {
          batchNumber: newBatchNo,
          mfgDate: newMfgDate,
          expiryDate: newExpiryDate,
          quantity: newQty,
          availableQuantity: newQty,
          purchaseRate: newCostRate,
          mrp: newMrp,
          saleRate: newMrp,
          rackLocation: newRack,
          barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        },
      });
    }

    setIsManualAddOpen(false);
    setNewMedName('');
    setNewGenericName('');
    setNewBatchNo('');
  };

  const handlePrintBarcode = (med: Medicine, batch: Batch) => {
    setBarcodeBatch({ medicine: med, batch });
    setBarcodeModalOpen(true);
  };

  return (
    <div className="space-y-3">
      {/* Top Inventory Status Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Boxes className="h-4 w-4 text-emerald-700" />
            Inventory Stock & Batch Master ({allRows.length} Batches)
          </h2>
          <p className="text-[11px] text-slate-500 font-mono">
            Total Inventory Cost Value: <strong className="text-emerald-700">₹{totalHoldingValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual Add Medicine to Inventory Button */}
          <button
            onClick={() => {
              setNewBatchNo(`BTH-${Math.floor(1000 + Math.random() * 9000)}`);
              setIsManualAddOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>+ Add Medicine to Inventory Manually</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-xs">
          {[
            { id: 'ALL', label: `All (${allRows.length})` },
            { id: 'HEALTHY', label: `Healthy (${allRows.filter((r) => r.statusType === 'HEALTHY').length})` },
            { id: 'LOW_STOCK', label: `Low Stock (${allRows.filter((r) => r.statusType === 'LOW_STOCK').length})` },
            { id: 'NEAR_EXPIRY', label: `Near Expiry (${allRows.filter((r) => r.statusType === 'NEAR_EXPIRY').length})` },
            { id: 'EXPIRED', label: `Expired (${allRows.filter((r) => r.statusType === 'EXPIRED').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                activeFilter === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicine, salt, batch, rack..."
            className="w-full pl-8 pr-3 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          />
        </div>
      </div>

      {/* High-Density Spreadsheet Table (Desktop Only - Strictly Preserved) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Medicine Brand Name</th>
                <th>Generic Salt</th>
                <th>Batch No</th>
                <th>Expiry</th>
                <th>Rack</th>
                <th className="text-center">Stock</th>
                <th className="text-right">Cost Rate</th>
                <th className="text-right">MRP / Selling</th>
                <th className="text-center">Margin %</th>
                <th className="text-right">Stock Valuation</th>
                <th className="text-center">Health Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-slate-400 text-xs">
                    No matching inventory batches found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={`${row.medicine.id}-${row.batch.id}-${idx}`}>
                    <td className="font-bold text-slate-900 dark:text-slate-100">{row.medicine.name}</td>
                    <td className="text-slate-500 text-[11px]">{row.medicine.genericName}</td>
                    <td className="font-mono font-semibold text-slate-800 dark:text-slate-200">{row.batch.batchNumber}</td>
                    <td className="font-mono text-slate-600 text-[11px]">
                      <span className={row.statusType === 'EXPIRED' ? 'text-red-600 font-bold' : row.statusType === 'NEAR_EXPIRY' ? 'text-orange-600 font-bold' : ''}>
                        {row.batch.expiryDate}
                      </span>
                    </td>
                    <td className="font-mono text-slate-500 text-[11px]">{row.batch.rackLocation}</td>
                    <td className="text-center font-mono">
                      <span className="font-black text-slate-900 dark:text-slate-100 text-xs block">
                        {formatStockDisplay(row.batch.availableQuantity, parseUnitsPerPack(row.medicine.packSize, row.medicine.dosageForm, row.medicine.unitsPerPack)).displayText}
                      </span>
                    </td>
                    <td className="text-right font-mono text-slate-500">₹{row.batch.purchaseRate.toFixed(2)}</td>
                    <td className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      ₹{(row.batch.saleRate || row.batch.mrp).toFixed(2)}
                    </td>
                    <td className="text-center font-mono text-emerald-700 font-bold">{row.marginPercent}%</td>
                    <td className="text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₹{row.stockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status Color Badge */}
                    <td className="text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.statusType === 'HEALTHY'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : row.statusType === 'LOW_STOCK'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300'
                            : row.statusType === 'NEAR_EXPIRY'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                        }`}
                      >
                        {row.statusType === 'HEALTHY' && '● Healthy'}
                        {row.statusType === 'LOW_STOCK' && '▲ Low Stock'}
                        {row.statusType === 'NEAR_EXPIRY' && `⏱ ${row.diffDays}d Expiry`}
                        {row.statusType === 'EXPIRED' && '✖ Expired'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenAdjust(row.medicine, row.batch)}
                          title="Reconcile Physical Stock"
                          className="p-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handlePrintBarcode(row.medicine, row.batch)}
                          title="Print Barcode Labels"
                          className="p-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600"
                        >
                          <QrCode className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          Dedicated Mobile Inventory Cards List (Zero Horizontal Scroll!)
         ========================================================================= */}
      <div className="md:hidden space-y-2.5">
        {filteredRows.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400">
            <Boxes className="h-10 w-10 mx-auto mb-2 opacity-30 text-emerald-600" />
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No matching stock batches found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          filteredRows.map((row, idx) => (
            <div
              key={`${row.medicine.id}-${row.batch.id}-${idx}`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5"
            >
              {/* Header: Medicine Name & Health Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {row.medicine.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {row.medicine.genericName}
                  </p>
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold shrink-0 ${
                    row.statusType === 'HEALTHY'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : row.statusType === 'LOW_STOCK'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300'
                      : row.statusType === 'NEAR_EXPIRY'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                  }`}
                >
                  {row.statusType === 'HEALTHY' && '● Healthy'}
                  {row.statusType === 'LOW_STOCK' && '▲ Low Stock'}
                  {row.statusType === 'NEAR_EXPIRY' && `⏱ ${row.diffDays}d Left`}
                  {row.statusType === 'EXPIRED' && '✖ Expired'}
                </span>
              </div>

              {/* Batch & Rack Strip */}
              <div className="flex items-center justify-between text-[11px] font-mono bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                <span>Batch: <strong className="text-slate-800 dark:text-slate-200">{row.batch.batchNumber}</strong></span>
                <span>Rack: <strong className="text-slate-800 dark:text-slate-200">{row.batch.rackLocation}</strong></span>
                <span className={row.statusType === 'EXPIRED' ? 'text-red-600 font-bold' : row.statusType === 'NEAR_EXPIRY' ? 'text-orange-600 font-bold' : 'text-slate-600'}>
                  Exp: {row.batch.expiryDate}
                </span>
              </div>

              {/* 3 Metrics: Stock, MRP, Margin */}
              <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
                <div className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] uppercase text-slate-400 font-sans block">Stock</span>
                  <span className={`font-black ${row.statusType === 'LOW_STOCK' ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {row.batch.availableQuantity}
                  </span>
                </div>
                <div className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] uppercase text-slate-400 font-sans block">MRP</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{(row.batch.saleRate || row.batch.mrp).toFixed(2)}
                  </span>
                </div>
                <div className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] uppercase text-slate-400 font-sans block">Margin</span>
                  <span className="font-bold text-emerald-700">
                    {row.marginPercent}%
                  </span>
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400 font-mono">
                  Val: ₹{row.stockValuation.toFixed(0)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenAdjust(row.medicine, row.batch)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Adjust</span>
                  </button>
                  <button
                    onClick={() => handlePrintBarcode(row.medicine, row.batch)}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                    title="Print Barcode"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: Add Medicine & Batch to Inventory Manually */}
      <Modal
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        title="Add Medicine & Batch Directly to Inventory"
        subtitle="Quick manual entry without creating full purchase supplier invoice"
        maxWidth="md"
      >
        <form onSubmit={handleManualAddSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold block mb-1">Medicine Brand Name *</label>
              <input
                type="text"
                required
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                placeholder="e.g. Limcee 500mg"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">Generic / Salt Formula</label>
              <input
                type="text"
                value={newGenericName}
                onChange={(e) => setNewGenericName(e.target.value)}
                placeholder="e.g. Vitamin C / Ascorbic Acid"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-bold block mb-1">Batch Number *</label>
              <input
                type="text"
                required
                value={newBatchNo}
                onChange={(e) => setNewBatchNo(e.target.value)}
                placeholder="e.g. LC-901"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">Expiry Date *</label>
              <input
                type="date"
                required
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">Stock Quantity (Units) *</label>
              <input
                type="number"
                min="1"
                required
                value={newQty}
                onChange={(e) => setNewQty(parseInt(e.target.value) || 1)}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-bold block mb-1">Purchase Cost Rate (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={newCostRate}
                onChange={(e) => setNewCostRate(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">MRP Selling Price (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={newMrp}
                onChange={(e) => setNewMrp(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">Rack / Shelf Location</label>
              <input
                type="text"
                value={newRack}
                onChange={(e) => setNewRack(e.target.value)}
                placeholder="Rack A-1"
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold block mb-1">Packaging Strip</label>
              <input
                type="text"
                value={newPackSize}
                onChange={(e) => setNewPackSize(e.target.value)}
                placeholder="10 Tablets / Strip"
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">GST Tax Rate</label>
              <select
                value={newGst}
                onChange={(e) => setNewGst(parseInt(e.target.value))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5% (Life Saving)</option>
                <option value={12}>12% (Standard Pharma)</option>
                <option value={18}>18% (Supplements)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm"
          >
            Add to Inventory Immediately
          </button>
        </form>
      </Modal>

      {/* MODAL: Stock Reconciliation */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={selectedMed ? `Adjust Stock: ${selectedMed.name} (Batch: ${selectedBatch?.batchNumber})` : 'Adjust Stock'}
        subtitle="Record physical stock count discrepancy"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveAdjust} className="space-y-3">
          <div>
            <label className="text-xs font-bold block mb-1">New Physical Quantity (Units) *</label>
            <input
              type="number"
              min="0"
              required
              value={newStockQty}
              onChange={(e) => setNewStockQty(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Adjustment Reason *</label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs"
            >
              <option value="Physical Stock Audit Difference">Physical Stock Audit Difference</option>
              <option value="Breakage / Leakage Write-off">Breakage / Leakage Write-off</option>
              <option value="Found Unrecorded Stock">Found Unrecorded Stock</option>
              <option value="Physician Sample Conversion">Physician Sample Conversion</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm"
          >
            Update Stock Balance
          </button>
        </form>
      </Modal>

      {/* Barcode Sticker Generator Modal */}
      {barcodeBatch && (
        <BarcodeGeneratorModal
          isOpen={barcodeModalOpen}
          onClose={() => {
            setBarcodeModalOpen(false);
            setBarcodeBatch(null);
          }}
          medicine={barcodeBatch.medicine}
          batch={barcodeBatch.batch}
        />
      )}
    </div>
  );
};
