import React, { useState } from 'react';
import { Shipment, Customer, DocStatus, ShipmentStage } from '../../types';
import { StampBadge } from '../common/StampBadge';
import { DocStatusDot } from '../common/DocStatusDot';
import { getLinkedStatusesForDoc, MasterDocConfig } from '../documents/DocConfigPage';

interface ShipmentCardProps {
  shipment: Shipment;
  customer?: Customer;
  masterDocs?: MasterDocConfig[];
  isOpen: boolean;
  onToggle: () => void;
  onUpdateStatus: (stage: ShipmentStage) => void;
  onUpdateDocStatus: (docIndex: number, status: DocStatus) => void;
  onUpdateFields: (fields: Partial<Shipment>) => void;
  onSyncDocs: () => void;
  onAddCustomDoc: (docName: string) => void;
  onMarkAllComplete: () => void;
  onOpenCoverSheet: () => void;
  onDelete: () => void;
}

const DOC_STATUSES: DocStatus[] = ['Not Started', 'In Attestation', 'Pending Approval', 'Completed'];
const SHIP_STAGES: ShipmentStage[] = ['Documentation', 'In Transit', 'Delivered'];

export const ShipmentCard: React.FC<ShipmentCardProps> = ({
  shipment,
  customer,
  masterDocs,
  isOpen,
  onToggle,
  onUpdateStatus,
  onUpdateDocStatus,
  onUpdateFields,
  onSyncDocs,
  onAddCustomDoc,
  onMarkAllComplete,
  onOpenCoverSheet,
  onDelete,
}) => {
  const [newDocName, setNewDocName] = useState('');
  const [showAddDocForm, setShowAddDocForm] = useState(false);

  const docsDone = shipment.docs.filter(d => d.status === 'Completed').length;

  const handleAddCustomDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDocName.trim()) {
      onAddCustomDoc(newDocName.trim());
      setNewDocName('');
      setShowAddDocForm(false);
    }
  };

  // Check out of sync with customer required docs
  const custReqs = customer?.requiredDocs || [];
  const currentDocNames = [...shipment.docs.map(d => d.name)].sort();
  const reqDocNames = [...custReqs].sort();
  const isOutOfSync = customer && JSON.stringify(currentDocNames) !== JSON.stringify(reqDocNames);

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const daysUntil = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / (1000 * 86400));
  };

  const etaDaysLeft = daysUntil(shipment.eta);
  let etaClass = '';
  if (shipment.status !== 'Delivered' && etaDaysLeft !== null) {
    if (etaDaysLeft < 0) etaClass = 'text-[var(--stamp-red)] font-semibold';
    else if (etaDaysLeft <= 7) etaClass = 'text-[var(--customs-gold)] font-semibold';
  }

  return (
    <div className={`bg-[var(--navy-panel)] border border-[var(--line)] rounded overflow-hidden mb-3 ${isOpen ? 'open' : ''}`}>
      {/* Card Header */}
      <div
        onClick={onToggle}
        className="flex items-center gap-3.5 p-3.5 cursor-pointer select-none hover:bg-[var(--navy-panel-2)]/50 transition-colors"
      >
        <span className={`font-mono-custom text-xs text-[var(--chalk-dim)] w-3.5 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>
          ▸
        </span>
        <span className="font-mono-custom text-xs text-[var(--chalk)] min-w-[130px] font-medium">
          {shipment.invoice}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--chalk)] truncate">
            {customer ? customer.name : 'Unknown Customer'}
          </div>
          <div className="text-xs text-[var(--chalk-dim)] mt-0.5 truncate">
            {shipment.dest}
          </div>
          {(shipment.etd || shipment.eta) && (
            <div className="font-mono-custom text-[11px] text-[var(--chalk-dim)] mt-0.5">
              {shipment.etd && `ETD ${formatDate(shipment.etd)}`}
              {shipment.etd && shipment.eta && ' · '}
              {shipment.eta && <span className={etaClass}>ETA {formatDate(shipment.eta)}</span>}
            </div>
          )}
        </div>
        <span className="font-mono-custom text-[11px] text-[var(--chalk-dim)] whitespace-nowrap">
          {docsDone}/{shipment.docs.length} docs
        </span>
        <StampBadge status={shipment.status} />
      </div>

      {/* Card Body */}
      {isOpen && (
        <div className="p-4 border-t border-[var(--line)] bg-[var(--navy-panel)]">
          <div className="flex justify-between items-center pb-3 border-b border-[var(--line)] gap-2 flex-wrap">
            <div className="flex gap-2 items-center flex-wrap">
              <select
                value={shipment.status}
                onChange={e => onUpdateStatus(e.target.value as ShipmentStage)}
                className="bg-[var(--navy-panel)] border border-[var(--line)] text-[var(--chalk)] text-xs px-2 py-1.5 rounded outline-none cursor-pointer focus:border-[var(--transit-teal)]"
              >
                {SHIP_STAGES.map(stage => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
              {isOutOfSync && (
                <button
                  onClick={onSyncDocs}
                  className="font-mono-custom text-[10.5px] uppercase bg-transparent text-[var(--chalk-dim)] border border-[var(--line)] px-2.5 py-1 rounded cursor-pointer hover:text-[var(--chalk)] hover:border-[var(--chalk-dim)] transition-colors"
                >
                  ↻ Sync to Customer Requirements
                </button>
              )}
            </div>
            <button
              onClick={onDelete}
              className="font-mono-custom text-[10.5px] uppercase bg-[var(--stamp-red)] text-[var(--chalk)] border-0 px-2.5 py-1 rounded cursor-pointer font-semibold hover:brightness-110 transition-all"
            >
              Delete Shipment
            </button>
          </div>

          <div className="font-mono-custom text-[10px] tracking-wider uppercase text-[var(--transit-teal)] mt-4 mb-2 flex justify-between items-center">
            Container & Schedule Details
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block font-mono-custom text-[9.5px] tracking-wider uppercase text-[var(--chalk-dim)] mb-1">
                Container / AWB No.
              </label>
              <input
                type="text"
                value={shipment.containerNo || ''}
                onChange={e => onUpdateFields({ containerNo: e.target.value })}
                placeholder="e.g. MSCU1234567 or MEDUQY000000"
                className="w-full bg-[var(--navy-panel-2)] border border-[var(--line)] text-[var(--chalk)] text-xs p-2 rounded outline-none focus:border-[var(--transit-teal)] font-mono-custom"
              />
            </div>
            <div>
              <label className="block font-mono-custom text-[9.5px] tracking-wider uppercase text-[var(--chalk-dim)] mb-1">
                ETD
              </label>
              <input
                type="date"
                value={shipment.etd || ''}
                onChange={e => onUpdateFields({ etd: e.target.value })}
                className="w-full bg-[var(--navy-panel-2)] border border-[var(--line)] text-[var(--chalk)] text-xs p-2 rounded outline-none focus:border-[var(--transit-teal)]"
              />
            </div>
            <div>
              <label className="block font-mono-custom text-[9.5px] tracking-wider uppercase text-[var(--chalk-dim)] mb-1">
                ETA
              </label>
              <input
                type="date"
                value={shipment.eta || ''}
                onChange={e => onUpdateFields({ eta: e.target.value })}
                className="w-full bg-[var(--navy-panel-2)] border border-[var(--line)] text-[var(--chalk)] text-xs p-2 rounded outline-none focus:border-[var(--transit-teal)]"
              />
            </div>
          </div>

          <div className="font-mono-custom text-[10px] tracking-wider uppercase text-[var(--transit-teal)] mt-4 mb-2 flex justify-between items-center flex-wrap gap-2">
            <span>Document Attestation Checklist</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenCoverSheet}
                className="text-[10.5px] font-mono-custom bg-[var(--navy-panel-2)] hover:bg-[var(--navy-panel-2)]/80 text-[var(--chalk)] border border-[var(--line)] px-2.5 py-1 rounded cursor-pointer transition-colors"
              >
                📄 Customs Cover Sheet
              </button>
              <button
                type="button"
                onClick={onMarkAllComplete}
                className="text-[10.5px] font-mono-custom bg-[var(--stamp-green)] text-[var(--chalk)] border-0 px-2.5 py-1 rounded cursor-pointer font-semibold hover:brightness-110 transition-all"
              >
                ✓ Complete All Docs
              </button>
              <button
                type="button"
                onClick={() => setShowAddDocForm(!showAddDocForm)}
                className="text-[10.5px] font-mono-custom bg-[var(--navy-panel-2)] text-[var(--transit-teal)] border border-[var(--line)] px-2.5 py-1 rounded cursor-pointer hover:border-[var(--transit-teal)] transition-colors"
              >
                + Add Custom Doc
              </button>
            </div>
          </div>

          {showAddDocForm && (
            <form onSubmit={handleAddCustomDocSubmit} className="flex gap-2 mb-3 bg-[var(--navy-panel-2)] p-2 rounded border border-[var(--line)]">
              <input
                type="text"
                value={newDocName}
                onChange={e => setNewDocName(e.target.value)}
                placeholder="e.g. Phytosanitary Certificate, Certificate of Origin..."
                className="flex-1 bg-[var(--navy-bg)] border border-[var(--line)] text-[var(--chalk)] text-xs px-2.5 py-1.5 rounded outline-none focus:border-[var(--transit-teal)] font-mono-custom"
                autoFocus
              />
              <button
                type="submit"
                className="text-xs font-mono-custom bg-[var(--transit-teal)] text-[var(--navy-bg)] font-bold px-3 py-1.5 rounded hover:brightness-110 cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddDocForm(false)}
                className="text-xs font-mono-custom text-[var(--chalk-dim)] px-2 hover:text-[var(--chalk)]"
              >
                Cancel
              </button>
            </form>
          )}

          {shipment.docs.length === 0 ? (
            <div className="text-xs text-[var(--chalk-dim)] italic py-2">
              This customer has no document requirements set yet.
            </div>
          ) : (
            <table className="w-full border-collapse mt-1 text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--line)] font-mono-custom text-[10px] tracking-wider uppercase text-[var(--chalk-dim)]">
                  <th className="p-2 font-normal">Document</th>
                  <th className="p-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {shipment.docs.map((doc, idx) => {
                  const allowedStatuses = getLinkedStatusesForDoc(doc.name, masterDocs, doc.status);
                  return (
                    <tr key={idx} className="border-b border-[var(--line)] last:border-b-0">
                      <td className="p-2">
                        <div className="flex items-center gap-2 text-[var(--chalk)]">
                          <DocStatusDot status={doc.status} />
                          <span>{doc.name}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <select
                          value={doc.status}
                          onChange={e => onUpdateDocStatus(idx, e.target.value as DocStatus)}
                          className="bg-[var(--navy-panel-2)] border border-[var(--line)] text-[var(--chalk)] text-[11px] px-2 py-1 rounded outline-none cursor-pointer focus:border-[var(--transit-teal)]"
                        >
                          {allowedStatuses.map(st => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
