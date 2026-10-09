import React, { useState, useEffect } from 'react';
import { Customer, Shipment, DocStatus } from '../../types';
import { DocConfigService } from '../../services/docConfigService';

interface DocConfigPageProps {
  customers: Customer[];
  shipments: Shipment[];
  onUpdateDocStatus: (shipmentId: string, docIndex: number, status: DocStatus) => void;
  onAddCustomDocToShipment?: (shipmentId: string, docName: string) => Promise<void>;
  onUpdateCustomerDocs?: (customerId: string, docs: any[]) => Promise<void>;
  masterDocs?: MasterDocConfig[];
  statuses?: CustomStatusConfig[];
  onReloadDocConfigs?: () => void;
}

export interface CustomStatusConfig {
  id: string;
  label: string;
  color: 'emerald' | 'amber' | 'sky' | 'rose' | 'purple' | 'slate' | 'indigo';
}

export interface MasterDocConfig {
  id: string;
  name: string;
  linkedStatuses: string[];
}

export const DEFAULT_STATUS_CONFIGS: CustomStatusConfig[] = [];

export const INITIAL_MASTER_DOCS: MasterDocConfig[] = [];

export const ALL_DEFAULT_DOC_STATUSES: DocStatus[] = [
  'Not Started',
  'Pending',
  'Waiting',
  'In Attestation',
  'Pending Approval',
  'Completed',
  'Rejected',
];

export function getLinkedStatusesForDoc(
  docName: any,
  masterDocsList?: MasterDocConfig[],
  currentStatus?: string
): string[] {
  const masterList = masterDocsList || [];
  const safeDocName = typeof docName === 'string'
    ? docName
    : (docName && typeof docName === 'object' && 'name' in docName ? String((docName as any).name) : String(docName || ''));
  const match = masterList.find(
    m => {
      const mName = typeof m?.name === 'string' ? m.name : String(m?.name || '');
      return mName.trim().toLowerCase() === safeDocName.trim().toLowerCase();
    }
  );

  let allowed: string[] = [];
  if (match && match.linkedStatuses && match.linkedStatuses.length > 0) {
    allowed = [...match.linkedStatuses];
  } else {
    allowed = [...ALL_DEFAULT_DOC_STATUSES];
  }

  if (currentStatus && !allowed.includes(currentStatus)) {
    allowed.push(currentStatus);
  }

  return allowed;
}

