import React from 'react';

interface HeaderProps {
  shipmentCount: number;
  customerCount: number;
  loading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ shipmentCount, customerCount, loading }) => {
  return (
    <div className="mb-2">
      <p className="font-mono-custom text-[11px] tracking-[0.18em] text-[var(--transit-teal)] uppercase mb-1">
        Documentation Control · Export Operations
      </p>
      <h1 className="font-heading font-semibold tracking-wide uppercase text-3xl sm:text-4xl text-[var(--chalk)] mb-1 pb-2">
        Export Manifest
      </h1>
      <p className="text-[13.5px] text-[var(--chalk-dim)] mt-1">
        {loading ? (
          <span className="animate-pulse">Loading manifest from server…</span>
        ) : (
          `${shipmentCount} shipment${shipmentCount === 1 ? '' : 's'} · ${customerCount} customer${
            customerCount === 1 ? '' : 's'
          } on file · live MERN backend API`
        )}
      </p>
    </div>
  );
};
