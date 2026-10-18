'use client';

import React from 'react';
import { Membership } from '@/types/pharmacy';
import { CompactMembershipRegistrationForm } from './CompactMembershipRegistrationForm';

interface CreateMembershipTabProps {
  onSuccess: (newMember: Membership) => void;
  onViewExisting: (member: Membership) => void;
}

export const CreateMembershipTab: React.FC<CreateMembershipTabProps> = ({
  onViewExisting,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <CompactMembershipRegistrationForm />
    </div>
  );
};
