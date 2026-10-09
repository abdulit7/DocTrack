import React, { useState } from 'react';
import { Customer, Shipment, DocStatus } from '../../types';
import { StampBadge } from '../common/StampBadge';
import { DocStatusDot } from '../common/DocStatusDot';
import { getLinkedStatusesForDoc, MasterDocConfig } from '../documents/DocConfigPage';

interface CustomerCardProps {
  customer: Customer;
  shipments: Shipment[];
  masterDocs?: MasterDocConfig[];
  isOpen: boolean;
  onToggle: () => void;
  onUpdateCustomer: (updates: Partial<Customer>) => void;
  onEditCustomer: (customer: Customer) => void;
  onUpdateDocStatus?: (docIndex: number, status: DocStatus) => void;
  onUpdateShipmentDocStatus?: (shipmentId: string, docIndex: number, status: DocStatus) => void;
  onUpdateShipmentDocs?: (shipmentId: string, docs: { name: string; status: DocStatus }[]) => void;
  onLinkShipmentToCustomer?: (shipmentId: string, customerId: string) => Promise<void>;
  onDelete: () => void;
  onJumpToShipment: (shipmentId: string) => void;
}

const DOC_STATUSES: DocStatus[] = [
  'Not Started',
  'Pending',
  'Waiting',
  'In Attestation',
  'Pending Approval',
  'Completed',
  'Rejected',
];

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  shipments,
  masterDocs,
  isOpen,
  onToggle,
  onUpdateCustomer,
  onEditCustomer,
  onUpdateShipmentDocStatus,
  onUpdateShipmentDocs,
  onDelete,
  onJumpToShipment,
}) => {
  const custShipments = shipments.filter(s => s.customerId === customer.id);
  const reqDocs = (customer.requiredDocs || [])
    .map(d => (typeof d === 'string' ? d : (d as any)?.name || ''))
    .filter(Boolean);

  // Helper function to get effective documents for a shipment
  const getEffectiveDocsForShipment = (s: Shipment) => {
    const existingDocMap = new Map<string, DocStatus>(
      (s.docs || []).map(d => [typeof d === 'string' ? d : d?.name || '', typeof d === 'string' ? 'Not Started' : d?.status || 'Not Started'])
    );
    const shipDocNames = (s.docs || []).map(d => (typeof d === 'string' ? d : d?.name || ''));
    const allDocNames = Array.from(new Set<string>([...reqDocs, ...shipDocNames])).filter(Boolean);
    return allDocNames.map(docName => ({
      name: docName,
      status: existingDocMap.get(docName) || ('Not Started' as DocStatus),
    }));
  };

  // Filter shipments whose documents are under process (at least 1 document not Completed)
  const inProcessShipments = custShipments.filter(s => {
    const effDocs = getEffectiveDocsForShipment(s);
    if (effDocs.length === 0) return true; // If no docs yet, treat as pending
    return effDocs.some(d => d.status !== 'Completed');
  });

  const customerStatus: string = inProcessShipments.length > 0 ? 'Pending' : 'Completed';

  // Overall shipment docs metrics for in-process shipments
  const totalShipDocs = inProcessShipments.reduce((sum, s) => {
    return sum + getEffectiveDocsForShipment(s).length;
  }, 0);

  const doneShipDocs = inProcessShipments.reduce((sum, s) => {
    return sum + getEffectiveDocsForShipment(s).filter(d => d.status === 'Completed').length;
  }, 0);

  return (
    <div className={`bg-[var(--navy-panel)] border border-[var(--line)] rounded overflow-hidden mb-3 ${isOpen ? 'open' : ''}`}>
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex items-center gap-3.5 p-3.5 cursor-pointer select-none hover:bg-[var(--navy-panel-2)]/50 transition-colors"
      >
        <span className={`font-mono-custom text-xs text-[var(--chalk-dim)] w-3.5 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>
          ▸
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--chalk)] truncate flex items-center gap-2">
            <span>{customer.name}</span>
          </div>
          <div className="text-xs text-[var(--chalk-dim)] mt-0.5">
            {reqDocs.length} required doc type{reqDocs.length === 1 ? '' : 's'} · {inProcessShipments.length} in-process shipment
            {inProcessShipments.length === 1 ? '' : 's'}
          </div>
        </div>
        <span className="font-mono-custom text-[11px] text-[var(--chalk-dim)] whitespace-nowrap">
          {inProcessShipments.length} Pending Invoice{inProcessShipments.length === 1 ? '' : 's'}
        </span>
        <StampBadge status={customerStatus} />
      </div>

      {/* Body */}
      {isOpen && (
        <div className="p-4 border-t border-[var(--line)] bg-[var(--navy-panel)]">
          <div className="flex justify-between items-center pb-3 border-b border-[var(--line)] gap-2 flex-wrap">
            <span className="text-xs text-[var(--chalk-dim)]">
              Status: <strong className={customerStatus === 'Completed' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{customerStatus}</strong>
              {inProcessShipments.length > 0 && ` · Active Docs: ${doneShipDocs}/${totalShipDocs} completed`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onEditCustomer(customer);
                }}
                className="font-mono-custom text-[10.5px] uppercase bg-indigo-600 hover:bg-indigo-700 text-white border-0 px-2.5 py-1 rounded cursor-pointer font-semibold transition-all flex items-center gap-1"
              >
                <span>✏️</span> Edit Customer
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="font-mono-custom text-[10.5px] uppercase bg-[var(--stamp-red)] text-[var(--chalk)] border-0 px-2.5 py-1 rounded cursor-pointer font-semibold hover:brightness-110 transition-all flex items-center gap-1"
              >
                <span>🗑️</span> Delete Customer
              </button>
            </div>
          </div>

          {/* Document Requirements */}
          <div className="font-mono-custom text-[10px] tracking-wider uppercase text-[var(--transit-teal)] mt-4 mb-2 flex items-center justify-between">
            <span>Customer Required Documents Template ({reqDocs.length})</span>
            <span className="text-[10px] text-[var(--chalk-dim)] normal-case">To edit required document types, click "Edit Customer" above</span>
          </div>

          <div className="min-h-[24px] mb-4">
            {reqDocs.length === 0 ? (
              <span className="text-xs text-[var(--chalk-dim)] italic">No required documents specified. Click "Edit Customer" above to attach document requirements.</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {reqDocs.map((name, idx) => (
                  <span key={idx} className="chip">
                    <span>📄 {typeof name === 'string' ? name : (name as any)?.name || ''}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Customer Shipments & Invoices */}
          <div className="font-mono-custom text-[10px] tracking-wider uppercase text-[var(--transit-teal)] mt-5 mb-2 flex items-center justify-between">
            <span>In-Process Shipments / Invoices ({inProcessShipments.length})</span>
            <span className="text-[10px] text-[var(--chalk-dim)] normal-case">Only displaying shipments with documents under process</span>
          </div>

          {inProcessShipments.length === 0 ? (
            <div className="text-xs text-[var(--chalk-dim)] italic py-3 px-3 bg-[var(--navy-panel-2)]/40 rounded border border-[var(--line)]">
              🎉 No shipments under document process for this customer. All shipment documents are completed or no active shipments are attached. Customer status: <strong className="text-emerald-400">Completed</strong>.
            </div>
          ) : (
            <div className="space-y-3">
              {inProcessShipments.map(s => {
                const effectiveDocs = getEffectiveDocsForShipment(s);
                const doneCount = effectiveDocs.filter(d => d.status === 'Completed').length;
                const totalDocs = effectiveDocs.length;
                const pct = totalDocs > 0 ? Math.round((doneCount / totalDocs) * 100) : 0;

                return (
                  <div
                    key={s.id}
                    className="p-3 bg-[var(--navy-panel-2)]/60 rounded-lg border border-[var(--line)] space-y-2.5 text-xs"
                  >
                    {/* Shipment Summary Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--line)]/60">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => onJumpToShipment(s.id)}
                          className="font-mono-custom font-bold text-[var(--transit-teal)] hover:underline cursor-pointer text-xs"
                        >
                          📄 {s.invoice}
                        </span>
                        <span className="text-[var(--chalk-dim)] text-[11px]">→ {s.dest}</span>
                        {s.containerNo && (
                          <span className="font-mono text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800">
                            📦 {s.containerNo}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="text-[var(--chalk-dim)]">Stage: <strong className="text-[var(--chalk)]">{s.status}</strong></span>
                        <span className="bg-[var(--navy-panel)] text-[var(--chalk)] px-2 py-0.5 rounded border border-[var(--line)] font-bold">
                          Docs: {doneCount}/{totalDocs} ({pct}%)
                        </span>
                      </div>
                    </div>

                    {/* Shipment Docs List */}
                    <div className="space-y-1.5 pl-1">
                      <div className="text-[10px] font-mono text-[var(--chalk-dim)] uppercase tracking-wider flex justify-between">
                        <span>Required Compliance Checklist for this Shipment:</span>
                        <span>{doneCount}/{totalDocs} Completed</span>
                      </div>

                      {effectiveDocs.length === 0 ? (
                        <div className="text-[11px] text-[var(--chalk-dim)] italic">No required documents attached to this shipment</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {effectiveDocs.map((doc, docIdx) => {
                            const allowedStatuses = getLinkedStatusesForDoc(doc.name, masterDocs, doc.status);
                            return (
                              <div
                                key={docIdx}
                                className="flex items-center justify-between p-1.5 bg-[var(--navy-panel)] rounded border border-[var(--line)] text-[11px]"
                              >
                                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                  <DocStatusDot status={doc.status} />
                                  <span className="text-[var(--chalk)] truncate font-medium">{typeof doc.name === 'string' ? doc.name : (doc.name as any)?.name || ''}</span>
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
                                    } else if (onUpdateShipmentDocStatus) {
                                      onUpdateShipmentDocStatus(s.id, docIdx, newStatus);
                                    }
                                  }}
                                  className="bg-[var(--navy-panel-2)] border border-[var(--line)] text-[var(--chalk)] text-[10px] px-1.5 py-0.5 rounded outline-none font-bold cursor-pointer focus:border-[var(--transit-teal)] shrink-0"
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
