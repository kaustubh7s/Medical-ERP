'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { User, UserRole } from '@/types/pharmacy';
import { Modal } from '@/components/common/Modal';
import { UserCog, Plus, ShieldCheck, Check, X, ShieldAlert, Key } from 'lucide-react';

export const UserRoleManagementView: React.FC = () => {
  const { users, currentUser, setCurrentUser, updateUser, addUser } = usePharmacy();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('STAFF');

  const handleTogglePermission = (userId: string, permKey: keyof User['permissions']) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    updateUser(userId, {
      permissions: {
        ...user.permissions,
        [permKey]: !user.permissions[permKey],
      },
    });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    addUser({
      name,
      email,
      role,
      permissions: {
        canDiscount: role === 'OWNER' || role === 'MANAGER',
        canViewProfit: role === 'OWNER' || role === 'MANAGER',
        canEditInventory: role !== 'CASHIER',
        canManageUsers: role === 'OWNER',
        canDeleteInvoices: role === 'OWNER',
        canManagePurchases: role === 'OWNER' || role === 'MANAGER' || role === 'PHARMACIST',
      },
    });
    setIsModalOpen(false);
    setName('');
    setEmail('');
  };

  const permissionsList: { key: keyof User['permissions']; label: string }[] = [
    { key: 'canDiscount', label: 'Manual Billing Discount Override' },
    { key: 'canViewProfit', label: 'Access P&L Statements & Margins' },
    { key: 'canEditInventory', label: 'Manual Stock Reconciliation & Adjust' },
    { key: 'canManageUsers', label: 'User & Role Access Administration' },
    { key: 'canDeleteInvoices', label: 'Void / Delete Sales Invoices' },
    { key: 'canManagePurchases', label: 'Create Purchase Inward & Debit Notes' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCog className="h-5 w-5 text-indigo-600" />
            User Roles & Granular Permission Matrix ({users.length})
          </h2>
          <p className="text-xs text-slate-500">
            Define multi-tier access controls for Pharmacists, Store Managers, Billing Cashiers, and Owners.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
        >
          <Plus className="h-4 w-4" />
          Add Staff Member
        </button>
      </div>

      {/* Permissions Matrix Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
          Module Security & Action Rights Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="p-3">Staff Profile</th>
                <th className="p-3 text-center">Assigned Role</th>
                {permissionsList.map((perm) => (
                  <th key={perm.key} className="p-3 text-center max-w-[120px]">
                    {perm.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold uppercase">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{u.name}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 font-black text-[10px] uppercase">
                      {u.role}
                    </span>
                  </td>

                  {permissionsList.map((perm) => {
                    const isGranted = u.permissions[perm.key];
                    return (
                      <td key={perm.key} className="p-3 text-center">
                        <button
                          onClick={() => handleTogglePermission(u.id, perm.key)}
                          className={`p-1.5 rounded-lg transition-all ${
                            isGranted
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isGranted ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Staff Member"
        subtitle="Provision employee login and initial role permissions"
        maxWidth="md"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aniket Sharma"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aniket@bhaleraomedical.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Assigned Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            >
              <option value="PHARMACIST">Pharmacist (Prescription Verification)</option>
              <option value="MANAGER">Store Manager</option>
              <option value="CASHIER">Billing Cashier (POS Only)</option>
              <option value="STAFF">General Floor Staff</option>
              <option value="OWNER">Store Owner (Full Master Access)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
          >
            Create Staff Account
          </button>
        </form>
      </Modal>
    </div>
  );
};
