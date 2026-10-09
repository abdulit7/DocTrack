import React, { useState } from 'react';
import { Shipment, DocStatus } from '../../types';
import { ShipsGoService } from '../../services/shipsgoService';
import { getLinkedStatusesForDoc, MasterDocConfig } from '../documents/DocConfigPage';

interface ShipmentsViewProps {
  shipments: Shipment[];
  masterDocs?: MasterDocConfig[];
  onOpenContainerTracker: (containerNo?: string) => void;
  onUpdateDocStatus: (shipmentId: string, docIndex: number, status: DocStatus) => void;
  onEditShipment?: (shipment: Shipment) => void;
  onDeleteShipment?: (shipmentId: string) => void;
  onRefreshWorkspaceShipments?: () => void;
}

export const ShipmentsView: React.FC<ShipmentsViewProps> = ({
  shipments,
  masterDocs,
  onOpenContainerTracker,
  onUpdateDocStatus,
  onDeleteShipment,
  onRefreshWorkspaceShipments,
}) => {
  const [activeFilter, setActiveFilter] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedShipmentIds, setExpandedShipmentIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedShipmentIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Manual Sync handler for updating saved shipments with latest ShipsGo API status
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await ShipsGoService.getLiveShipments(50);
      if (onRefreshWorkspaceShipments) {
        onRefreshWorkspaceShipments();
      }
      setToastMessage('✅ Saved shipments successfully synced with ShipsGo API!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Sync failed: ${err.message || 'Error communicating with ShipsGo API'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filterTabs = [
    { id: 'ACTIVE', label: 'All Active Shipments' },
    { id: 'SAILING', label: 'In Transit / Sailing' },
    { id: 'DISCHARGED', label: 'Discharged / Delivered' },
    { id: 'PLANNED', label: 'Planned / Documentation' },
  ];

  const getShipmentMeta = (s: Shipment) => {
    const docs = s.docs || [];
    const completedDocs = docs.filter(d => d.status === 'Completed').length;
    const totalDocs = docs.length;

    return {
      carrier: 'Ocean Carrier',
      co2: '1.20',
      polName: s.pol || 'Port of Loading',
      polFlag: '🌐',
      polDate: s.etd || '—',
      podName: s.dest || 'Destination Port',
      podFlag: '🌐',
      podDate: s.eta || '—',
      statusLabel: s.status === 'Delivered' ? 'Discharged' : s.status || 'Sailing',
      statusBg: s.status === 'Delivered' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-white',
      refText: s.invoice,
      completedDocs,
      totalDocs,
    };
  };

  const filteredShipments = shipments.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      s.invoice.toLowerCase().includes(q) ||
      s.dest.toLowerCase().includes(q) ||
      (s.containerNo && s.containerNo.toLowerCase().includes(q)) ||
      (s.docs || []).some(d => d.name.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeFilter === 'SAILING') return s.status !== 'Delivered' && s.status !== 'Documentation';
    if (activeFilter === 'DISCHARGED') return s.status === 'Delivered';
    if (activeFilter === 'PLANNED') return s.status === 'Documentation';

    return true;
  });

  return (
    <div className="space-y-4 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-indigo-700 text-white font-bold text-xs px-4 py-3 rounded-lg shadow-xl animate-bounce flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-500 font-medium gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800 uppercase font-sans flex items-center gap-2">
            <span>📁</span> Ocean Shipments Cards
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Card-based view for ocean freight, compliance document attestation, and route tracking.
          </p>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Dashboard &gt; Ocean &gt; <span className="text-slate-700 font-bold font-mono">Shipments Cards ({shipments.length})</span>
        </div>
      </div>

      {/* Top Action & Filter Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs uppercase font-mono tracking-wide"
            >
              <span className={`text-sm ${isSyncing ? 'animate-spin' : ''}`}>🔄</span>
              <span>{isSyncing ? 'Syncing...' : 'Sync with ShipsGo'}</span>
            </button>

            <button
              onClick={() => onOpenContainerTracker()}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs uppercase font-mono tracking-wide"
            >
              <span className="text-sm">🔍</span> Live Tracker
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search reference, container or doc..."
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 font-medium"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3 text-xs font-semibold">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                activeFilter === tab.id
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards-Only List View */}
      {filteredShipments.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs">
          <div className="text-4xl mb-3">🚢</div>
          <h3 className="text-sm font-bold text-slate-800">No Shipments Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No saved shipments match your filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredShipments.map(s => {
            const meta = getShipmentMeta(s);
            const isExpanded = expandedShipmentIds[s.id] !== false; // expanded by default for easy access

            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-4 space-y-3"
              >
                {/* Header Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Container Spec & Carrier */}
                  <div className="md:col-span-3 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-2xs uppercase font-mono shrink-0">
                      {s.containerNo ? s.containerNo.substring(0, 4) : 'SHIP'}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 font-mono tracking-wide">
                        Ref: {meta.refText}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold text-sky-700 font-mono">
                          📦 {s.containerNo || 'No Container'}
                        </span>
                        {s.tradeType === 'Import' ? (
                          <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-mono uppercase">
                            📥 Import
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-300 px-1.5 py-0.2 rounded font-mono uppercase">
                            📤 Export
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Clearance Pills */}
                  <div className="md:col-span-3 flex flex-wrap items-center gap-2">
                    <span className={`${meta.statusBg} text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase font-mono tracking-wider shadow-2xs`}>
                      {meta.statusLabel}
                    </span>

                    <button
                      onClick={() => toggleExpand(s.id)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-md border cursor-pointer font-mono ${
                        meta.completedDocs === meta.totalDocs && meta.totalDocs > 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}
                    >
                      📄 Docs: {meta.completedDocs}/{meta.totalDocs} Cleared
                    </button>
                  </div>

                  {/* POL/POD Route Progress */}
                  <div className="md:col-span-4 space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                      <span className="truncate max-w-[110px]" title={meta.polName}>🌐 {meta.polName}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-mono">
                        Route
                      </span>
                      <span className="truncate max-w-[110px]" title={meta.podName}>🌐 {meta.podName}</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full w-2/3 rounded-full" />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>ETD: {meta.polDate}</span>
                      <span>ETA: {meta.podDate}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-2 text-right flex items-center justify-end gap-1.5 font-mono">
                    <button
                      onClick={() => onOpenContainerTracker(s.containerNo)}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      title="Track in Interactive Map"
                    >
                      🔍 Track
                    </button>
                    {onDeleteShipment && (
                      <button
                        onClick={() => onDeleteShipment(s.id || (s as any)._id || s.invoice)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-2 py-1.5 rounded-lg border border-rose-200 cursor-pointer"
                        title="Delete Shipment"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Compliance Document Matrix inside Card */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 bg-slate-50/80 p-3.5 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800 font-mono uppercase flex items-center gap-1.5">
                        <span>⚙️</span> Attached Compliance Documents ({meta.completedDocs}/{meta.totalDocs} Cleared)
                      </div>
                    </div>

                    {(!s.docs || s.docs.length === 0) ? (
                      <p className="text-xs text-slate-500 italic">No compliance documents attached to this card yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {s.docs.map((doc, docIdx) => (
                          <div
                            key={docIdx}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                          >
                            <span className="font-bold text-slate-800 truncate pr-2">{doc.name}</span>
                            <select
                              value={doc.status}
                              onChange={e => onUpdateDocStatus(s.id, docIdx, e.target.value as DocStatus)}
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded cursor-pointer border focus:outline-none ${
                                doc.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : doc.status === 'In Attestation'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-300'
                              }`}
                            >
                              {getLinkedStatusesForDoc(doc.name, masterDocs, doc.status).map(st => (
                                <option key={st} value={st}>
                                  {st === 'Completed' ? '✓ Completed' : st}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
