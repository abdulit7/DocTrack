import React from 'react';

export type ActiveTab = 'shipments' | 'customers';

interface TabNavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex gap-1 my-5 border-b border-[var(--line)]">
      <button
        onClick={() => onTabChange('shipments')}
        className={`font-mono-custom text-[12px] tracking-wider uppercase bg-transparent border-0 px-1 py-2.5 mr-5 cursor-pointer border-b-2 transition-colors ${
          activeTab === 'shipments'
            ? 'text-[var(--chalk)] border-b-[var(--transit-teal)] font-semibold'
            : 'text-[var(--chalk-dim)] border-b-transparent hover:text-[var(--chalk)]'
        }`}
      >
        Shipments
      </button>
      <button
        onClick={() => onTabChange('customers')}
        className={`font-mono-custom text-[12px] tracking-wider uppercase bg-transparent border-0 px-1 py-2.5 mr-5 cursor-pointer border-b-2 transition-colors ${
          activeTab === 'customers'
            ? 'text-[var(--chalk)] border-b-[var(--transit-teal)] font-semibold'
            : 'text-[var(--chalk-dim)] border-b-transparent hover:text-[var(--chalk)]'
        }`}
      >
        Customers
      </button>
    </div>
  );
};
