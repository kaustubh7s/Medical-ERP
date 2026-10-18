'use client';

import React from 'react';
import { usePharmacy } from '@/lib/store';
import { X, AlertTriangle, AlertCircle, Clock, CheckCircle2, DollarSign, Bell } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, setActiveTab } = usePharmacy();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Live Alerts & Radar</h3>
                <p className="text-xs text-slate-500">{notifications.length} active pharmacy alerts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={markAllNotificationsAsRead}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                Mark all read
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-80" />
                <p className="text-sm font-semibold">All systems normal</p>
                <p className="text-xs mt-1">No pending expiry or stockout alerts.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isCritical = notif.priority === 'CRITICAL';
                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      notif.read
                        ? 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                        : isCritical
                        ? 'bg-rose-500/5 border-rose-500/30'
                        : 'bg-amber-500/5 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {notif.type === 'EXPIRED' ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : notif.type === 'LOW_STOCK' ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{notif.title}</h4>
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {notif.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between">
                          {notif.link && (
                            <button
                              onClick={() => {
                                if (notif.link) setActiveTab(notif.link);
                                markNotificationAsRead(notif.id);
                                onClose();
                              }}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
                            >
                              Resolve Issue →
                            </button>
                          )}
                          {!notif.read && (
                            <button
                              onClick={() => markNotificationAsRead(notif.id)}
                              className="text-[11px] text-slate-400 hover:text-slate-600"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
