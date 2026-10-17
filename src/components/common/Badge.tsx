import React from 'react';
import { ScheduleType, PaymentMode } from '@/types/pharmacy';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'slate' | 'indigo' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 border-cyan-500/20',
    slate: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border-slate-500/20',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-mono tracking-tight uppercase ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const ScheduleBadge: React.FC<{ schedule: ScheduleType }> = ({ schedule }) => {
  switch (schedule) {
    case 'SCHEDULE_H1':
      return <Badge variant="rose">⚡ Schedule H1 (Prescription Only)</Badge>;
    case 'SCHEDULE_H':
      return <Badge variant="amber">Rx Schedule H</Badge>;
    case 'SCHEDULE_X':
      return <Badge variant="purple">⛔ Schedule X (Narcotics)</Badge>;
    case 'NARCOTIC':
      return <Badge variant="rose">☠️ Narcotic / Strict Control</Badge>;
    case 'OTC':
      return <Badge variant="emerald">OTC (Over Counter)</Badge>;
    default:
      return <Badge variant="slate">General Rx</Badge>;
  }
};

export const PaymentModeBadge: React.FC<{ mode: PaymentMode }> = ({ mode }) => {
  switch (mode) {
    case 'UPI':
      return <Badge variant="indigo">📱 UPI / QR</Badge>;
    case 'CASH':
      return <Badge variant="emerald">💵 CASH</Badge>;
    case 'CARD':
      return <Badge variant="blue">💳 CARD / POS</Badge>;
    case 'CREDIT':
      return <Badge variant="amber">⏳ CREDIT / DUE</Badge>;
    case 'BANK_TRANSFER':
      return <Badge variant="cyan">🏦 NEFT/RTGS</Badge>;
    case 'SPLIT':
      return <Badge variant="purple">🔀 SPLIT</Badge>;
    default:
      return <Badge variant="slate">{mode}</Badge>;
  }
};