export const DocConfigPage: React.FC<DocConfigPageProps> = ({
  customers,
  shipments,
  onUpdateDocStatus,
  masterDocs: propMasterDocs,
  statuses: propStatuses,
  onReloadDocConfigs,
}) => {
  // Master document list with multiple linked statuses
  const [docMasterList, setDocMasterList] = useState<MasterDocConfig[]>(propMasterDocs || []);
  const [newDocName, setNewDocName] = useState('');
  const [newDocLinkedStatuses, setNewDocLinkedStatuses] = useState<string[]>(['Not Started', 'Completed']);
  
  // Editing Master Doc state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocName, setEditDocName] = useState('');
  const [editDocLinkedStatuses, setEditDocLinkedStatuses] = useState<string[]>([]);

  // Statuses list
  const [statuses, setStatuses] = useState<CustomStatusConfig[]>(propStatuses || []);
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState<CustomStatusConfig['color']>('amber');
  
  // Editing Status state
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editStatusLabel, setEditStatusLabel] = useState('');
  const [editStatusColor, setEditStatusColor] = useState<CustomStatusConfig['color']>('amber');

  // Keep local state synced if props update
  useEffect(() => {
    if (propMasterDocs) setDocMasterList(propMasterDocs);
  }, [propMasterDocs]);

  useEffect(() => {
    if (propStatuses) setStatuses(propStatuses);
  }, [propStatuses]);

  // Save all changes to database helper
  const persistConfigToDb = async (newMasterDocs: MasterDocConfig[], newStatuses: CustomStatusConfig[]) => {
    try {
      const savedData = await DocConfigService.save({ masterDocs: newMasterDocs, statuses: newStatuses });
      if (savedData?.masterDocs) setDocMasterList(savedData.masterDocs);
      if (savedData?.statuses) setStatuses(savedData.statuses);
      onReloadDocConfigs?.();
    } catch (err: any) {
      console.error('Failed to persist doc config to database:', err);
      alert(`Error saving document configuration to database: ${err.message || err}`);
    }
  };

  // Toggle status selection for new document
  const handleToggleNewDocStatus = (statusLabel: string) => {
    setNewDocLinkedStatuses(prev =>
      prev.includes(statusLabel)
        ? prev.filter(s => s !== statusLabel)
        : [...prev, statusLabel]
    );
  };

  // Toggle status selection for editing document
  const handleToggleEditDocStatus = (statusLabel: string) => {
    setEditDocLinkedStatuses(prev =>
      prev.includes(statusLabel)
        ? prev.filter(s => s !== statusLabel)
        : [...prev, statusLabel]
    );
  };

  // Add Master Doc Type with Multiple Linked Statuses
  const handleAddMasterDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDocName.trim();
    if (!trimmed) return;
    if (docMasterList.some(d => d.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('A document with this name already exists.');
      return;
    }
    if (newDocLinkedStatuses.length === 0) {
      alert('Please select at least one linked status for this document.');
      return;
    }

    const newDoc: MasterDocConfig = {
      id: `doc-${Date.now()}`,
      name: trimmed,
      linkedStatuses: [...newDocLinkedStatuses],
    };
    const updatedMasterDocs = [newDoc, ...docMasterList];
    setDocMasterList(updatedMasterDocs);
    setNewDocName('');
    setNewDocLinkedStatuses(['Not Started', 'Completed']);

    // Persist to database!
    await persistConfigToDb(updatedMasterDocs, statuses);
  };

  // Edit Master Doc
  const handleStartEditDoc = (doc: MasterDocConfig) => {
    setEditingDocId(doc.id);
    setEditDocName(doc.name);
    setEditDocLinkedStatuses([...doc.linkedStatuses]);
  };

  const handleSaveEditDoc = async (id: string) => {
    const trimmed = editDocName.trim();
    if (!trimmed) return;
    if (editDocLinkedStatuses.length === 0) {
      alert('Please select at least one linked status.');
      return;
    }
    const updatedMasterDocs = docMasterList.map(d =>
      d.id === id ? { ...d, name: trimmed, linkedStatuses: editDocLinkedStatuses } : d
    );
    setDocMasterList(updatedMasterDocs);
    setEditingDocId(null);

    await persistConfigToDb(updatedMasterDocs, statuses);
  };

  const handleDeleteDoc = async (id: string) => {
    const docToDelete = docMasterList.find(d => d.id === id);
    if (!docToDelete) return;
    if (!confirm(`Delete document type "${docToDelete.name}"?`)) return;
    const updatedMasterDocs = docMasterList.filter(d => d.id !== id);
    setDocMasterList(updatedMasterDocs);

    await persistConfigToDb(updatedMasterDocs, statuses);
  };

  // Add Custom Status
  const handleAddCustomStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStatusLabel.trim();
    if (!trimmed) return;
    if (statuses.some(s => s.label.toLowerCase() === trimmed.toLowerCase())) {
      alert('Status already exists.');
      return;
    }
    const newConfig: CustomStatusConfig = {
      id: `st-${Date.now()}`,
      label: trimmed,
      color: newStatusColor,
    };
    const updatedStatuses = [...statuses, newConfig];
    setStatuses(updatedStatuses);
    setNewStatusLabel('');

    await persistConfigToDb(docMasterList, updatedStatuses);
  };

  // Edit Status
  const handleStartEditStatus = (st: CustomStatusConfig) => {
    setEditingStatusId(st.id);
    setEditStatusLabel(st.label);
    setEditStatusColor(st.color);
  };

  const handleSaveEditStatus = async (id: string) => {
    const trimmed = editStatusLabel.trim();
    if (!trimmed) return;
    const oldStatus = statuses.find(s => s.id === id);
    const updatedStatuses = statuses.map(s => (s.id === id ? { ...s, label: trimmed, color: editStatusColor } : s));
    setStatuses(updatedStatuses);

    let updatedMasterDocs = docMasterList;
    if (oldStatus && oldStatus.label !== trimmed) {
      updatedMasterDocs = docMasterList.map(d => ({
        ...d,
        linkedStatuses: d.linkedStatuses.map(ls => (ls === oldStatus.label ? trimmed : ls)),
      }));
      setDocMasterList(updatedMasterDocs);
    }
    setEditingStatusId(null);

    await persistConfigToDb(updatedMasterDocs, updatedStatuses);
  };

  const handleDeleteStatus = async (id: string) => {
    const stToDelete = statuses.find(s => s.id === id);
    if (!stToDelete) return;
    if (!confirm(`Delete status "${stToDelete.label}"?`)) return;
    const updatedStatuses = statuses.filter(s => s.id !== id);
    setStatuses(updatedStatuses);

    const updatedMasterDocs = docMasterList.map(d => ({
      ...d,
      linkedStatuses: d.linkedStatuses.filter(ls => ls !== stToDelete.label),
    }));
    setDocMasterList(updatedMasterDocs);

    await persistConfigToDb(updatedMasterDocs, updatedStatuses);
  };

  const getStatusBadgeStyle = (statusLabel: string) => {
    const conf = statuses.find(s => s.label === statusLabel);
    const color = conf?.color || 'slate';
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'purple':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      case 'rose':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-800 border-indigo-300';
      case 'sky':
        return 'bg-sky-50 text-sky-800 border-sky-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2 font-sans">
            <span>⚙️</span> Document & Status Master Configuration
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create document types, link multiple applicable statuses, and update ongoing document statuses.
          </p>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Dashboard &gt; Settings &gt; <span className="text-slate-700 font-bold">Doc Master & Statuses</span>
        </div>
      </div>

      {/* Grid: Master Document Types & Custom Statuses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Master Document Registry with Linked Statuses */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase font-mono flex items-center gap-2">
              <span>📋</span> Master Document Types & Linked Statuses
            </h2>
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
              {docMasterList.length} Documents
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Create a document name and select <strong>multiple linked statuses</strong> that apply to its workflow.
          </p>

          {/* Create Document Form */}
          <form onSubmit={handleAddMasterDoc} className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Document Name *
              </label>
              <input
                type="text"
                required
                value={newDocName}
                onChange={e => setNewDocName(e.target.value)}
                placeholder="e.g. Bank Invoice, Certificate of Analysis..."
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Link Applicable Workflow Statuses (Select Multiple)
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                {statuses.map(st => {
                  const isSelected = newDocLinkedStatuses.includes(st.label);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleToggleNewDocStatus(st.label)}
                      className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>+</span> Create Document Name & Link Statuses
            </button>
          </form>

          {/* Master Document List with Edit & Delete */}
          <div className="space-y-2 max-h-96 overflow-y-auto p-1">
            {docMasterList.map(doc => {
              const isEditing = editingDocId === doc.id;
              if (isEditing) {
                return (
                  <div
                    key={doc.id}
                    className="p-3 bg-amber-50 rounded-lg border border-amber-300 space-y-2.5"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Document Name</label>
                      <input
                        type="text"
                        value={editDocName}
                        onChange={e => setEditDocName(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-xs font-bold px-2.5 py-1.5 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Linked Statuses</label>
                      <div className="flex flex-wrap gap-1 bg-white p-2 rounded border border-slate-200">
                        {statuses.map(st => {
                          const isSel = editDocLinkedStatuses.includes(st.label);
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => handleToggleEditDocStatus(st.label)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                isSel
                                  ? 'bg-indigo-600 text-white border-indigo-700'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {isSel ? '✓ ' : '+ '}
                              {st.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingDocId(null)}
                        className="text-xs text-slate-600 hover:text-slate-800 px-2.5 py-1 cursor-pointer font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditDoc(doc.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={doc.id}
                  className="bg-slate-50 border border-slate-200 hover:border-slate-300 p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">📄</span>
                    <span className="font-bold text-slate-800 text-xs truncate">{doc.name}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <div className="flex flex-wrap gap-1">
                      {doc.linkedStatuses.map(statusLabel => (
                        <span
                          key={statusLabel}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getStatusBadgeStyle(
                            statusLabel
                          )}`}
                        >
                          ● {statusLabel}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 ml-auto sm:ml-0">
                      <button
                        onClick={() => handleStartEditDoc(doc)}
                        className="text-slate-500 hover:text-indigo-600 text-xs font-bold p-1 cursor-pointer"
                        title="Edit Document Name or Linked Statuses"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-slate-400 hover:text-rose-600 text-xs font-bold p-1 cursor-pointer"
                        title="Delete Document Type"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Custom Document Statuses Workflow Manager */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase font-mono flex items-center gap-2">
              <span>🏷️</span> Status Workflow Configuration
            </h2>
            <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
              {statuses.length} Statuses
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Define, edit, or delete status labels and badge colors (e.g. Pending, Waiting, Completed).
          </p>

          <form onSubmit={handleAddCustomStatus} className="flex gap-2">
            <input
              type="text"
              value={newStatusLabel}
              onChange={e => setNewStatusLabel(e.target.value)}
              placeholder="New status label e.g. Awaiting Bank…"
              className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <select
              value={newStatusColor}
              onChange={e => setNewStatusColor(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs px-2 py-2 rounded-lg font-medium"
            >
              <option value="amber">Amber</option>
              <option value="purple">Purple</option>
              <option value="emerald">Green</option>
              <option value="indigo">Indigo</option>
              <option value="sky">Sky Blue</option>
              <option value="rose">Red</option>
              <option value="slate">Gray</option>
            </select>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              + Add Status
            </button>
          </form>

          {/* Status List with Edit & Delete */}
          <div className="space-y-2 max-h-96 overflow-y-auto p-1">
            {statuses.map(st => {
              const isEditing = editingStatusId === st.id;
              if (isEditing) {
                return (
                  <div
                    key={st.id}
                    className="p-3 bg-amber-50 rounded-lg border border-amber-300 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editStatusLabel}
                        onChange={e => setEditStatusLabel(e.target.value)}
                        className="bg-white border border-slate-300 text-xs font-bold px-2.5 py-1.5 rounded"
                      />
                      <select
                        value={editStatusColor}
                        onChange={e => setEditStatusColor(e.target.value as any)}
                        className="bg-white border border-slate-300 text-xs font-bold px-2 py-1.5 rounded"
                      >
                        <option value="amber">Amber</option>
                        <option value="purple">Purple</option>
                        <option value="emerald">Green</option>
                        <option value="indigo">Indigo</option>
                        <option value="sky">Sky Blue</option>
                        <option value="rose">Red</option>
                        <option value="slate">Gray</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingStatusId(null)}
                        className="text-xs text-slate-600 hover:text-slate-800 px-2 py-1 cursor-pointer font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditStatus(st.id)}
                        className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={st.id}
                  className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center justify-between gap-2"
                >
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getStatusBadgeStyle(st.label)}`}>
                    ● {st.label}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEditStatus(st)}
                      className="text-slate-500 hover:text-indigo-600 text-xs font-bold p-1 cursor-pointer"
                      title="Edit Status"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteStatus(st.id)}
                      className="text-slate-400 hover:text-rose-600 text-xs font-bold p-1 cursor-pointer"
                      title="Delete Status"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
