import React, { useState } from 'react';
import { Shipment } from '../../types';

interface ContainersViewProps {
  shipments: Shipment[];
  customers?: any[];
  onOpenContainerTracker: (containerNo?: string) => void;
}

export const ContainersView: React.FC<ContainersViewProps> = ({
  shipments,
  onOpenContainerTracker,
}) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const containerTabs = [
    { id: 'ALL', label: 'All Containers' },
    { id: 'DEPOT', label: 'At Shipper Depot' },
    { id: 'POL_WAIT', label: 'Waiting at POL' },
    { id: 'GATE_IN', label: 'Recent Gate Ins' },
    { id: 'UNRELEASED', label: 'Unreleased Containers' },
    { id: 'EMPTY_RETURN', label: 'Waiting Empty Return Info' },
    { id: 'COMPLETED', label: 'Completed Containers' },
  ];

  const filteredContainers = shipments.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (s.containerNo && s.containerNo.toLowerCase().includes(q)) ||
      s.invoice.toLowerCase().includes(q) ||
      s.dest.toLowerCase().includes(q);

    return matchesSearch;
  });

  return (
    <div className="space-y-4 select-none">
      {/* Breadcrumbs */}
      <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
        <h1 className="text-xl font-bold text-slate-800 uppercase font-sans">Containers</h1>
        <div className="font-mono text-[11px] text-slate-400">
          Dashboard &gt; Ocean &gt; Track & Trace &gt; <span className="text-slate-700 font-bold font-mono">Containers</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => onOpenContainerTracker()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm uppercase tracking-wide font-mono"
          >
            <span className="text-sm">🔍</span> Search & Link ShipsGo Container
          </button>

          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search container number or reference..."
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 font-medium"
          />
        </div>

        {/* Filter Tabs matching ShipsGo Navbar */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3 text-xs font-semibold">
          {containerTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Container Cards List */}
      <div className="space-y-3">
        {filteredContainers.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="text-sm font-bold text-slate-800">No Containers Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no container records matching your query. Search and track containers directly using the ShipsGo Live Tracker.
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => onOpenContainerTracker()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 font-mono"
              >
                🔍 Search & Link ShipsGo Container
              </button>
            </div>
          </div>
        ) : (
          filteredContainers.map(s => {
            const cNo = s.containerNo || '—';
            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Carrier / Container Specs */}
                  <div className="md:col-span-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-xs uppercase tracking-wider font-mono">
                      40HC
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-indigo-700 font-mono tracking-wide">{cNo}</div>
                      <p className="text-[11px] text-slate-500 font-medium font-mono">Ref: {s.invoice}</p>
                    </div>
                  </div>

                  {/* Reference & Status */}
                  <div className="md:col-span-3 text-xs space-y-1">
                    <div>
                      <span className="text-slate-400 font-medium">Shipment Ref: </span>
                      <span className="font-bold text-slate-800 font-mono">{s.invoice}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Status: </span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {s.status === 'Delivered' ? 'DISCHARGED / GATE_OUT' : 'GATE_IN / LOADED'}
                      </span>
                    </div>
                  </div>

                  {/* Route Bar */}
                  <div className="md:col-span-4 space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                      <span>🌐 {s.pol || 'PORT OF LOADING'}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        In Transit
                      </span>
                      <span>🌐 {s.dest}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full w-2/3 rounded-full" />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>ETD: {s.etd || '—'}</span>
                      <span>ETA: {s.eta || '—'}</span>
                    </div>
                  </div>

                  {/* Details Trigger Button */}
                  <div className="md:col-span-2 text-right">
                    <button
                      onClick={() => onOpenContainerTracker(cNo)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer font-mono"
                    >
                      Details &rarr;
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
