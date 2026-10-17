'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePharmacy } from '@/lib/store';
import {
  Search,
  ShoppingCart,
  Boxes,
  FileText,
  Building2,
  Users,
  BadgePercent,
  Sparkles,
  Pill,
  ArrowRight,
  Command,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const { medicines, setActiveTab } = usePharmacy();
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const activeItemRef = useRef<HTMLDivElement | HTMLButtonElement>(null);

  const quickActions = [
    { label: 'New POS Billing (F2)', icon: ShoppingCart, tab: 'pos' },
    { label: 'Customer Membership & Loyalty', icon: Users, tab: 'membership' },
    { label: 'Medicine Master Catalog', icon: Pill, tab: 'medicines' },
    { label: 'Live Inventory & Batches', icon: Boxes, tab: 'inventory' },
    { label: 'Expiry & Clearance Dashboard', icon: FileText, tab: 'expiry' },
    { label: 'AI Demand Forecasting', icon: Sparkles, tab: 'ai-assistant' },
    { label: 'Profit & Loss (P&L)', icon: BadgePercent, tab: 'pnl' },
    { label: 'Customer CRM & Ledgers', icon: Users, tab: 'customers' },
    { label: 'Supplier Procurement', icon: Building2, tab: 'purchases' },
  ];

  const filteredMedicines = query.trim().length > 0
    ? medicines
        .filter(
          (m) =>
            m.name.toLowerCase().includes(query.toLowerCase()) ||
            m.genericName.toLowerCase().includes(query.toLowerCase()) ||
            m.category.toLowerCase().includes(query.toLowerCase()) ||
            m.batches.some((b) => b.batchNumber.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 6)
    : [];

  const totalItems = filteredMedicines.length > 0 ? filteredMedicines.length : quickActions.length;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
        return;
      }
      if (isOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredMedicines.length > 0) {
            setActiveTab('medicines');
            onClose();
          } else if (quickActions[highlightedIndex]) {
            setActiveTab(quickActions[highlightedIndex].tab);
            onClose();
          }
        }
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, setActiveTab, totalItems, filteredMedicines, highlightedIndex, quickActions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <Search className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mr-3" />
          <input
            type="text"
            placeholder="Search medicine, salt, batch, or module..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-medium"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Medicines matching */}
          {query.trim().length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 mb-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Medicines in Stock ({filteredMedicines.length})
                </p>
              </div>
              <div className="space-y-1 mt-1">
                {filteredMedicines.map((med, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <div
                      key={med.id}
                      ref={isHighlighted ? (activeItemRef as React.RefObject<HTMLDivElement>) : undefined}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => {
                        setActiveTab('medicines');
                        onClose();
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-emerald-100/90 dark:bg-emerald-950/70 border-l-4 border-l-emerald-600 shadow-xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isHighlighted ? 'bg-emerald-600 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                          <Pill className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100">{med.name}</p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">{med.genericName} • {med.packSize}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                          {med.totalStock} in stock
                        </span>
                        <p className="text-[10px] font-mono text-slate-500">📍 {med.batches[0]?.rackLocation || 'A-1'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Navigations */}
          <div>
            <div className="flex items-center justify-between px-3 mb-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Shortcuts & Modules
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                const isHighlighted = query.trim().length === 0 && idx === highlightedIndex;
                return (
                  <button
                    key={idx}
                    ref={isHighlighted ? (activeItemRef as React.RefObject<HTMLButtonElement>) : undefined}
                    onMouseEnter={() => {
                      if (query.trim().length === 0) setHighlightedIndex(idx);
                    }}
                    onClick={() => {
                      setActiveTab(action.tab);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                      isHighlighted
                        ? 'bg-emerald-100/90 dark:bg-emerald-950/70 border-l-4 border-l-emerald-600 text-slate-900 dark:text-white font-bold shadow-xs'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isHighlighted ? 'text-emerald-700 dark:text-emerald-300' : 'text-emerald-500'}`} />
                      <span className="text-xs font-bold">{action.label}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
