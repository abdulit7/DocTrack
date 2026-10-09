import React, { useState } from 'react';
import { Shipment, DocStatus, AuditLogItem, ActiveTab } from '../../types';
import { getLinkedStatusesForDoc, MasterDocConfig } from '../documents/DocConfigPage';

interface DashboardOverviewProps {
  shipments: Shipment[];
  masterDocs?: MasterDocConfig[];
  auditLogs?: AuditLogItem[];
  onUpdateDocStatus: (shipmentId: string, docIndex: number, status: DocStatus) => void;
  onOpenContainerTracker: (containerNo?: string) => void;
  onOpenUrgentModal: () => void;
  onSelectTab?: (tab: ActiveTab) => void;
  onRefreshAuditLogs?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  shipments,
  masterDocs,
  auditLogs = [],
  onUpdateDocStatus,
  onOpenContainerTracker,
  onOpenUrgentModal,
  onSelectTab,
  onRefreshAuditLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [docFilter, setDocFilter] = useState<'ALL' | 'PENDING' | 'ATTESTING' | 'COMPLETED'>('ALL');
  
  // Embassy Attestation Widget State
  const [embassySearch, setEmbassySearch] = useState('');
  const [embassyFilter, setEmbassyFilter] = useState<'ALL' | 'INCOMPLETE' | 'COMPLETED'>('INCOMPLETE');

