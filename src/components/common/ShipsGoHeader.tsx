import React from 'react';
import { ActiveTab } from '../../types';
import { BRANDING_CONFIG } from '../../config/brandingConfig';

interface ShipsGoHeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenContainerTracker: (containerNo?: string) => void;
  urgentCount: number;
  onOpenUrgentModal: () => void;
  onToggleMobileMenu?: () => void;
}

export const ShipsGoHeader: React.FC<ShipsGoHeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenContainerTracker,
  urgentCount,
  onOpenUrgentModal,
  onToggleMobileMenu,
}) => {
  return (
    <header className="shipsgo-top-header bg-[#4338CA] text-white h-16 shrink-0 px-3 sm:px-6 flex items-center justify-between shadow-md z-30 sticky top-0" style={{ backgroundColor: '#4338ca' }}>
      {/* Brand & Logo (Configured in src/config/brandingConfig.ts) */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-lg bg-indigo-800/80 hover:bg-indigo-700 text-white cursor-pointer transition-colors"
            title="Toggle Menu"
          >
            <span className="text-xl leading-none">☰</span>
          </button>
        )}

        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          {/* Logo Icon / Image Container (To configure logo, see src/config/brandingConfig.ts) */}
          {BRANDING_CONFIG.logoImageUrl ? (
            <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-xs flex items-center justify-center">
              <img
                src={BRANDING_CONFIG.logoImageUrl}
                alt={BRANDING_CONFIG.brandName}
                className="h-8 max-w-[120px] object-contain rounded"
              />
            </div>
          ) : (
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-xs flex items-center justify-center">
              <span className="text-xl sm:text-2xl leading-none">🚢</span>
            </div>
          )}

          <div>
            <div className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-sans flex items-center gap-1.5">
              {BRANDING_CONFIG.brandName}{' '}
              <span className="text-[10px] bg-amber-400 text-slate-900 font-black px-1.5 py-0.5 rounded uppercase font-mono">
                {BRANDING_CONFIG.brandTag}
              </span>
            </div>
            <p className="hidden sm:block text-[10px] text-indigo-200 font-medium">
              {BRANDING_CONFIG.brandSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right Tools & User Profile */}
      <div className="flex items-center gap-3">
        {/* Urgent Notification Badge */}
        {urgentCount > 0 && (
          <button
            onClick={onOpenUrgentModal}
            className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm animate-pulse cursor-pointer transition-all"
            title="Approaching ETA with incomplete clearance documents!"
          >
            <span className="text-sm">🚨</span>
            <span className="hidden sm:inline">{urgentCount} Pending Compliance Alert{urgentCount > 1 ? 's' : ''}</span>
            <span className="sm:hidden">{urgentCount}</span>
          </button>
        )}

        {/* Credits Badge */}
        <div className="hidden md:flex items-center gap-1.5 bg-indigo-800/80 text-indigo-100 text-xs px-3 py-1.5 rounded-md border border-indigo-500/30">
          <span className="text-amber-400">⚡</span>
          <span className="font-semibold">72 Credits</span>
        </div>

        {/* Quick Dashboard Pill */}
        <button
          onClick={() => setActiveTab('api_webhooks')}
          className="hidden lg:flex items-center gap-1 text-xs text-indigo-200 hover:text-white bg-indigo-800/50 hover:bg-indigo-800 px-2.5 py-1.5 rounded border border-indigo-500/20 cursor-pointer transition-colors"
        >
          <span>⚡</span>
          <span>API Active</span>
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 font-extrabold flex items-center justify-center text-sm shadow-inner cursor-pointer" title="Logged in as Document Clearance Manager">
          G
        </div>
      </div>
    </header>
  );
};
