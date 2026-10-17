import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  isPositive?: boolean;
  icon: ReactNode;
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'cyan';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  isPositive = true,
  icon,
  color = 'emerald',
  onClick,
}) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400',
      border: 'hover:border-emerald-500/50',
      pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    blue: {
      bg: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400',
      border: 'hover:border-blue-500/50',
      pill: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    amber: {
      bg: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400',
      border: 'hover:border-amber-500/50',
      pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    rose: {
      bg: 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400',
      border: 'hover:border-rose-500/50',
      pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
    purple: {
      bg: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400',
      border: 'hover:border-purple-500/50',
      pill: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    cyan: {
      bg: 'bg-cyan-500/10 text-cyan-500 dark:bg-cyan-500/20 dark:text-cyan-400',
      border: 'hover:border-cyan-500/50',
      pill: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    },
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-5 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''
      } ${scheme.border}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${scheme.bg}`}>
          {icon}
        </div>
      </div>

      {change && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            {isPositive ? '↑' : '↓'} {change}
          </span>
          <span className="text-slate-400 text-[11px]">vs previous period</span>
        </div>
      )}
    </div>
  );
};
