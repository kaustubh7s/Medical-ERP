'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import { Membership } from '@/types/pharmacy';
import { MembershipDashboardTab } from './MembershipDashboardTab';
import { AllMembersTab } from './AllMembersTab';
import { CreateMembershipTab } from './CreateMembershipTab';
import { MembershipSettingsTab } from './MembershipSettingsTab';
import { MembershipReportsTab } from './MembershipReportsTab';
import { MemberDetailsModal } from './MemberDetailsModal';
import { RenewMembershipModal } from './RenewMembershipModal';
import { ExtendMembershipModal } from './ExtendMembershipModal';
import {
  Crown,
  Users,
  UserPlus,
  SlidersHorizontal,
  FileBarChart2,
} from 'lucide-react';

export const MembershipModuleView: React.FC = () => {
  const { activeTab, setActiveTab, memberships } = usePharmacy();

  // Modals state
  const [selectedMember, setSelectedMember] = useState<Membership | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);

  // Sync internal subtab with activeTab
  const currentSubTab = [
    'membership-dashboard',
    'membership-members',
    'membership-create',
    'membership-settings',
    'membership-reports',
  ].includes(activeTab)
    ? activeTab
    : 'membership-dashboard';

  const handleOpenDetails = (member: Membership) => {
    setSelectedMember(member);
    setIsDetailsOpen(true);
  };

  const handleOpenRenew = (member: Membership) => {
    setSelectedMember(member);
    setIsRenewOpen(true);
  };

  const handleOpenExtend = (member: Membership) => {
    setSelectedMember(member);
    setIsExtendOpen(true);
  };

  const handleMemberCreated = (newMember: Membership) => {
    setSelectedMember(newMember);
    setIsDetailsOpen(true);
    setActiveTab('membership-members');
  };

  const navTabs = [
    { id: 'membership-dashboard', label: 'Membership Dashboard', icon: Crown },
    { id: 'membership-members', label: `All Members (${memberships.length})`, icon: Users },
    { id: 'membership-create', label: 'Create Membership', icon: UserPlus },
    { id: 'membership-settings', label: 'Membership Settings', icon: SlidersHorizontal },
    { id: 'membership-reports', label: 'Membership Reports', icon: FileBarChart2 },
  ];

  return (
    <div className="space-y-4">
      {/* Top Pharmacy ERP Navigation Tab Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-2.5 py-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center space-x-1 shrink-0">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subview Container */}
      <div className="min-h-[500px]">
        {currentSubTab === 'membership-dashboard' && (
          <MembershipDashboardTab
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectMember={handleOpenDetails}
            onRenewMember={handleOpenRenew}
          />
        )}

        {currentSubTab === 'membership-members' && (
          <AllMembersTab
            onSelectMember={handleOpenDetails}
            onRenewMember={handleOpenRenew}
            onExtendMember={handleOpenExtend}
            onOpenCreate={() => setActiveTab('membership-create')}
          />
        )}

        {currentSubTab === 'membership-create' && (
          <CreateMembershipTab
            onSuccess={handleMemberCreated}
            onViewExisting={handleOpenDetails}
          />
        )}

        {currentSubTab === 'membership-settings' && <MembershipSettingsTab />}

        {currentSubTab === 'membership-reports' && <MembershipReportsTab />}
      </div>

      {/* Modals */}
      <MemberDetailsModal
        member={selectedMember}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onRenew={(m) => {
          setIsDetailsOpen(false);
          handleOpenRenew(m);
        }}
        onExtend={(m) => {
          setIsDetailsOpen(false);
          handleOpenExtend(m);
        }}
        onEdit={(m) => {
          setIsDetailsOpen(false);
        }}
      />

      <RenewMembershipModal
        member={selectedMember}
        isOpen={isRenewOpen}
        onClose={() => setIsRenewOpen(false)}
      />

      <ExtendMembershipModal
        member={selectedMember}
        isOpen={isExtendOpen}
        onClose={() => setIsExtendOpen(false)}
      />
    </div>
  );
};
