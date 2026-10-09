import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { MasterDocConfig } from '../documents/DocConfigPage';

interface EditCustomerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  masterDocs?: MasterDocConfig[];
  availableMasterDocs?: string[];
  onClose: () => void;
  onSubmit: (data: { name: string; requiredDocs: string[] }) => Promise<void>;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  customer,
  masterDocs,
  availableMasterDocs,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [docInput, setDocInput] = useState('');
  const [saving, setSaving] = useState(false);

  const docSuggestions = (availableMasterDocs || masterDocs?.map(d => d.name) || []).filter(Boolean);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      const sanitized = (customer.requiredDocs || [])
        .map(d => (typeof d === 'string' ? d : (d as any)?.name || ''))
        .filter(Boolean);
      setRequiredDocs(sanitized);
      setDocInput('');
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  // Unlink doc (moves from top linked section to bottom available section)
  const handleUnlinkDoc = (docName: string) => {
    setRequiredDocs(prev => prev.filter(d => d !== docName));
  };

  // Link doc (moves from bottom available section to top linked section)
  const handleLinkDoc = (docName: string) => {
    if (!requiredDocs.includes(docName)) {
      setRequiredDocs(prev => [...prev, docName]);
    }
  };

  const handleSelectAll = () => {
    const allMaster = Array.from(new Set([...requiredDocs, ...docSuggestions]));
    setRequiredDocs(allMaster);
  };

  const handleClearAll = () => {
    setRequiredDocs([]);
  };

  const handleAddCustomDoc = () => {
    const trimmed = docInput.trim();
    if (trimmed && !requiredDocs.includes(trimmed)) {
      setRequiredDocs(prev => [...prev, trimmed]);
      setDocInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a customer name.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        requiredDocs,
      });
      onClose();
    } catch (err: any) {
      alert(`Error updating customer: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const availableDocsList = docSuggestions.filter(docName => !requiredDocs.includes(docName));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-lg my-auto text-slate-800">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <span>✏️</span> Edit Customer Details
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
              Customer Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spitzer Enterprise"
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Master Document Selection Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700 uppercase font-mono">
                Linked Customer Documents ({requiredDocs.length})
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Link All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-700 underline cursor-pointer"
                >
                  Unlink All
                </button>
              </div>
            </div>

            {/* Currently Linked Section (Top) */}
            <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 min-h-[56px]">
              <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider block mb-2 font-mono">
                ✓ Currently Linked Documents (Click to Unlink):
              </span>
              {requiredDocs.length === 0 ? (
                <p className="text-xs text-indigo-400 italic">No documents linked yet. Click an available document below to link it.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {requiredDocs.map(docName => (
                    <button
                      key={docName}
                      type="button"
                      onClick={() => handleUnlinkDoc(docName)}
                      className="bg-indigo-700 hover:bg-red-700 text-white border border-indigo-900 text-xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer group"
                      title="Click to unlink this document"
                    >
                      <span>📄 {docName}</span>
                      <span className="bg-indigo-900 group-hover:bg-red-900 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-black">
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Available Unlinked Documents Section (Bottom) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-2 font-mono">
                + Available Master Documents to Link:
              </span>
              {availableDocsList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  {docSuggestions.length === 0
                    ? 'No master documents configured in Doc & Status Config.'
                    : 'All master documents are currently linked to this customer.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {availableDocsList.map(docName => (
                    <button
                      key={docName}
                      type="button"
                      onClick={() => handleLinkDoc(docName)}
                      className="bg-white hover:bg-indigo-50 hover:border-indigo-400 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                      title="Click to link this document"
                    >
                      <span className="text-indigo-600 font-black">+ Link</span>
                      <span>{docName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Document Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={docInput}
                onChange={e => setDocInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomDoc();
                  }
                }}
                placeholder="Link new custom document requirement…"
                className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <button
                type="button"
                onClick={handleAddCustomDoc}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors shrink-0"
              >
                + Link Custom
              </button>
            </div>

            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-center gap-2 font-medium">
              <span>⚡</span>
              <span>
                Saving updates will automatically synchronize the document checklist across all active shipments for this customer.
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Customer Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