  // Audit Log Widget State
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'DOCS' | 'SHIPMENTS' | 'CUSTOMERS' | 'SYSTEM'>('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const auditPageSize = 5;

  // Pagination states
  const [activePage, setActivePage] = useState(1);
  const activePageSize = 4;

  const [pendingDocsPage, setPendingDocsPage] = useState(1);
  const pendingDocsPageSize = 5;

  const [embassyPage, setEmbassyPage] = useState(1);
  const embassyPageSize = 4;

  const [destPortPage, setDestPortPage] = useState(1);
  const destPortPageSize = 15;

  // Compute metrics
  let totalDocsCount = 0;
  let completedDocsCount = 0;
  let inAttestationCount = 0;
  let notStartedCount = 0;
  let urgentCount = 0;
  let activeShipmentsWithPendingDocsCount = 0;

  // Flattened list of pending documents for the Pending Documents Widget
  const pendingDocsList: {
    shipmentId: string;
    invoice: string;
    containerNo?: string;
    dest: string;
    eta?: string;
    docIndex: number;
    docName: string;
    docStatus: DocStatus;
    daysLeft: number;
    isUrgent: boolean;
  }[] = [];

  // List of active shipments whose documents are in process
  const activeProcessShipmentsList: {
    id: string;
    invoice: string;
    dest: string;
    containerNo?: string;
    eta?: string;
    pendingCount: number;
    totalDocsCount: number;
    stage: string;
    daysLeft: number;
  }[] = [];

  // Dedicated Embassy Attestation documents list across shipments
  const embassyAttestationList: {
    shipmentId: string;
    invoice: string;
    containerNo?: string;
    dest: string;
    eta?: string;
    docIndex: number;
    docName: string;
    docStatus: DocStatus;
    isCompleted: boolean;
    daysLeft: number;
    isUrgent: boolean;
  }[] = [];

  const destPortCounts: Record<string, number> = {};

  shipments.forEach(s => {
    // Days left calculation
    let daysLeft = 999;
    if (s.eta) {
      const parts = s.eta.split('/');
      let dateObj: Date | null = null;
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        dateObj = new Date(s.eta);
      }
      if (dateObj && !isNaN(dateObj.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        daysLeft = Math.round((dateObj.getTime() - today.getTime()) / (1000 * 86400));
      }
    }

    const docs = s.docs || [];
    let shipmentHasPending = false;
    let pendingCountForShipment = 0;

    if (docs.length > 0) {
      docs.forEach((d, docIdx) => {
        const dName = typeof d === 'string' ? d : (d as any)?.name || '';
        const dStatus = typeof d === 'string' ? ('Not Started' as DocStatus) : (d as any)?.status || ('Not Started' as DocStatus);
        totalDocsCount++;

        const isEmbassyDoc =
          dName.toLowerCase().includes('embassy') ||
          dName.toLowerCase().includes('attestation');

        if (isEmbassyDoc) {
          embassyAttestationList.push({
            shipmentId: s.id,
            invoice: s.invoice,
            containerNo: s.containerNo,
            dest: s.dest,
            eta: s.eta,
            docIndex: docIdx,
            docName: dName,
            docStatus: dStatus,
            isCompleted: dStatus === 'Completed',
            daysLeft,
            isUrgent: daysLeft <= 10 && dStatus !== 'Completed',
          });
        }

        if (dStatus === 'Completed') {
          completedDocsCount++;
        } else {
          if (dStatus === 'In Attestation') inAttestationCount++;
          else notStartedCount++;

          shipmentHasPending = true;
          pendingCountForShipment++;

          pendingDocsList.push({
            shipmentId: s.id,
            invoice: s.invoice,
            containerNo: s.containerNo,
            dest: s.dest,
            eta: s.eta,
            docIndex: docIdx,
            docName: dName,
            docStatus: dStatus,
            daysLeft,
            isUrgent: daysLeft <= 10,
          });
        }
      });
    }

    // Only count and record destinations for active shipments whose documents are in process
    if (shipmentHasPending) {
      activeShipmentsWithPendingDocsCount++;
      if (s.dest) {
        destPortCounts[s.dest] = (destPortCounts[s.dest] || 0) + 1;
      }
      activeProcessShipmentsList.push({
        id: s.id,
        invoice: s.invoice,
        dest: s.dest || '—',
        containerNo: s.containerNo,
        eta: s.eta,
        pendingCount: pendingCountForShipment,
        totalDocsCount: docs.length,
        stage: s.status,
        daysLeft,
      });
    }

    if (shipmentHasPending && daysLeft <= 10) {
      urgentCount++;
    }
  });

  // Embassy metrics
  const totalEmbassyCount = embassyAttestationList.length;
  const pendingEmbassyCount = embassyAttestationList.filter(e => !e.isCompleted).length;
  const completedEmbassyCount = embassyAttestationList.filter(e => e.isCompleted).length;

  // Filtered pending docs list for widget
  const filteredPendingDocs = pendingDocsList.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesQ =
      !q ||
      item.invoice.toLowerCase().includes(q) ||
      (item.containerNo && item.containerNo.toLowerCase().includes(q)) ||
      item.docName.toLowerCase().includes(q) ||
      item.dest.toLowerCase().includes(q);

    if (!matchesQ) return false;

    if (docFilter === 'PENDING') return item.docStatus === 'Not Started';
    if (docFilter === 'ATTESTING') return item.docStatus === 'In Attestation' || item.docStatus === 'Pending Approval';

    return true;
  });

  // Filtered Embassy Attestation list
  const filteredEmbassyList = embassyAttestationList.filter(item => {
    const q = embassySearch.toLowerCase();
    const matchesQ =
      !q ||
      item.invoice.toLowerCase().includes(q) ||
      (item.containerNo && item.containerNo.toLowerCase().includes(q)) ||
      item.docName.toLowerCase().includes(q) ||
      item.dest.toLowerCase().includes(q);

    if (!matchesQ) return false;

    if (embassyFilter === 'INCOMPLETE') return !item.isCompleted;
    if (embassyFilter === 'COMPLETED') return item.isCompleted;

    return true;
  });

  // Pagination Math
  const activeTotalPages = Math.max(1, Math.ceil(activeProcessShipmentsList.length / activePageSize));
  const currentActivePage = Math.min(activePage, activeTotalPages);
  const pagedActiveShipments = activeProcessShipmentsList.slice(
    (currentActivePage - 1) * activePageSize,
    currentActivePage * activePageSize
  );

  const pendingTotalPages = Math.max(1, Math.ceil(filteredPendingDocs.length / pendingDocsPageSize));
  const currentPendingPage = Math.min(pendingDocsPage, pendingTotalPages);
  const pagedPendingDocs = filteredPendingDocs.slice(
    (currentPendingPage - 1) * pendingDocsPageSize,
    currentPendingPage * pendingDocsPageSize
  );

  const embassyTotalPages = Math.max(1, Math.ceil(filteredEmbassyList.length / embassyPageSize));
  const currentEmbassyPage = Math.min(embassyPage, embassyTotalPages);
  const pagedEmbassyDocs = filteredEmbassyList.slice(
    (currentEmbassyPage - 1) * embassyPageSize,
    currentEmbassyPage * embassyPageSize
  );

  const destPortEntries = Object.entries(destPortCounts);
  const destPortTotalPages = Math.max(1, Math.ceil(destPortEntries.length / destPortPageSize));
  const currentDestPortPage = Math.min(destPortPage, destPortTotalPages);
  const pagedDestPorts = destPortEntries.slice(
    (currentDestPortPage - 1) * destPortPageSize,
    currentDestPortPage * destPortPageSize
  );

  return (
    <div className="space-y-6 select-none">
      {/* Hero Banner & Stat Cards */}
      <div
        className="dashboard-hero-header bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-700/50 relative overflow-hidden"
        style={{
          backgroundColor: '#1e1b4b',
          backgroundImage: 'linear-gradient(to right, #1e1b4b, #3730a3, #0f172a)'
        }}
      >
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
                Shipment Doc Tracking System
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-2xl font-sans">
                Track compliance documents, manage Embassy Attestations, and verify shipment clearance status in real-time.
              </p>
            </div>
          </div>

          {/* Key Metric Widgets Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-indigo-700/50">
            <div
              onClick={() => onSelectTab && onSelectTab('invoices')}
              className="dashboard-hero-card bg-indigo-950/70 backdrop-blur-md p-4 rounded-xl border border-indigo-700/40 cursor-pointer hover:bg-indigo-900/80 hover:border-emerald-500/60 transition-all group"
              style={{ backgroundColor: 'rgba(30, 27, 75, 0.85)', borderColor: 'rgba(67, 56, 202, 0.4)' }}
              title="Click to route to Invoices & Manuals page"
            >
              <div className="flex justify-between items-start">
                <span className="text-indigo-300 text-[11px] font-bold uppercase font-mono tracking-wider group-hover:text-emerald-300 transition-colors">Active Shipments ↗</span>
                <span className="text-lg group-hover:scale-110 transition-transform">🚢</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1.5">{activeShipmentsWithPendingDocsCount}</div>
              <p className="text-[10px] text-indigo-300 mt-1 font-mono">In-Process Docs ({activeShipmentsWithPendingDocsCount} Active)</p>
            </div>

            <div
              className="dashboard-hero-card bg-indigo-950/70 backdrop-blur-md p-4 rounded-xl border border-indigo-700/40"
              style={{ backgroundColor: 'rgba(30, 27, 75, 0.85)', borderColor: 'rgba(67, 56, 202, 0.4)' }}
            >
              <div className="flex justify-between items-start">
                <span className="text-indigo-300 text-[11px] font-bold uppercase font-mono tracking-wider">Embassy Attestations</span>
                <span className="text-lg">🏛️</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-1.5">
                {pendingEmbassyCount} <span className="text-xs text-indigo-300 font-normal">Pending</span>
              </div>
              <div
                className="w-full bg-indigo-900/80 h-1.5 rounded-full mt-2 overflow-hidden"
                style={{ backgroundColor: 'rgba(49, 46, 129, 0.8)' }}
              >
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalEmbassyCount > 0 ? (completedEmbassyCount / totalEmbassyCount) * 100 : 100}%` }}
                />
              </div>
            </div>

            <div
              onClick={() => onSelectTab && onSelectTab('invoices')}
              className="dashboard-hero-card bg-indigo-950/70 backdrop-blur-md p-4 rounded-xl border border-indigo-700/40 cursor-pointer hover:bg-indigo-900/80 hover:border-amber-500/60 transition-all group"
              style={{ backgroundColor: 'rgba(30, 27, 75, 0.85)', borderColor: 'rgba(67, 56, 202, 0.4)' }}
              title="Click to route to Invoices & Manuals page"
            >
              <div className="flex justify-between items-start">
                <span className="text-indigo-300 text-[11px] font-bold uppercase font-mono tracking-wider group-hover:text-amber-300 transition-colors">Pending Documents ↗</span>
                <span className="text-lg group-hover:scale-110 transition-transform">⏳</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-1.5">
                {pendingDocsList.length} <span className="text-xs text-indigo-300 font-normal">Docs</span>
              </div>
              <p className="text-[10px] text-amber-200/80 mt-1 font-mono">{inAttestationCount} In Progress</p>
            </div>

            <div
              onClick={() => onSelectTab && onSelectTab('invoices')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                urgentCount > 0
                  ? 'bg-rose-950/80 border-rose-500 hover:bg-rose-900 text-white shadow-lg animate-pulse'
                  : 'dashboard-hero-card bg-indigo-950/70 border-indigo-700/40 text-slate-300'
              }`}
              style={
                urgentCount > 0
                  ? { backgroundColor: 'rgba(76, 5, 25, 0.85)', borderColor: '#f43f5e' }
                  : { backgroundColor: 'rgba(30, 27, 75, 0.85)', borderColor: 'rgba(67, 56, 202, 0.4)' }
              }
              title="Click to route to Invoices & Manuals page"
            >
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase font-mono tracking-wider text-rose-200">ETA Urgent Alerts</span>
                <span className="text-lg">🚨</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-300 mt-1.5">{urgentCount}</div>
              <p className="text-[10px] text-rose-200/80 mt-1 font-mono">Pending &lt; 10 Days ETA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Two-Column Grid: Left (Active Shipments + Pending Docs) & Right/Side (Embassy Attestation + Destination Ports) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (lg:col-span-7 / xl:col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* WIDGET 1: Active Shipments with Documents In Process (With Pagination) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
                  <span>🚢</span> Active Shipments (Docs In Process) ({activeProcessShipmentsList.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Only displaying shipments whose documents are in process. Click any card to open Invoices & Manuals.
                </p>
              </div>
              <button
                onClick={() => onSelectTab && onSelectTab('invoices')}
                className="self-start sm:self-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <span>🧾</span> Invoices & Manuals ↗
              </button>
            </div>

            {activeProcessShipmentsList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs font-mono">
                🎉 All shipment documents are fully processed and completed!
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pagedActiveShipments.map(item => (
                    <div
                      key={item.id}
                      onClick={() => onSelectTab && onSelectTab('invoices')}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-indigo-50/40 hover:border-indigo-400 transition-all cursor-pointer group flex flex-col justify-between space-y-2.5"
                      title="Click to view this shipment in Invoices & Manuals"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-indigo-900 group-hover:text-indigo-600 font-mono transition-colors">
                            Ref: {item.invoice}
                          </span>
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                            {item.pendingCount} Pending Docs
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>⚓ Destination:</span>
                          <span className="bg-slate-200 text-slate-900 px-2 py-0.5 rounded font-mono truncate max-w-[140px]">
                            {item.dest}
                          </span>
                        </div>

                        {item.containerNo && (
                          <div className="text-[11px] text-slate-600 font-mono flex items-center gap-1">
                            <span>📦 Container:</span>
                            <span className="font-semibold text-slate-800">{item.containerNo}</span>
                          </div>
                        )}

                        {item.eta && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            ETA: <strong className="text-slate-700">{item.eta}</strong>
                            {item.daysLeft <= 10 && (
                              <span className="ml-1.5 text-rose-600 font-black">({item.daysLeft}d left)</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500 font-semibold">{item.stage}</span>
                        <span className="text-indigo-600 group-hover:translate-x-1 transition-transform font-bold flex items-center gap-0.5">
                          Manage ↗
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Active Shipments Pagination */}
                {activeTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-mono">
                    <span className="text-slate-500 text-[11px]">
                      Showing {(currentActivePage - 1) * activePageSize + 1} - {Math.min(currentActivePage * activePageSize, activeProcessShipmentsList.length)} of {activeProcessShipmentsList.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={currentActivePage <= 1}
                        onClick={() => setActivePage(p => Math.max(1, p - 1))}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors cursor-pointer text-xs"
                      >
                        ‹ Prev
                      </button>
                      <span className="px-1.5 text-slate-700 font-bold text-xs">
                        {currentActivePage}/{activeTotalPages}
                      </span>
                      <button
                        disabled={currentActivePage >= activeTotalPages}
                        onClick={() => setActivePage(p => Math.min(activeTotalPages, p + 1))}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors cursor-pointer text-xs"
                      >
                        Next ›
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* WIDGET 2: Pending Compliance Documents Matrix (With Pagination) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
                  <span>📋</span> Pending Compliance Documents ({filteredPendingDocs.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Update attestation statuses directly. Click shipment ref to view details.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setPendingDocsPage(1);
                  }}
                  placeholder="Filter pending docs..."
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium w-36 sm:w-44"
                />
              </div>
            </div>

            {/* Doc Filters */}
            <div className="flex flex-wrap gap-1.5 text-xs font-bold font-mono">
              <button
                onClick={() => {
                  setDocFilter('ALL');
                  setPendingDocsPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                  docFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Incomplete ({pendingDocsList.length})
              </button>
              <button
                onClick={() => {
                  setDocFilter('ATTESTING');
                  setPendingDocsPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                  docFilter === 'ATTESTING' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                In Attestation ({inAttestationCount})
              </button>
              <button
                onClick={() => {
                  setDocFilter('PENDING');
                  setPendingDocsPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                  docFilter === 'PENDING' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Not Started ({notStartedCount})
              </button>
            </div>

            {/* Pending Docs Cards List */}
            {filteredPendingDocs.length === 0 ? (
              <div className="bg-slate-50 p-8 text-center rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                <p className="font-bold text-slate-700">🎉 No Pending Documents</p>
                <p className="text-[11px] mt-1">All linked compliance documents are fully completed.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  {pagedPendingDocs.map((item, idx) => (
                    <div
                      key={`${item.shipmentId}-${item.docIndex}-${idx}`}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.isUrgent
                          ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                          : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:border-indigo-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900">{item.docName}</span>
                          {item.isUrgent && (
                            <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.2 rounded font-mono uppercase animate-pulse">
                              🚨 ETA Urgent
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => onSelectTab && onSelectTab('invoices')}
                            className="font-bold text-indigo-700 hover:underline cursor-pointer flex items-center gap-1"
                            title="Click to view active shipment in Invoices & Manuals"
                          >
                            Ref: {item.invoice} ↗
                          </button>
                          {item.containerNo && (
                            <span className="bg-slate-200/80 px-1.5 py-0.2 rounded text-slate-700 font-semibold">
                              📦 {item.containerNo}
                            </span>
                          )}
                          <button
                            onClick={() => onSelectTab && onSelectTab('invoices')}
                            className="hover:underline cursor-pointer text-slate-700"
                            title="Click to view destination in Invoices & Manuals"
                          >
                            Dest: <strong>{item.dest}</strong>
                          </button>
                          {item.eta && <span>ETA: <strong>{item.eta}</strong></span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <select
                          value={item.docStatus}
                          onChange={e => onUpdateDocStatus(item.shipmentId, item.docIndex, e.target.value as DocStatus)}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer border focus:outline-none ${
                            item.docStatus === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : item.docStatus === 'In Attestation'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : item.docStatus === 'Pending Approval'
                              ? 'bg-sky-100 text-sky-900 border-sky-300'
                              : 'bg-rose-100 text-rose-900 border-rose-300'
                          }`}
                        >
                          {getLinkedStatusesForDoc(item.docName, masterDocs, item.docStatus).map(st => (
                            <option key={st} value={st}>
                              {st === 'Completed' ? '✓ Mark Completed' : st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pending Docs Pagination */}
                {pendingTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-mono">
                    <span className="text-slate-500 text-[11px]">
                      Showing {(currentPendingPage - 1) * pendingDocsPageSize + 1} - {Math.min(currentPendingPage * pendingDocsPageSize, filteredPendingDocs.length)} of {filteredPendingDocs.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={currentPendingPage <= 1}
                        onClick={() => setPendingDocsPage(p => Math.max(1, p - 1))}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors cursor-pointer text-xs"
                      >
                        ‹ Prev
                      </button>
                      <span className="px-1.5 text-slate-700 font-bold text-xs">
                        {currentPendingPage}/{pendingTotalPages}
                      </span>
                      <button
                        disabled={currentPendingPage >= pendingTotalPages}
                        onClick={() => setPendingDocsPage(p => Math.min(pendingTotalPages, p + 1))}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors cursor-pointer text-xs"
                      >
                        Next ›
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT / SIDE COLUMN (lg:col-span-5 / xl:col-span-4): Embassy Attestation Widget + Destination Ports */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* SIDE WIDGET: Embassy Attestation Status by Shipment (On the side!) */}
          <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="border-b border-slate-100 pb-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <span>🏛️</span> Embassy Attestation by Shipment
                </h2>
                <span className="bg-amber-100 text-amber-900 font-extrabold text-[11px] px-2 py-0.5 rounded-full font-mono">
                  {pendingEmbassyCount} Incomplete
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Check which shipment's Embassy Attestation is not completed yet.
              </p>

              {/* Search input for side widget */}
              <input
                type="text"
                value={embassySearch}
                onChange={e => {
                  setEmbassySearch(e.target.value);
                  setEmbassyPage(1);
                }}
                placeholder="Search shipment ref or dest..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />

              {/* Filter Buttons for Embassy Widget */}
              <div className="flex flex-wrap gap-1 pt-1 font-mono text-[11px]">
                <button
                  onClick={() => {
                    setEmbassyFilter('INCOMPLETE');
                    setEmbassyPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-bold ${
                    embassyFilter === 'INCOMPLETE'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ⏳ Incomplete ({pendingEmbassyCount})
                </button>
                <button
                  onClick={() => {
                    setEmbassyFilter('ALL');
                    setEmbassyPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-bold ${
                    embassyFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({totalEmbassyCount})
                </button>
                <button
                  onClick={() => {
                    setEmbassyFilter('COMPLETED');
                    setEmbassyPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-bold ${
                    embassyFilter === 'COMPLETED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ✓ Completed ({completedEmbassyCount})
                </button>
              </div>
            </div>

            {/* Embassy Attestation Records List */}
            {filteredEmbassyList.length === 0 ? (
              <div className="bg-slate-50 p-5 text-center rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                <p className="font-bold text-slate-700">🎉 No Records Found</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  {embassyFilter === 'INCOMPLETE'
                    ? 'All shipments have completed Embassy Attestation!'
                    : 'No documents match the current filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pagedEmbassyDocs.map((item, idx) => (
                  <div
                    key={`${item.shipmentId}-${item.docIndex}-${idx}`}
                    className={`p-3 rounded-xl border transition-all space-y-2 ${
                      !item.isCompleted
                        ? 'bg-amber-50/50 border-amber-200/90 hover:border-amber-400'
                        : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => onSelectTab && onSelectTab('invoices')}
                            className="font-extrabold text-xs text-indigo-900 hover:underline cursor-pointer font-mono"
                            title="Click to view shipment in Invoices & Manuals"
                          >
                            Shipment: {item.invoice} ↗
                          </button>
                          {!item.isCompleted ? (
                            <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded font-mono uppercase">
                              Incomplete
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.2 rounded font-mono uppercase">
                              Completed
                            </span>
                          )}
                          {item.isUrgent && (
                            <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded font-mono uppercase animate-pulse">
                              🚨 Urgent
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5 flex items-center gap-1">
                          <span>🏛️</span> {item.docName}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-200/60">
                      <div>
                        Dest: <strong className="text-slate-700">{item.dest}</strong>
                        {item.eta && <span className="ml-1.5 text-slate-400">ETA: {item.eta}</span>}
                      </div>
                      <select
                        value={item.docStatus}
                        onChange={e => onUpdateDocStatus(item.shipmentId, item.docIndex, e.target.value as DocStatus)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer border focus:outline-none ${
                          item.docStatus === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : item.docStatus === 'In Attestation'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : item.docStatus === 'Pending Approval'
                            ? 'bg-sky-100 text-sky-900 border-sky-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}
                      >
                        {getLinkedStatusesForDoc(item.docName, masterDocs, item.docStatus).map(st => (
                          <option key={st} value={st}>
                            {st === 'Completed' ? '✓ Completed' : st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Embassy Attestation Side Widget Pagination */}
            {embassyTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-mono">
                <span className="text-slate-500 text-[10px]">
                  Page {currentEmbassyPage} of {embassyTotalPages} ({filteredEmbassyList.length} total)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentEmbassyPage <= 1}
                    onClick={() => setEmbassyPage(p => Math.max(1, p - 1))}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors cursor-pointer text-xs"
                  >
                    ‹ Prev
                  </button>
                  <button
                    disabled={currentEmbassyPage >= embassyTotalPages}
                    onClick={() => setEmbassyPage(p => Math.min(embassyTotalPages, p + 1))}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors cursor-pointer text-xs"
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SIDE WIDGET 2: Destination Ports Breakdown Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <span>⚓</span> Active Destination Ports
                </h2>
                <p className="text-[11px] text-slate-500">Destinations for active shipments currently processing documents.</p>
              </div>
              {destPortEntries.length > 0 && (
                <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {destPortEntries.length} {destPortEntries.length === 1 ? 'Port' : 'Ports'}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {destPortEntries.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 text-center">No active shipments in process with destination ports.</p>
              ) : (
                pagedDestPorts.map(([port, count]) => (
                  <div
                    key={port}
                    onClick={() => onSelectTab && onSelectTab('invoices')}
                    className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-indigo-50/60 hover:border-indigo-300 transition-all cursor-pointer group"
                    title="Click to view shipments for this destination in Invoices & Manuals"
                  >
                    <span className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors text-[11px]">
                      ⚓ {port}
                    </span>
                    <span className="bg-indigo-100 text-indigo-800 font-extrabold text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                      {count} {count === 1 ? 'Shipment' : 'Shipments'} ↗
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Active Destination Ports Pagination */}
            {destPortTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-mono">
                <span className="text-slate-500 text-[10px]">
                  Page {currentDestPortPage} of {destPortTotalPages} ({destPortEntries.length} total)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentDestPortPage <= 1}
                    onClick={() => setDestPortPage(p => Math.max(1, p - 1))}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors cursor-pointer text-xs"
                  >
                    ‹ Prev
                  </button>
                  <button
                    disabled={currentDestPortPage >= destPortTotalPages}
                    onClick={() => setDestPortPage(p => Math.min(destPortTotalPages, p + 1))}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors cursor-pointer text-xs"
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM WIDGET: Comprehensive System Activity & Audit Logs */}
      {(() => {
        const filteredLogs = auditLogs.filter(log => {
          // Filter by category
          if (auditFilter === 'DOCS') {
            const isDoc = log.targetType === 'doc_config' || log.action.toLowerCase().includes('doc') || log.action.toLowerCase().includes('attestation') || log.action.toLowerCase().includes('clearance');
            if (!isDoc) return false;
          } else if (auditFilter === 'SHIPMENTS') {
            const isShipment = log.targetType === 'shipment' || log.targetType === 'invoice' || log.action.toLowerCase().includes('shipment') || log.action.toLowerCase().includes('stage') || log.action.toLowerCase().includes('invoice');
            if (!isShipment) return false;
          } else if (auditFilter === 'CUSTOMERS') {
            const isCust = log.targetType === 'customer' || log.action.toLowerCase().includes('customer');
            if (!isCust) return false;
          } else if (auditFilter === 'SYSTEM') {
            const isSys = log.targetType === 'system' || log.action.toLowerCase().includes('system') || log.action.toLowerCase().includes('config');
            if (!isSys) return false;
          }

          // Filter by search term
          if (auditSearch.trim()) {
            const q = auditSearch.toLowerCase();
            const matchAction = log.action.toLowerCase().includes(q);
            const matchDetails = log.details.toLowerCase().includes(q);
            const matchTarget = (log.targetId || '').toLowerCase().includes(q);
            const matchUser = (log.user || '').toLowerCase().includes(q);
            if (!matchAction && !matchDetails && !matchTarget && !matchUser) return false;
          }

          return true;
        });

        const totalAuditPages = Math.max(1, Math.ceil(filteredLogs.length / auditPageSize));
        const paginatedLogs = filteredLogs.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize);

        const getActionBadgeColor = (action: string, targetType: string) => {
          const act = action.toLowerCase();
          if (act.includes('completed') || act.includes('clearance')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
          if (act.includes('created') || act.includes('added')) return 'bg-teal-100 text-teal-800 border-teal-200';
          if (act.includes('updated') || act.includes('attestation') || act.includes('changed')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
          if (act.includes('deleted') || act.includes('removed')) return 'bg-rose-100 text-rose-800 border-rose-200';
          if (targetType === 'customer') return 'bg-purple-100 text-purple-800 border-purple-200';
          return 'bg-slate-100 text-slate-800 border-slate-200';
        };

        const getActionIcon = (action: string, targetType: string) => {
          const act = action.toLowerCase();
          if (act.includes('clearance') || act.includes('complete')) return '✅';
          if (act.includes('customer')) return '👤';
          if (act.includes('doc') || act.includes('attestation')) return '📑';
          if (act.includes('stage') || act.includes('delivered') || act.includes('transit')) return '🚢';
          if (act.includes('created') || act.includes('invoice')) return '🧾';
          if (act.includes('deleted')) return '🗑️';
          return '📡';
        };

        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 sm:p-4 space-y-2.5">
            {/* Header: EVENT LOGS */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">📡</span>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase font-mono tracking-wider">
                  EVENT LOGS
                </h2>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full border border-emerald-200 font-mono animate-pulse">
                  ● LIVE
                </span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                  ({filteredLogs.length} total)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {onRefreshAuditLogs && (
                  <button
                    onClick={onRefreshAuditLogs}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-md border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                    title="Refresh latest event logs"
                  >
                    <span>🔄</span> Refresh
                  </button>
                )}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-50/80 p-2 rounded-lg border border-slate-200">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: 'ALL', label: 'All', count: auditLogs.length },
                  { id: 'DOCS', label: 'Docs', count: auditLogs.filter(l => l.targetType === 'doc_config' || l.action.toLowerCase().includes('doc') || l.action.toLowerCase().includes('attestation')).length },
                  { id: 'SHIPMENTS', label: 'Shipments', count: auditLogs.filter(l => l.targetType === 'shipment' || l.targetType === 'invoice').length },
                  { id: 'CUSTOMERS', label: 'Customers', count: auditLogs.filter(l => l.targetType === 'customer' || l.action.toLowerCase().includes('customer')).length },
                  { id: 'SYSTEM', label: 'System', count: auditLogs.filter(l => l.targetType === 'system' || l.action.toLowerCase().includes('system')).length },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setAuditFilter(cat.id as any); setAuditPage(1); }}
                    className={`px-2 py-0.5 rounded font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 ${
                      auditFilter === cat.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[9px] px-1 py-0 rounded font-mono ${auditFilter === cat.id ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[170px]">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={auditSearch}
                  onChange={e => { setAuditSearch(e.target.value); setAuditPage(1); }}
                  className="w-full pl-6 pr-5 py-0.5 text-[11px] rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
                <span className="absolute left-2 top-1 text-slate-400 text-[10px]">🔍</span>
                {auditSearch && (
                  <button
                    onClick={() => { setAuditSearch(''); setAuditPage(1); }}
                    className="absolute right-1.5 top-0.5 text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Event Logs List View */}
            {filteredLogs.length === 0 ? (
              <div className="p-4 text-center text-[11px] text-slate-400 font-mono bg-slate-50 rounded-lg border border-slate-200">
                {auditSearch || auditFilter !== 'ALL'
                  ? 'No event logs match your search and filter criteria.'
                  : 'No event logs recorded yet.'}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
                {/* Table Header for Desktop */}
                <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 py-1.5 bg-slate-100 text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <div className="col-span-2">Time</div>
                  <div className="col-span-2">Event</div>
                  <div className="col-span-5">Activity Details</div>
                  <div className="col-span-2">Target</div>
                  <div className="col-span-1 text-right">User</div>
                </div>

                {/* List Rows */}
                {paginatedLogs.map((log, i) => {
                  const logDate = log.timestamp ? new Date(log.timestamp) : null;
                  const timeFormatted = log.time || (logDate ? logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent');
                  const dateFormatted = logDate ? logDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

                  return (
                    <div
                      key={log.id || i}
                      className="px-3 py-1.5 md:py-2 hover:bg-slate-50/80 transition-colors flex flex-col md:grid md:grid-cols-12 gap-1 md:gap-2 items-start md:items-center text-[11px]"
                    >
                      {/* Time Column */}
                      <div className="md:col-span-2 flex items-center gap-1 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        <span className="text-slate-400">🕒</span>
                        <span className="font-semibold text-slate-700">{timeFormatted}</span>
                        {dateFormatted && (
                          <span className="text-[9px] text-slate-400 font-normal">({dateFormatted})</span>
                        )}
                      </div>

                      {/* Action Badge Column */}
                      <div className="md:col-span-2 flex items-center gap-1 flex-wrap">
                        <span className="text-xs">{getActionIcon(log.action, log.targetType)}</span>
                        <span className={`font-bold text-[10px] px-1.5 py-0.2 rounded border ${getActionBadgeColor(log.action, log.targetType)} whitespace-nowrap`}>
                          {log.action}
                        </span>
                      </div>

                      {/* Details Column */}
                      <div className="md:col-span-5 text-slate-700 text-[11px] font-medium leading-snug line-clamp-2 md:line-clamp-1" title={log.details}>
                        {log.details}
                      </div>

                      {/* Target Entity Column */}
                      <div className="md:col-span-2 flex items-center gap-1 font-mono text-[10px]">
                        {log.targetId && log.targetId !== 'system' ? (
                          <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold text-[9px] truncate max-w-[130px]">
                            <span className="text-slate-400 uppercase">{log.targetType}:</span>
                            <span className="truncate">{log.targetId}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[9px] font-mono">System</span>
                        )}
                      </div>

                      {/* User Column */}
                      <div className="md:col-span-1 md:text-right w-full md:w-auto flex justify-between md:justify-end items-center">
                        <span className="md:hidden text-[9px] text-slate-400 font-mono">User:</span>
                        <span className="font-bold text-indigo-700 uppercase bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded text-[9px] font-mono">
                          {log.user || 'Admin'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalAuditPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-[11px] border-t border-slate-100">
                <span className="text-slate-500 text-[10px] font-mono">
                  Showing {((auditPage - 1) * auditPageSize) + 1} - {Math.min(auditPage * auditPageSize, filteredLogs.length)} of {filteredLogs.length} events
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAuditPage(1)}
                    disabled={auditPage === 1}
                    className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors text-[10px] cursor-pointer"
                    title="First Page"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                    disabled={auditPage === 1}
                    className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors text-[10px] cursor-pointer flex items-center gap-0.5"
                  >
                    ‹ Prev
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalAuditPages) }, (_, idx) => {
                    let pageNum = idx + 1;
                    if (totalAuditPages > 5) {
                      if (auditPage > 3 && auditPage < totalAuditPages - 1) {
                        pageNum = auditPage - 2 + idx;
                      } else if (auditPage >= totalAuditPages - 1) {
                        pageNum = totalAuditPages - 4 + idx;
                      }
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setAuditPage(pageNum)}
                        className={`w-6 h-6 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          auditPage === pageNum
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                    disabled={auditPage === totalAuditPages}
                    className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors text-[10px] cursor-pointer flex items-center gap-0.5"
                  >
                    Next ›
                  </button>
                  <button
                    onClick={() => setAuditPage(totalAuditPages)}
                    disabled={auditPage === totalAuditPages}
                    className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors text-[10px] cursor-pointer"
                    title="Last Page"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
