import React from 'react';
import { DocStatus } from '../../types';

interface DocStatusDotProps {
  status: DocStatus;
}

export const DocStatusDot: React.FC<DocStatusDotProps> = ({ status }) => {
  const getClass = (s: DocStatus) => {
    switch (s) {
      case 'Not Started':
        return 'st-not-started';
      case 'In Attestation':
        return 'st-attestation';
      case 'Pending Approval':
        return 'st-approval';
      case 'Completed':
        return 'st-done';
      default:
        return 'st-not-started';
    }
  };

  return <span className={`doc-dot ${getClass(status)}`} />;
};
