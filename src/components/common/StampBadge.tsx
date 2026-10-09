import React from 'react';

interface StampBadgeProps {
  status: string;
}

export const StampBadge: React.FC<StampBadgeProps> = ({ status }) => {
  const getStampClass = (s: string) => {
    switch (s) {
      case 'Not Started':
        return 'st-not-started';
      case 'In Attestation':
      case 'Documentation':
      case 'Docs Pending':
        return 'st-attestation';
      case 'Pending Approval':
        return 'st-approval';
      case 'In Transit':
        return 'st-transit';
      case 'Completed':
      case 'Delivered':
      case 'Compliant':
        return 'st-done';
      default:
        return 'st-not-started';
    }
  };

  return <span className={`stamp ${getStampClass(status)}`}>{status}</span>;
};
