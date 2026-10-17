'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Medicine, Batch } from '@/types/pharmacy';
import { usePharmacy } from '@/lib/store';
import { Modal } from '@/components/common/Modal';
import { Printer, Copy, Check, Barcode as BarcodeIcon } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';

interface BarcodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  batch: Batch | null;
}

export const BarcodeGeneratorModal: React.FC<BarcodeGeneratorModalProps> = ({
  isOpen,
  onClose,
  medicine,
  batch,
}) => {
  const { settings } = usePharmacy();
  const svgRef = useRef<SVGSVGElement>(null);
  const [copies, setCopies] = useState<number>(12);
  const [copied, setCopied] = useState(false);

  const barcodeValue = batch?.barcode || (batch?.batchNumber ? `890${batch.batchNumber.replace(/[^0-9]/g, '').padEnd(10, '0')}` : '8901234567890');

  useEffect(() => {
    if (isOpen && svgRef.current && barcodeValue) {
      try {
        JsBarcode(svgRef.current, barcodeValue, {
          format: 'CODE128',
          lineColor: '#000',
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 11,
          font: 'monospace',
          margin: 4,
        });
      } catch (err) {
        console.error('Failed to render barcode', err);
      }
    }
  }, [isOpen, barcodeValue]);

  if (!medicine || !batch) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyValue = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Barcode & QR Sticker Studio"
      subtitle={`${medicine.name} • Batch: ${batch.batchNumber}`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Print Copies (Sheet of {copies}):
            </label>
            <select
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value={1}>1 Label (Single)</option>
              <option value={6}>6 Labels</option>
              <option value={12}>12 Labels (Standard Half Sheet)</option>
              <option value={24}>24 Labels (Standard A4 3x8 Sheet)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyValue}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy Code'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Print Sticker Sheet
            </button>
          </div>
        </div>

        {/* Live Preview Label Sheet */}
        <div className="bg-slate-200/70 dark:bg-slate-950 p-6 rounded-2xl overflow-y-auto max-h-[500px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: copies }).map((_, index) => (
              <div
                key={index}
                className="bg-white text-black p-3 rounded-lg border border-slate-300 shadow-sm flex flex-col justify-between h-[155px]"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="truncate font-black text-xs leading-tight">
                      {medicine.name}
                    </div>
                    <span className="text-[9px] font-bold px-1 bg-black text-white rounded">
                      {settings.currencySymbol}{batch.mrp.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-700 truncate">{medicine.genericName}</div>
                </div>

                {/* Barcode & Info */}
                <div className="flex items-center justify-between gap-1 py-1">
                  <div className="w-[70%] flex justify-center">
                    <svg ref={index === 0 ? svgRef : undefined} className="w-full max-h-[45px]" />
                  </div>
                  <div className="w-[28%] flex justify-end">
                    <QRCodeSVG
                      value={`MED:${medicine.name}|B:${batch.batchNumber}|EXP:${batch.expiryDate}|MRP:${batch.mrp}`}
                      size={42}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-[9px] font-mono text-gray-800 border-t border-gray-200 pt-1">
                  <span>B: {batch.batchNumber}</span>
                  <span>Exp: {batch.expiryDate?.substring(0, 7)}</span>
                  <span>{batch.rackLocation.split(',')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
