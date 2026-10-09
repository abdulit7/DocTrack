import React, { useState } from 'react';
import { Shipment, Customer, DocStatus } from '../../types';
import { getLinkedStatusesForDoc, MasterDocConfig } from './DocConfigPage';

interface DocumentsListViewProps {
  shipments: Shipment[];
  customers?: Customer[];
  masterDocs?: MasterDocConfig[];
  onUpdateDocStatus: (shipmentId: string, docIndex: number, status: DocStatus) => void;
  onOpenContainerTracker: (containerNo?: string) => void;
}

type GroupByOption = 'SHIPMENT' | 'DOC_TYPE' | 'NONE';

export const DocumentsListView: React.FC<DocumentsListViewProps> = ({
  shipments,
  customers = [],
  masterDocs,
  onUpdateDocStatus,
  onOpenContainerTracker,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | 'EMBASSY_ATTESTATION'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByOption>('SHIPMENT');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Requirement: "in doucments list only shipments show that their documets are being working"
  // Filter shipments to only those whose documents are actively being worked on (at least 1 document not Completed)
  const workingShipments = shipments.filter(s => {
    const docs = s.docs || [];
    if (docs.length === 0) return false;
    // Allow 'Completed' tab to show completed docs if explicitly selected by user
    if (filterStatus === 'Completed') return true;
    return docs.some(d => {
      const st = typeof d === 'string' ? 'Not Started' : d?.status || 'Not Started';
      return st !== 'Completed';
    });
  });

  // Flatten all documents of working shipments into master list
  const allDocs = workingShipments.flatMap(s => {
    const cust = customers.find(c => c.id === s.customerId);
    const customerName = cust ? cust.name : '';
    return (s.docs || []).map((d, index) => ({
      shipmentId: s.id,
      invoice: s.invoice,
      containerNo: s.containerNo || '—',
      dest: s.dest,
      customerId: s.customerId,
      customerName,
      etd: s.etd,
      eta: s.eta,
      docIndex: index,
      docName: typeof d === 'string' ? d : (d as any)?.name || '',
      status: typeof d === 'string' ? ('Not Started' as DocStatus) : (d as any)?.status || ('Not Started' as DocStatus),
    }));
  });

  const embassyDocsCount = allDocs.filter(d => {
    const name = d.docName.toLowerCase();
    return name.includes('embassy') || name.includes('attestation');
  }).length;

  const filteredDocs = allDocs.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.docName.toLowerCase().includes(q) ||
      item.invoice.toLowerCase().includes(q) ||
      item.containerNo.toLowerCase().includes(q) ||
      item.dest.toLowerCase().includes(q) ||
      (item.customerName && item.customerName.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    // Document Type Filter (Embassy Attestation)
    if (docTypeFilter === 'EMBASSY_ATTESTATION') {
      const name = item.docName.toLowerCase();
      if (!name.includes('embassy') && !name.includes('attestation')) {
        return false;
      }
    }

    // Status Filter
    if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;

    return true;
  });

  // Grouping logic
  const groupKeyGetter = (item: (typeof allDocs)[0]): string => {
    if (groupBy === 'SHIPMENT') return `Shipment: ${item.invoice} | Container: ${item.containerNo} → ${item.dest}`;
    if (groupBy === 'DOC_TYPE') return item.docName;
    return 'All Compliance Documents';
  };

  const groupedMap: Record<string, typeof allDocs> = {};
  filteredDocs.forEach(item => {
    const key = groupKeyGetter(item);
    if (!groupedMap[key]) groupedMap[key] = [];
    groupedMap[key].push(item);
  });

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAll = () => setCollapsedGroups({});
  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    Object.keys(groupedMap).forEach(k => {
      next[k] = true;
    });
    setCollapsedGroups(next);
  };

  const getStatusBadgeClass = (st: string) => {
    if (st === 'Completed') return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    if (st === 'In Attestation') return 'bg-amber-50 text-amber-800 border-amber-300';
    if (st === 'Pending' || st === 'Pending Approval') return 'bg-sky-50 text-sky-800 border-sky-300';
    if (st === 'Waiting') return 'bg-purple-50 text-purple-800 border-purple-300';
    if (st === 'Rejected') return 'bg-rose-50 text-rose-800 border-rose-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  return (
    <div className="space-y-4 select-none">
      {/* Page Title & Breadcrumbs */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase font-sans flex items-center gap-2">
            <span>📄</span> Master Shipment Documents List
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Collapsible shipment view showing attached compliance documents and real-time status attestation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-[11px] text-slate-400">
            Dashboard &gt; Track & Trace &gt; <span className="text-slate-700 font-bold">Documents List</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Group By Selector, Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Group By Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <span className="text-xs font-bold text-slate-500 px-2 font-mono uppercase">Group By:</span>
            <button
              onClick={() => setGroupBy('SHIPMENT')}
              className={`text-xs font-bold px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                groupBy === 'SHIPMENT' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🚢 Shipment Reference
            </button>
            <button
              onClick={() => setGroupBy('DOC_TYPE')}
              className={`text-xs font-bold px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                groupBy === 'DOC_TYPE' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📄 Document Type
            </button>
            <button
              onClick={() => setGroupBy('NONE')}
              className={`text-xs font-bold px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                groupBy === 'NONE' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Flat List
            </button>
          </div>

          {/* Expand/Collapse Controls */}
          {groupBy !== 'NONE' && (
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition-colors"
              >
                ▼ Expand All
              </button>
              <button
                onClick={collapseAll}
                className="text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition-colors"
              >
                ▲ Collapse All
              </button>
            </div>
          )}
        </div>

        {/* Status Filters & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto text-xs font-bold">
            {/* Embassy Attestation Quick Filter */}
            <div className="flex items-center gap-1 bg-amber-50 p-0.5 rounded-lg border border-amber-200">
              <button
                type="button"
                onClick={() => setDocTypeFilter(docTypeFilter === 'EMBASSY_ATTESTATION' ? 'ALL' : 'EMBASSY_ATTESTATION')}
                className={`px-3 py-1 rounded-md cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  docTypeFilter === 'EMBASSY_ATTESTATION'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-amber-900 hover:bg-amber-100'
                }`}
              >
                <span>🏛️</span>
                <span>Embassy Attestation Filter</span>
                <span className="bg-amber-200/80 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {embassyDocsCount}
                </span>
              </button>
            </div>

            <span className="text-slate-300">|</span>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1">
              {['ALL', 'Not Started', 'Pending Approval', 'Completed', 'Rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                    filterStatus === status
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {status === 'ALL' ? `All Statuses` : status}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search documents, reference or container..."
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 font-medium"
          />
        </div>
      </div>

      {/* Grouped & Collapsible Sections */}
      {Object.keys(groupedMap).length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
          <div className="text-4xl mb-2">📑</div>
          <div className="font-bold text-slate-800 text-base">No Compliance Documents Found</div>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Try adjusting your search filter or stage filters.
          </p>
        </div>
      ) : (
        Object.entries(groupedMap).map(([groupTitle, docs]) => {
          const isCollapsed = !!collapsedGroups[groupTitle];
          const completedCount = docs.filter(d => d.status === 'Completed').length;
          const totalCount = docs.length;
          const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

          return (
            <div
              key={groupTitle}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all"
            >
              {/* Collapsible Header */}
              <div
                onClick={() => toggleGroupCollapse(groupTitle)}
                className="p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center justify-between border-b border-slate-200 select-none transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-xs font-bold w-4">
                    {isCollapsed ? '►' : '▼'}
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{groupBy === 'SHIPMENT' ? '🚢' : groupBy === 'DOC_TYPE' ? '📄' : '📋'}</span>
                      <span>{groupTitle}</span>
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {totalCount} document{totalCount === 1 ? '' : 's'} linked · {completedCount} completed ({progressPct}%)
                    </p>
                  </div>
                </div>

                {/* Progress bar & badge */}
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-2 w-36">
                    <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-600">{progressPct}%</span>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      completedCount === totalCount
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {completedCount}/{totalCount} Cleared
                  </span>
                </div>
              </div>

              {/* Collapsible Content Body */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Document Name</th>
                        {groupBy !== 'SHIPMENT' && <th className="p-3">Shipment Reference</th>}
                        <th className="p-3">Container No</th>
                        <th className="p-3">ETD Date</th>
                        <th className="p-3">ETA Date</th>
                        <th className="p-3">Compliance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {docs.map((item, idx) => {
                        const allowedStatuses = getLinkedStatusesForDoc(item.docName, masterDocs, item.status);
                        return (
                          <tr key={`${item.shipmentId}-${item.docIndex}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  item.status === 'Completed'
                                    ? 'bg-emerald-500'
                                    : item.status === 'In Attestation'
                                    ? 'bg-amber-500 animate-pulse'
                                    : item.status === 'Pending' || item.status === 'Pending Approval'
                                    ? 'bg-sky-500'
                                    : 'bg-rose-500'
                                }`}
                              />
                              <span>{item.docName}</span>
                            </td>
                            {groupBy !== 'SHIPMENT' && (
                              <td className="p-3 font-mono font-bold text-indigo-700">{item.invoice}</td>
                            )}
                            <td className="p-3 font-mono text-slate-700">{item.containerNo}</td>
                            <td className="p-3 font-mono text-slate-500">{item.etd || '—'}</td>
                            <td className="p-3 font-mono text-slate-500">{item.eta || '—'}</td>
                            <td className="p-3">
                              <select
                                value={item.status}
                                onChange={e =>
                                  onUpdateDocStatus(item.shipmentId, item.docIndex, e.target.value as DocStatus)
                                }
                                className={`text-[11px] font-bold px-2.5 py-1 rounded cursor-pointer border focus:outline-none ${getStatusBadgeClass(
                                  item.status
                                )}`}
                              >
                                {allowedStatuses.map(st => (
                                  <option key={st} value={st}>
                                    {st === 'Completed' ? '✓ Completed' : st}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
