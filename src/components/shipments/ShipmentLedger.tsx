import React from 'react';
import { Shipment } from '../../types';

interface ShipmentLedgerProps {
  shipments: Shipment[];
}

export const ShipmentLedger: React.FC<ShipmentLedgerProps> = ({ shipments }) => {
  const counts = {
    notStarted: 0,
    attestation: 0,
    approval: 0,
    completed: 0,
    transit: 0,
    arrivingSoon: 0,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  shipments.forEach(s => {
    if (s.status === 'In Transit') counts.transit++;

    if (s.eta && s.status !== 'Delivered') {
      const etaDate = new Date(s.eta + 'T00:00:00');
      const diffDays = Math.round((etaDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (diffDays >= 0 && diffDays <= 7) {
        counts.arrivingSoon++;
      }
    }

    s.docs?.forEach(d => {
      switch (d.status) {
        case 'Not Started':
          counts.notStarted++;
          break;
        case 'In Attestation':
          counts.attestation++;
          break;
        case 'Pending Approval':
          counts.approval++;
          break;
        case 'Completed':
          counts.completed++;
          break;
      }
    });
  });

  return (
    <div className="ledger-grid">
      <div className="bg-[var(--navy-panel)] p-3 text-center">
        <div className="font-mono-custom text-2xl font-semibold leading-none text-[var(--chalk-dim)]">
          {counts.notStarted}
        </div>
        <span className="text-[10px] tracking-wider uppercase text-[var(--chalk-dim)] mt-1.5 block">
          Not Started
        </span>
      </div>
      <div className="bg-[var(--navy-panel)] p-3 text-center">
        <div className="font-mono-custom text-2xl font-semibold leading-none text-[var(--stamp-red)]">
          {counts.attestation}
        </div>
        <span className="text-[10px] tracking-wider uppercase text-[var(--chalk-dim)] mt-1.5 block">
          In Attestation
        </span>
      </div>
      <div className="bg-[var(--navy-panel)] p-3 text-center">
        <div className="font-mono-custom text-2xl font-semibold leading-none text-[var(--customs-gold)]">
          {counts.approval}
        </div>
        <span className="text-[10px] tracking-wider uppercase text-[var(--chalk-dim)] mt-1.5 block">
          Pending Approval
        </span>
      </div>
      <div className="bg-[var(--navy-panel)] p-3 text-center">
        <div className="font-mono-custom text-2xl font-semibold leading-none text-[var(--transit-teal)]">
          {counts.transit}
        </div>
        <span className="text-[10px] tracking-wider uppercase text-[var(--chalk-dim)] mt-1.5 block">
          In Transit
        </span>
      </div>
      <div className="bg-[var(--navy-panel)] p-3 text-center">
        <div className="font-mono-custom text-2xl font-semibold leading-none text-[var(--customs-gold)]">
          {counts.arrivingSoon}
        </div>
        <span className="text-[10px] tracking-wider uppercase text-[var(--chalk-dim)] mt-1.5 block">
          Arriving ≤7 Days
        </span>
      </div>
      <div className="bg-[var(--navy-panel)] p-3 text-center">
        <div className="font-mono-custom text-2xl font-semibold leading-none text-[var(--done-green)]">
          {counts.completed}
        </div>
        <span className="text-[10px] tracking-wider uppercase text-[var(--chalk-dim)] mt-1.5 block">
          Docs Completed
        </span>
      </div>
    </div>
  );
};
