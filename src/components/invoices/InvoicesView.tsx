import React, { useState, useMemo } from 'react';
import { Shipment, Customer, DocStatus, ShipmentStage, TradeType } from '../../types';
import { DocStatusDot } from '../common/DocStatusDot';
import { getLinkedStatusesForDoc, MasterDocConfig } from '../documents/DocConfigPage';

interface InvoicesViewProps {
  shipments: Shipment[];
  customers: Customer[];
  masterDocs?: MasterDocConfig[];
  onUpdateDocStatus: (shipmentId: string, docIndex: number, status: DocStatus) => void;
  onUpdateShipmentDocs?: (shipmentId: string, docs: { name: string; status: DocStatus }[]) => void;
  onUpdateShipmentStage?: (shipmentId: string, newStage: ShipmentStage) => void;
  onOpenCoverSheet?: (shipment: Shipment) => void;
  onCreateInvoiceOpen?: () => void;
  onEditShipment?: (shipment: Shipment) => void;
  onDeleteShipment?: (shipmentId: string) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  shipments,
  customers,
  masterDocs,
  onUpdateDocStatus,
  onUpdateShipmentDocs,
  onUpdateShipmentStage,
  onOpenCoverSheet,
  onCreateInvoiceOpen,
  onEditShipment,
  onDeleteShipment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'Import' | 'Export'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const formatCreationDate = (dateStr?: string) => {
    if (!dateStr) return { date: '—', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: '' };
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return {
        date: `${day}/${month}/${year}`,
        time: `${hours}:${mins}`,
      };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  // Helper to check if a shipment is linked with ShipsGo
  const isShipmentShipsGoLinked = (s: Shipment): boolean => {
    if (s.isShipsGoLinked === false) return false;
    return Boolean(s.isShipsGoLinked && s.shipsgoReference);
  };

  // Helper to get ShipsGo reference string if linked
  const getShipsGoReference = (s: Shipment): string | null => {
    if (!isShipmentShipsGoLinked(s)) return null;
    return s.shipsgoReference || null;
  };

  // Helper to determine if a shipment has documents associated with it (from shipment or customer profile)
  const getEffectiveDocsForShipment = (s: Shipment): { name: string; status: DocStatus }[] => {
    const cust = customers.find(c => c.id === s.customerId || c.name === s.customerId);
    const custReqDocs = (cust?.requiredDocs || [])
      .map(d => (typeof d === 'string' ? d : (d as any)?.name || ''))
      .filter(Boolean);
    const existingDocMap = new Map<string, DocStatus>(
      (s.docs || []).map(d => [typeof d === 'string' ? d : d?.name || '', typeof d === 'string' ? 'Not Started' : d?.status || 'Not Started'])
    );
    const shipDocNames = (s.docs || []).map(d => (typeof d === 'string' ? d : d?.name || ''));
    const allDocNames = Array.from(new Set<string>([...custReqDocs, ...shipDocNames])).filter(Boolean);
    return allDocNames.map(docName => ({
      name: docName,
      status: existingDocMap.get(docName) || ('Not Started' as DocStatus),
    }));
  };

  // Helper to determine if an invoice is completely cleared / completed
  const isInvoiceCompleted = (s: Shipment): boolean => {
    const effectiveDocs = getEffectiveDocsForShipment(s);
    const totalDocs = effectiveDocs.length;
    const completedDocs = effectiveDocs.filter(d => d.status === 'Completed').length;
    return (totalDocs > 0 && completedDocs === totalDocs) || s.status === 'Delivered';
  };

  // Only show shipments/invoices working with documents on Invoices & Manuals page
  // Exclude pure ShipsGo-synced shipments that do not have clearance documents
  const validLinkedShipments = useMemo(() => {
    return shipments.filter(s => {
      if (!s || (!s.id && !s.invoice)) return false;
      const effectiveDocs = getEffectiveDocsForShipment(s);
      return effectiveDocs.length > 0;
    });
  }, [shipments, customers]);

  // Compute breakdown counts for Trade Type & Status
  const counts = useMemo(() => {
    let importCount = 0;
    let exportCount = 0;
    let pendingCount = 0;
    let completedCount = 0;

    validLinkedShipments.forEach(s => {
      const type = s.tradeType || 'Export';
      if (type === 'Import') {
        importCount++;
      } else {
        exportCount++;
      }

      if (isInvoiceCompleted(s)) {
        completedCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      all: validLinkedShipments.length,
      import: importCount,
      export: exportCount,
      pending: pendingCount,
      completed: completedCount,
    };
  }, [validLinkedShipments, customers]);

  // Filter valid linked shipments by customer, trade type, invoice status, and search query
  const filteredShipments = useMemo(() => {
    return validLinkedShipments.filter(s => {
      const cust = customers.find(c => c.id === s.customerId);
      const isCompleted = isInvoiceCompleted(s);

      // Status Filter (All / Pending / Completed)
      if (statusFilter === 'PENDING' && isCompleted) {
        return false;
      }
      if (statusFilter === 'COMPLETED' && !isCompleted) {
        return false;
      }

      // Trade Type Filter (All, Import, Export)
      if (tradeFilter !== 'ALL') {
        const itemTradeType = s.tradeType || 'Export';
        if (itemTradeType !== tradeFilter) {
          return false;
        }
      }

      // Customer Filter
      if (selectedCustomerId !== 'ALL' && s.customerId !== selectedCustomerId) {
        return false;
      }

      const matchesSearch =
        !searchQuery ||
        s.invoice.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.dest.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.tradeType && s.tradeType.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.containerNo && s.containerNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.shipsgoReference && s.shipsgoReference.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (cust && cust.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [validLinkedShipments, customers, statusFilter, tradeFilter, selectedCustomerId, searchQuery]);

  // Extract distinct customers that have linked shipments
  const activeCustomers = useMemo(() => {
    const custMap = new Map<string, { id: string; name: string; count: number }>();
    validLinkedShipments.forEach(s => {
      if (!s.customerId) return;
      const c = customers.find(item => item.id === s.customerId);
      const name = c ? c.name : s.customerId;
      if (!custMap.has(s.customerId)) {
        custMap.set(s.customerId, { id: s.customerId, name, count: 0 });
      }
      custMap.get(s.customerId)!.count += 1;
    });
    return Array.from(custMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [validLinkedShipments, customers]);

  // Sort strictly according to date of creation, latest (newest/last created) on top
  const sortedShipments = useMemo(() => {
    return [...filteredShipments].sort((a, b) => {
      const parseTime = (s: Shipment) => {
        const dateVal = s.createdAt || (s as any).updatedAt || (s as any).timestamp;
        if (!dateVal) return 0;
        const t = new Date(dateVal).getTime();
        return isNaN(t) ? 0 : t;
      };
      const timeA = parseTime(a);
      const timeB = parseTime(b);
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [filteredShipments]);

  return (
    <div className="space-y-4 select-none">
      {/* Page Header */}
      <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
        <div>
          <h1 className="text-xl font-bold text-slate-800 uppercase font-sans flex items-center gap-2">
            <span>🧾</span> Invoices & Manuals
          </h1>
          <p className="text-xs text-slate-500">
            Manage Manual Invoices and ShipsGo Linked Invoices with clearance documents and customer compliance status.
          </p>
        </div>
        <div className="font-mono text-[11px] text-slate-400 hidden sm:block">
          Dashboard &gt; Clients & Invoices &gt; <span className="text-slate-700 font-bold">Invoices</span>
        </div>
      </div>

      {/* Control Bar: Create Invoice, Invoice Type (All/ShipsGo/Manual), Trade Type, Customer Filter & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {onCreateInvoiceOpen && (
              <button
                id="create-invoice-btn"
                onClick={onCreateInvoiceOpen}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm uppercase tracking-wide shrink-0"
              >
                <span className="text-sm">🧾</span> + Create Invoice
              </button>
            )}

            {/* Invoice Status Filter Tabs: All, Pending Invoices, Completed Invoices */}
            <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 font-sans text-xs">
              <button
                type="button"
                id="filter-all-invoices-btn"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>📋</span> All Invoices
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {counts.all}
                </span>
              </button>

              <button
                type="button"
                id="filter-pending-invoices-btn"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:text-amber-950 hover:bg-amber-50'
                }`}
                title="Invoices with pending / in-progress clearance documents"
              >
                <span>⏳</span> Pending Invoices
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'PENDING' ? 'bg-white text-amber-900' : 'bg-amber-100 text-amber-900'}`}>
                  {counts.pending}
                </span>
              </button>

              <button
                type="button"
                id="filter-completed-invoices-btn"
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50'
                }`}
                title="Invoices with all documents completed / delivered"
              >
                <span>✓</span> Completed Invoices
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'COMPLETED' ? 'bg-white text-emerald-900' : 'bg-emerald-100 text-emerald-900'}`}>
                  {counts.completed}
                </span>
              </button>
            </div>

            {/* Trade Type Filter Tabs: All, Import, Export */}
            <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 font-sans text-xs">
              <button
                type="button"
                id="filter-trade-all-btn"
                onClick={() => setTradeFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 text-xs ${
                  tradeFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🌐</span> All Trades
              </button>

              <button
                type="button"
                id="filter-import-btn"
                onClick={() => setTradeFilter('Import')}
                className={`px-2.5 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 text-xs ${
                  tradeFilter === 'Import'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                <span>📥</span> Import
              </button>

              <button
                type="button"
                id="filter-export-btn"
                onClick={() => setTradeFilter('Export')}
                className={`px-2.5 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 text-xs ${
                  tradeFilter === 'Export'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50'
                }`}
              >
                <span>📤</span> Export
              </button>
            </div>

            {/* Customer Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">👤</span>
              <select
                id="customer-filter-select"
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[180px] truncate"
                title="Filter invoices by customer"
              >
                <option value="ALL">👤 All Customers ({validLinkedShipments.length})</option>
                {activeCustomers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </div>

            {(selectedCustomerId !== 'ALL' || tradeFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId('ALL');
                  setTradeFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1"
                title="Reset all filters"
              >
                <span>✕</span> Reset
              </button>
            )}
          </div>

          <div className="w-full sm:w-72">
            <input
              id="invoice-search-input"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer, reference, container..."
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Invoice # & Trade</th>
                <th className="p-3">ShipsGo Reference</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Created Date</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Container No</th>
                <th className="p-3">Destination / POD</th>
                <th className="p-3">ETD / ETA</th>
                <th className="p-3">Document Progress</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedShipments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    <div className="text-3xl mb-2">🧾</div>
                    <div className="font-bold text-slate-800 text-sm">No Matching Invoices Found</div>
                    <p className="text-xs text-slate-400 mt-1">
                      {statusFilter === 'PENDING'
                        ? 'No pending invoices match your current filter.'
                        : statusFilter === 'COMPLETED'
                        ? 'No completed invoices match your current filter.'
                        : 'No invoices found matching your current search or filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sortedShipments.map(s => {
                  const cust = customers.find(c => c.id === s.customerId);
                  const isImport = s.tradeType === 'Import';
                  const custReqDocs = (cust?.requiredDocs || [])
                    .map(d => (typeof d === 'string' ? d : (d as any)?.name || ''))
                    .filter(Boolean);
                  const existingDocMap = new Map<string, DocStatus>(
                    (s.docs || []).map(d => [typeof d === 'string' ? d : d?.name || '', typeof d === 'string' ? 'Not Started' : d?.status || 'Not Started'])
                  );
                  const shipDocNames = (s.docs || []).map(d => (typeof d === 'string' ? d : d?.name || ''));
                  const allDocNames = Array.from(new Set<string>([...custReqDocs, ...shipDocNames])).filter(Boolean);
                  const effectiveDocs: { name: string; status: DocStatus }[] = allDocNames.map(docName => ({
                    name: docName,
                    status: existingDocMap.get(docName) || ('Not Started' as DocStatus),
                  }));

                  const totalDocs = effectiveDocs.length;
                  const completedDocs = effectiveDocs.filter(d => d.status === 'Completed').length;
                  const isAllCompleted = (totalDocs > 0 && completedDocs === totalDocs) || s.status === 'Delivered';
                  const progressPct = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
                  const isExpanded = expandedInvoiceId === s.id;
                  const creationInfo = formatCreationDate(s.createdAt);
                  const isLinked = isShipmentShipsGoLinked(s);
                  const shipsGoRef = getShipsGoReference(s);

                  return (
                    <React.Fragment key={s.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        {/* Invoice # & Trade Type */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : s.id)}
                              className="font-mono font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded border border-slate-300 cursor-pointer flex items-center gap-1.5 text-xs shadow-2xs"
                            >
                              <span className="text-[10px]">{isExpanded ? '▼' : '►'}</span>
                              <span>{s.invoice}</span>
                            </button>

                            {/* Import / Export Badge */}
                            {isImport ? (
                              <span
                                className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] px-1.5 py-0.5 rounded shadow-2xs font-mono uppercase tracking-wide"
                                title="Import Invoice"
                              >
                                <span>📥</span> IMPORT
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-300 font-extrabold text-[10px] px-1.5 py-0.5 rounded shadow-2xs font-mono uppercase tracking-wide"
                                title="Export Invoice"
                              >
                                <span>📤</span> EXPORT
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ShipsGo Reference Column: shows status/reference if linked, empty (—) if manual / not linked */}
                        <td className="p-3 font-mono">
                          {isLinked && shipsGoRef ? (
                            <span
                              className="inline-flex items-center gap-1 bg-sky-50 text-sky-900 border border-sky-300 font-mono font-bold text-[10.5px] px-2 py-0.5 rounded shadow-2xs"
                              title="ShipsGo Linked Reference"
                            >
                              <span>⚓</span> {shipsGoRef}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-xs select-none">—</span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="p-3 font-semibold text-slate-800">
                          {cust ? (
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              {cust.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned Customer</span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="p-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          <div className="font-semibold text-slate-700">{creationInfo.date}</div>
                          {creationInfo.time && <div className="text-[10px] text-slate-400">{creationInfo.time}</div>}
                        </td>

                        {/* Stage */}
                        <td className="p-3">
                          {isAllCompleted ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                              <span>✓</span> Completed
                            </span>
                          ) : onUpdateShipmentStage ? (
                            <select
                              value={s.status}
                              onChange={e => onUpdateShipmentStage(s.id, e.target.value as ShipmentStage)}
                              className={`text-xs font-extrabold px-2 py-1 rounded border cursor-pointer outline-none ${
                                s.status === 'Delivered'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : s.status === 'In Transit'
                                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              <option value="Documentation">Documentation</option>
                              <option value="In Transit">In Transit</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          ) : (
                            <span className="font-bold text-slate-800">{s.status}</span>
                          )}
                        </td>

                        {/* Container Number */}
                        <td className="p-3 font-mono text-slate-700 font-bold">
                          <div>{s.containerNo || '—'}</div>
                        </td>

                        {/* Destination */}
                        <td className="p-3 font-bold text-slate-800">{s.dest || '—'}</td>

                        {/* ETD / ETA */}
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          <div>ETD: {s.etd || 'N/A'}</div>
                          <div>ETA: {s.eta || 'N/A'}</div>
                        </td>

                        {/* Document Progress */}
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setExpandedInvoiceId(isExpanded ? null : s.id)}
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                          >
                            <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  progressPct === 100 ? 'bg-emerald-500' : progressPct > 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="font-bold text-[11px] text-slate-700 font-mono">
                              {completedDocs}/{totalDocs}
                            </span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          {onOpenCoverSheet && (
                            <button
                              onClick={() => onOpenCoverSheet(s)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold px-2 py-1 rounded border border-slate-300 transition-colors cursor-pointer"
                              title="Generate Customs Cover Sheet"
                            >
                              📄 Cover Sheet
                            </button>
                          )}
                          {onEditShipment && (
                            <button
                              onClick={() => onEditShipment(s)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2 py-1 rounded border border-indigo-200 transition-colors cursor-pointer"
                              title="Edit Invoice Details"
                            >
                              ✏️ Edit
                            </button>
                          )}
                          {onDeleteShipment && (
                            <button
                              onClick={() => onDeleteShipment(s.id || (s as any)._id || s.invoice)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold px-2 py-1 rounded border border-rose-200 transition-colors cursor-pointer"
                              title="Delete Invoice"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Row for Documents Detail & Linked ShipsGo Reference */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={10} className="p-3 border-b border-slate-200">
                            <div className="space-y-2.5 max-w-5xl">
                              {/* Compact ShipsGo Linked Reference Info */}
                              {isLinked && (
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 bg-sky-50/80 border border-sky-200/80 px-3 py-1.5 rounded-lg text-xs font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-medium">Ref:</span>
                                    <span className="font-bold text-sky-950">{shipsGoRef || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-medium">Container:</span>
                                    <span className="font-semibold text-slate-800">{s.containerNo || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-medium">POL:</span>
                                    <span className="font-semibold text-slate-800">{s.pol || 'Port of Loading'} ({s.etd || 'N/A'})</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-medium">POD:</span>
                                    <span className="font-semibold text-slate-800">{s.dest || 'Destination'} ({s.eta || 'N/A'})</span>
                                  </div>
                                </div>
                              )}

                              {/* Clearance Documents Checklist */}
                              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
                                    Clearance Documents ({completedDocs}/{totalDocs} Completed)
                                  </span>
                                </div>

                                {effectiveDocs.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">No clearance documents attached to this invoice.</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                    {effectiveDocs.map((doc, docIdx) => {
                                      const allowedStatuses = getLinkedStatusesForDoc(doc.name, masterDocs, doc.status);
                                      return (
                                        <div
                                          key={docIdx}
                                          className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-xs"
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                            <DocStatusDot status={doc.status} />
                                            <span className="font-medium text-slate-800 truncate">{doc.name}</span>
                                          </div>

                                          <select
                                            value={doc.status}
                                            onChange={e => {
                                              const newStatus = e.target.value as DocStatus;
                                              const updatedDocs = effectiveDocs.map((d, i) =>
                                                i === docIdx ? { ...d, status: newStatus } : d
                                              );
                                              if (onUpdateShipmentDocs) {
                                                onUpdateShipmentDocs(s.id, updatedDocs);
                                              } else {
                                                onUpdateDocStatus(s.id, docIdx, newStatus);
                                              }
                                            }}
                                            className="bg-white border border-slate-300 text-slate-800 text-[10.5px] px-2 py-0.5 rounded font-bold cursor-pointer focus:ring-1 focus:ring-indigo-500 shrink-0"
                                          >
                                            {allowedStatuses.map(st => (
                                              <option key={st} value={st}>
                                                {st}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
