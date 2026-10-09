import React from 'react';
import { Customer } from '../../types';

interface CustomerLedgerProps {
  customers: Customer[];
}

export const CustomerLedger: React.FC<CustomerLedgerProps> = ({ customers }) => {
  const total = customers.length;
  const compliantCount = customers.filter(c => c.docs?.every(d => d.status === 'Completed')).length;

  let pendingDocs = 0;
  customers.forEach(c => {
    c.docs?.forEach(d => {
      if (d.status === 'In Attestation' || d.status === 'Pending Approval' || d.status === 'Not Started') {
        pendingDocs++;
      }
    });
  });

  return (
    <div className="ledger-grid customers-ledger">
      <div className="bg-[var(--navy-panel)] p-3 text-center">
        <div className="font-mono-custom text-2xl font-semibold leading-none text-[var(--done-green)]">
          {total}
        </div>
        <span className="text-[10px] tracking-wider uppercase text-[var(--chalk-dim)] mt-1.5 block">
          Total Customers
        </span>
      </div>
      <div className="bg-[var(--navy-panel)] p-3 text-center">
        <div className="font-mono-custom text-2xl font-semibold leading-none text-[var(--transit-teal)]">
          {compliantCount}
        </div>
        <span className="text-[10px] tracking-wider uppercase text-[var(--chalk-dim)] mt-1.5 block">
          Fully Compliant
        </span>
      </div>
      <div className="bg-[var(--navy-panel)] p-3 text-center">
        <div className="font-mono-custom text-2xl font-semibold leading-none text-[var(--stamp-red)]">
          {pendingDocs}
        </div>
        <span className="text-[10px] tracking-wider uppercase text-[var(--chalk-dim)] mt-1.5 block">
          Docs Pending
        </span>
      </div>
    </div>
  );
};
