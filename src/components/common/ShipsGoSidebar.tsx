import React from 'react';
import {
  LayoutDashboard,
  Ship,
  FileText,
  SlidersHorizontal,
  Folder,
  Globe,
  Package,
  Search,
  Zap,
  Users,
  Receipt,
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface ShipsGoSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  urgentCount: number;
  activeShipmentsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const ShipsGoSidebar: React.FC<ShipsGoSidebarProps> = ({
  activeTab,
  setActiveTab,
  urgentCount,
  activeShipmentsCount,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      group: 'MAIN',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4 text-indigo-600" />,
          badge: urgentCount > 0 ? urgentCount : undefined,
        },
        {
          id: 'documents',
          label: 'Documents List',
          icon: <FileText className="w-4 h-4 text-blue-600" />,
        },
        {
          id: 'doc_config',
          label: 'Doc & Status Config',
          icon: <SlidersHorizontal className="w-4 h-4 text-slate-600" />,
        },
      ],
    },
    {
      group: 'CLIENTS & INVOICES',
      items: [
        {
          id: 'customers',
          label: 'Customers',
          icon: <Users className="w-4 h-4 text-purple-600" />,
        },
        {
          id: 'invoices',
          label: 'Invoices & Manuals',
          icon: <Receipt className="w-4 h-4 text-indigo-600" />,
        },
      ],
    },
    {
      group: 'TRACK & TRACE',
      items: [
        {
          id: 'shipments',
          label: 'Saved Shipments',
          icon: <Folder className="w-4 h-4 text-amber-500" />,
        },
        {
          id: 'api_feed',
          label: 'ShipsGo API Feed',
          icon: <Globe className="w-4 h-4 text-sky-500" />,
        },
        {
          id: 'containers',
          label: 'Containers',
          icon: <Package className="w-4 h-4 text-amber-700" />,
        },
        {
          id: 'track',
          label: 'Track Shipment',
          icon: <Search className="w-4 h-4 text-indigo-500" />,
        },
      ],
    },
    {
      group: 'INTEGRATIONS',
      items: [
        {
          id: 'api_webhooks',
          label: 'API & Webhooks',
          icon: <Zap className="w-4 h-4 text-amber-500" />,
        },
      ],
    },
  ];

  const handleSelect = (id: ActiveTab) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:relative top-0 left-0 z-50 md:z-auto w-64 bg-white border-r border-slate-200 shrink-0 h-full p-4 flex flex-col justify-between select-none overflow-y-auto transition-transform duration-300 transform ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Mobile Header Close */}
          <div className="flex md:hidden items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-extrabold text-sm text-slate-800">GFI DocTrack Menu</span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-100 text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          {navItems.map((sec, i) => (
            <div key={i}>
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 font-mono px-2">
                {sec.group}
              </div>
              <div className="space-y-1">
                {sec.items.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id as ActiveTab)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600 shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>

                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info Box */}
        <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-lg">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <span className="text-emerald-500">●</span> GFI DocTrack Active
          </div>
          <p className="text-[10px] text-slate-500">
            Auto-checking milestones & document clearance.
          </p>
        </div>
      </aside>
    </>
  );
};
