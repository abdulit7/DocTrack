import React, { useState, useEffect } from 'react';
import { DocStatus } from '../../types';
import { MasterDocConfig } from '../documents/DocConfigPage';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; requiredDocs: string[]; docs?: { name: string; status: DocStatus }[] }) => void;
  availableMasterDocs?: string[];
  masterDocs?: MasterDocConfig[];
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableMasterDocs,
  masterDocs,
}) => {
  const [name, setName] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [customDocInput, setCustomDocInput] = useState('');

  const docOptions = availableMasterDocs || masterDocs?.map(d => d.name) || [];

  useEffect(() => {
    if (isOpen) {
      setName('');
      // No default document auto-included
      setSelectedDocs([]);
      setCustomDocInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleDoc = (docName: string) => {
    setSelectedDocs(prev =>
      prev.includes(docName) ? prev.filter(d => d !== docName) : [...prev, docName]
    );
  };

  const handleAddCustomDoc = (docName?: string | any) => {
    const raw = typeof docName === 'string' ? docName : customDocInput;
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed) return;
    if (!selectedDocs.includes(trimmed)) {
      setSelectedDocs(prev => [...prev, trimmed]);
    }
    setCustomDocInput('');
  };

  const handleSelectAll = () => {
    setSelectedDocs([...docOptions]);
  };

  const handleDeselectAll = () => {
    setSelectedDocs([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a customer name.');
      return;
    }

    const docsPayload = selectedDocs.map(docName => ({
      name: docName,
      status: 'Not Started' as DocStatus,
    }));

    onSubmit({
      name: name.trim(),
      requiredDocs: selectedDocs,
      docs: docsPayload,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg my-auto text-slate-800">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 font-sans">
              <span>🏢</span> Register New Customer
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select documents from Doc & Status Master Config to attach to this customer.
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Global Freight Ltd."
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          {/* Master Document Selection Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700 uppercase font-mono">
                Select Customer Documents ({selectedDocs.length})
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
                  onClick={handleDeselectAll}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-700 underline cursor-pointer"
                >
                  Unlink All
                </button>
              </div>
            </div>

            {/* Currently Selected Section (Top) */}
            <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 min-h-[56px]">
              <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider block mb-2 font-mono">
                ✓ Currently Selected Documents (Click to Unlink):
              </span>
              {selectedDocs.length === 0 ? (
                <p className="text-xs text-indigo-400 italic">No documents selected yet. Click an available document below to include it.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedDocs.map(docName => (
                    <button
                      key={docName}
                      type="button"
                      onClick={() => handleToggleDoc(docName)}
                      className="bg-indigo-700 hover:bg-red-700 text-white border border-indigo-900 text-xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer group"
                      title="Click to remove document"
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

            {/* Available Unlinked Section (Bottom) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-2 font-mono">
                + Available Master Documents to Add:
              </span>
              {docOptions.filter(d => !selectedDocs.includes(d)).length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  {docOptions.length === 0
                    ? 'No master documents configured in Doc & Status Config yet.'
                    : 'All master documents are currently selected.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {docOptions
                    .filter(d => !selectedDocs.includes(d))
                    .map(docName => (
                      <button
                        key={docName}
                        type="button"
                        onClick={() => handleToggleDoc(docName)}
                        className="bg-white hover:bg-indigo-50 hover:border-indigo-400 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                        title="Click to add document"
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
                value={customDocInput}
                onChange={e => setCustomDocInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomDoc();
                  }
                }}
                placeholder="Add custom document name…"
                className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <button
                type="button"
                onClick={handleAddCustomDoc}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                + Link Custom
              </button>
            </div>
          </div>

          {/* Selected Documents Summary Badge */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-indigo-900 flex justify-between items-center">
            <span className="font-bold text-[11px]">
              Selected Documents to Include: <span className="underline">{selectedDocs.length}</span>
            </span>
            <span className="text-[10px] font-bold bg-white text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
              Initial Status: Not Started
            </span>
          </div>

          {/* Form Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors shadow-sm"
            >
              📄 Create Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
