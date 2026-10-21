'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { UserRole } from '@/types/pharmacy';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  PlusCircle,
  ShoppingCart,
  ShieldCheck,
  UserCheck,
  Wifi,
  Sparkles,
  Command,
} from 'lucide-react';

interface HeaderProps {
  onOpenCommand: () => void;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommand, onOpenNotifications }) => {
  const {
    currentUser,
    users,
    setCurrentUser,
    activeTab,
    setActiveTab,
    darkMode,
    toggleDarkMode,
    soundEnabled,
    toggleSound,
    notifications,
    settings,
    isOnline,
    offlineQueueCount,
    toggleNetworkSimulation,
    syncOfflineQueue,
    cloudSyncStatus,
    lastCloudSyncedAt,
    syncWithCloudNow,
  } = usePharmacy();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleColors: Record<UserRole, string> = {
    OWNER: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    MANAGER: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    PHARMACIST: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    CASHIER: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    STAFF: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-4 md:px-6 backdrop-blur-md transition-colors">
      {/* Left Search / Command trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCommand}
          className="flex h-10 w-64 md:w-80 items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-3.5 text-xs text-slate-500 hover:border-emerald-500/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-inner"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <span className="truncate">Search medicines, batches, bills...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
            Shift + K
          </kbd>
        </button>

        {/* Quick Launch POS Billing (Shift+F2) */}
        <button
          onClick={() => setActiveTab('pos')}
          className="hidden lg:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all active:scale-95"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>New Sale (POS)</span>
          <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px]">Shift+F2</span>
        </button>
      </div>

      {/* Right Action Icons & User Switcher */}
      <div className="flex items-center gap-2.5 md:gap-3.5">
        {/* Neon Cloud Database Live Sync Status Pill */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => syncWithCloudNow()}
            title={
              cloudSyncStatus === 'CONNECTED'
                ? `Neon Cloud PostgreSQL: Connected & Synced (Last: ${lastCloudSyncedAt ? new Date(lastCloudSyncedAt).toLocaleTimeString() : 'Just now'}) — Click to Refresh`
                : cloudSyncStatus === 'SYNCING'
                ? 'Syncing with Neon Cloud PostgreSQL...'
                : 'Click to Reconnect & Sync with Neon Cloud'
            }
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer ${
              cloudSyncStatus === 'CONNECTED'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : cloudSyncStatus === 'SYNCING'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40 hover:bg-blue-500/25 animate-pulse'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                cloudSyncStatus === 'CONNECTED'
                  ? 'bg-emerald-500 animate-pulse'
                  : cloudSyncStatus === 'SYNCING'
                  ? 'bg-blue-500 animate-spin'
                  : 'bg-amber-500'
              }`}
            />
            <span>
              {cloudSyncStatus === 'CONNECTED'
                ? 'Neon DB Synced'
                : cloudSyncStatus === 'SYNCING'
                ? 'Syncing DB...'
                : 'Offline Cache'}
            </span>
          </button>

          {/* Sync Pending Invoices Button */}
          {offlineQueueCount > 0 && (
            <button
              onClick={syncOfflineQueue}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black shadow-sm transition-all"
            >
              <span>Sync ({offlineQueueCount})</span>
            </button>
          )}
        </div>

        {/* AI Assistant Quick Pill */}
        <button
          onClick={() => setActiveTab('ai-assistant')}
          className="hidden md:flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 animate-spin text-purple-500" />
          <span>AI Advisory</span>
        </button>

        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Alert Sounds' : 'Unmute Alert Sounds'}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-500" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
        </button>

        {/* Dark/Light Mode */}
        <button
          onClick={toggleDarkMode}
          title="Toggle Theme"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen((p) => !p)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-1.5 pr-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white uppercase">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {currentUser.name.split(' ')[0]}
              </p>
              <span
                className={`inline-block rounded px-1 text-[9px] font-black uppercase border ${roleColors[currentUser.role]}`}
              >
                {currentUser.role}
              </span>
            </div>
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95">
              <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Role Context:
              </p>
              <div className="space-y-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      setRoleDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${
                      currentUser.id === u.id
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="truncate">{u.name}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${roleColors[u.role]}`}>
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
