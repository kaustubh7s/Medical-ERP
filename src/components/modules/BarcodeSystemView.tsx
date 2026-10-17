'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { Medicine, Batch } from '@/types/pharmacy';
import { BarcodeGeneratorModal } from '@/components/common/BarcodeGeneratorModal';
import { QrCode, Search, Printer, Copy, Check } from 'lucide-react';

export const BarcodeSystemView: React.FC = () => {
  const { medicines, settings } = usePharmacy();
  const [search, setSearch] = useState('');
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const batchesList: { medicine: Medicine; batch: Batch }[] = [];
  medicines.forEach((med) => {
    med.batches.forEach((b) => {
      if (
        !search.trim() ||
        med.name.toLowerCase().includes(search.toLowerCase()) ||
        b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
        b.barcode.includes(search)
      ) {
        batchesList.push({ medicine: med, batch: b });
      }
    });
  });

  const handleOpenModal = (med: Medicine, b: Batch) => {
    setSelectedMed(med);
    setSelectedBatch(b);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-purple-600" />
            Barcode & QR Code Sticker Printing Studio
          </h2>
          <p className="text-xs text-slate-500">
            Generate Code-128 and 2D QR stickers for batch verification, rack labels, and fast POS scanner checkouts.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by medicine name, batch number, or barcode digits..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        />
      </div>

      {/* Batches Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-slate-400 uppercase text-[10px]">
                <th className="p-2.5">Medicine Product</th>
                <th className="p-2.5">Batch No</th>
                <th className="p-2.5">Expiry Date</th>
                <th className="p-2.5">Barcode (Code128)</th>
                <th className="p-2.5 text-right">MRP (₹)</th>
                <th className="p-2.5 text-center">In Stock</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {batchesList.map(({ medicine, batch }) => (
                <tr key={batch.id}>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{medicine.name}</p>
                    <p className="text-[10px] text-slate-500">{medicine.genericName}</p>
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">{batch.batchNumber}</td>
                  <td className="p-2.5 text-slate-500 font-mono">{batch.expiryDate}</td>
                  <td className="p-2.5 font-mono font-bold text-purple-600 dark:text-purple-400">{batch.barcode}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    ₹{batch.mrp.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-emerald-600">{batch.availableQuantity}</td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => handleOpenModal(medicine, batch)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Labels
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BarcodeGeneratorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        medicine={selectedMed}
        batch={selectedBatch}
      />
    </div>
  );
};
