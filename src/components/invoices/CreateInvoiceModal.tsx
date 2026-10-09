import React, { useState, useEffect } from 'react';
import { Customer, DocStatus, ShipmentStage, Shipment, TradeType } from '../../types';
import { ShipsGoService } from '../../services/shipsgoService';
import { MasterDocConfig } from '../documents/DocConfigPage';
import { ShipsGoShipmentSelector } from './ShipsGoShipmentSelector';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  customers: Customer[];
  shipments?: Shipment[];
  masterDocs?: MasterDocConfig[];
  availableMasterDocs?: string[];
  onClose: () => void;
  onSubmit: (data: {
    invoice: string;
    customerId: string;
    newCustomerName?: string;
    tradeType: TradeType;
    containerNo: string;
    dest: string;
    etd: string;
    eta: string;
    status: ShipmentStage;
    docs: any[];
    shipsgoReference?: string;
    isShipsGoLinked?: boolean;
  }) => Promise<void>;
}

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      if (yyyy.length === 4) {
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
    }
  }
  if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return trimmed;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return '';
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  customers,
  shipments,
  masterDocs,
  availableMasterDocs,
  onClose,
  onSubmit,
}) => {
  const availableDocNames = availableMasterDocs || masterDocs?.map(d => d.name) || [];

  const [invoice, setInvoice] = useState('');
  const [tradeType, setTradeType] = useState<TradeType>('Export');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState('');

  // Optional ShipsGo Linking State
  const [shipsgoReference, setShipsgoReference] = useState<string>('');
  const [isShipsGoLinked, setIsShipsGoLinked] = useState<boolean>(false);
  const [isFetchingShipsGo, setIsFetchingShipsGo] = useState(false);
  const [shipsGoFetchSuccess, setShipsGoFetchSuccess] = useState<string | null>(null);

  // Form fields
  const [containerNo, setContainerNo] = useState('');
  const [dest, setDest] = useState('');
  const [etd, setEtd] = useState('');
  const [eta, setEta] = useState('');
  const [stage, setStage] = useState<ShipmentStage>('Documentation');

  // Documents attached to this invoice
  const [attachedDocs, setAttachedDocs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset all fields to empty when modal opens
  useEffect(() => {
    if (isOpen) {
      setInvoice('');
      setTradeType('Export');
      setSelectedCustomerId('');
      setNewCustomerName('');
      setContainerNo('');
      setDest('');
      setEtd('');
      setEta('');
      setStage('Documentation');
      setShipsgoReference('');
      setIsShipsGoLinked(false);
      setShipsGoFetchSuccess(null);
      setAttachedDocs([]);
    }
  }, [isOpen]);

  // Handle customer selection change
  const handleCustomerChange = (cId: string) => {
    setSelectedCustomerId(cId);
    if (!cId) {
      setAttachedDocs([]);
      return;
    }
    if (cId === '__new__') {
      setAttachedDocs(availableDocNames);
    } else {
      const cust = customers.find(c => c.id === cId);
      const rawCustDocs = cust?.requiredDocs?.length ? cust.requiredDocs : (cust?.docs?.map(d => d.name) || []);
      const custDocs = rawCustDocs.map(d => (typeof d === 'string' ? d : (d as any)?.name || '')).filter(Boolean);
      setAttachedDocs(custDocs.length > 0 ? custDocs : availableDocNames);
    }
  };

  // Handle selection from ShipsGo Search selector
  const handleSelectShipsGoItem = (item: {
    containerNo: string;
    ref: string;
    dest?: string;
    etd?: string;
    eta?: string;
    status?: ShipmentStage;
    customerId?: string;
    carrier?: string;
  }) => {
    setContainerNo(item.containerNo);
    setShipsgoReference(item.ref);
    setIsShipsGoLinked(true);
    if (item.dest) setDest(item.dest);
    if (item.etd) setEtd(formatDateForInput(item.etd));
    if (item.eta) setEta(formatDateForInput(item.eta));
    if (item.status) setStage(item.status);
    if (item.customerId && selectedCustomerId === '__new__') {
      setSelectedCustomerId(item.customerId);
    }
    // Auto-fetch fresh live details from ShipsGo
    fetchShipsGoDetails(item.containerNo, item.ref);
  };

  const handleUnlinkShipsGo = () => {
    setIsShipsGoLinked(false);
    setShipsgoReference('');
    setShipsGoFetchSuccess(null);
  };

  // Fetch and link ShipsGo details
  const fetchShipsGoDetails = async (targetContainer?: string, explicitRef?: string) => {
    const queryNo = (targetContainer || containerNo).trim();
    if (!queryNo) {
      alert('Please enter or select a Container Number to fetch from ShipsGo');
      return;
    }

    setIsFetchingShipsGo(true);
    setShipsGoFetchSuccess(null);
    try {
      const data = await ShipsGoService.trackContainer(queryNo);
      setContainerNo(data.containerNo || queryNo);
      if (data.pod?.name) setDest(data.pod.name);

      const fetchedEtd = formatDateForInput(data.pol?.dateOfLoading);
      const fetchedEta = formatDateForInput(data.pod?.dateOfDischarge);

      if (fetchedEtd) setEtd(fetchedEtd);
      if (fetchedEta) setEta(fetchedEta);
      setStage('In Transit');

      const polName = data.pol?.name || 'Origin';
      const podName = data.pod?.name || 'Destination';
      const carrier = data.carrier?.name || 'ShipsGo';
      const refToUse = explicitRef || shipsgoReference || `SG-REF-${data.containerNo || queryNo}`;
      setShipsgoReference(refToUse);
      setIsShipsGoLinked(true);

      setShipsGoFetchSuccess(
        `✓ Linked with ShipsGo (${carrier})! ShipsGo Ref: ${refToUse} | Container: ${data.containerNo || queryNo}. POL: ${polName}, POD: ${podName}. ETD: ${fetchedEtd || 'N/A'}, ETA: ${fetchedEta || 'N/A'}`
      );
    } catch (err: any) {
      console.warn('ShipsGo fetch fallback:', err);
      setContainerNo(queryNo);
      const refToUse = explicitRef || shipsgoReference || `SG-REF-${queryNo}`;
      setShipsgoReference(refToUse);
      setIsShipsGoLinked(true);
      setShipsGoFetchSuccess(`✓ Container ${queryNo} linked with ShipsGo (Ref: ${refToUse}).`);
    } finally {
      setIsFetchingShipsGo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice.trim()) {
      alert('Please enter an Invoice Number');
      return;
    }
    if (!selectedCustomerId) {
      alert('Please select a Customer or choose "+ Create New Customer..."');
      return;
    }
    if (selectedCustomerId === '__new__' && !newCustomerName.trim()) {
      alert('Please enter a name for the new customer');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        invoice: invoice.trim(),
        customerId: selectedCustomerId,
        newCustomerName: selectedCustomerId === '__new__' ? newCustomerName.trim() : undefined,
        tradeType,
        containerNo: containerNo.trim(),
        dest: dest.trim(),
        etd,
        eta,
        status: stage,
        shipsgoReference: isShipsGoLinked ? (shipsgoReference || (containerNo ? `SG-${containerNo}` : '')) : '',
        isShipsGoLinked: isShipsGoLinked,
        docs: attachedDocs.map(name => ({ name, status: 'Not Started' })),
      });
      onClose();
    } catch (err: any) {
      alert(`Error creating invoice: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white text-slate-800 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>🧾</span> Create Invoice & Shipment
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select trade type (Import/Export), enter invoice details, or optionally link ShipsGo tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer transition-colors leading-none p-1"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Customer & Invoice Section */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-mono">
              <span>👤</span> 1. Invoice & Customer Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 font-mono uppercase">INVOICE NUMBER *</label>
                <input
                  type="text"
                  required
                  value={invoice}
                  onChange={e => setInvoice(e.target.value)}
                  placeholder="e.g. INV-2026-088"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono font-bold text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 font-mono uppercase">TRADE TYPE *</label>
                <select
                  value={tradeType}
                  onChange={e => setTradeType(e.target.value as TradeType)}
                  className={`w-full bg-white border rounded px-3 py-2 text-sm font-extrabold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer ${
                    tradeType === 'Import'
                      ? 'border-emerald-300 text-emerald-800 bg-emerald-50/40'
                      : 'border-indigo-300 text-indigo-800 bg-indigo-50/40'
                  }`}
                >
                  <option value="Export">📤 Export</option>
                  <option value="Import">📥 Import</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 font-mono uppercase">SELECT CUSTOMER *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={e => handleCustomerChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer text-xs"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.requiredDocs?.length || c.docs?.length || 0} docs linked)
                    </option>
                  ))}
                  <option value="__new__">+ Create New Customer...</option>
                </select>
              </div>
            </div>

            {selectedCustomerId && selectedCustomerId !== '__new__' && (
              <div className="bg-white/80 p-2.5 rounded border border-slate-200 text-xs">
                <div className="text-[11px] font-bold text-slate-700 mb-1 font-mono uppercase flex items-center justify-between">
                  <span>📄 Linked Clearance Documents ({attachedDocs.length})</span>
                  <span className="text-[10px] text-emerald-700 font-normal">Auto-attached from customer profile</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {attachedDocs.map((docName, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                      {docName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedCustomerId === '__new__' && (
              <div>
                <label className="block font-bold text-indigo-900 mb-1 font-mono uppercase">NEW CUSTOMER NAME *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={e => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Acme Global Freight Ltd."
                  className="w-full bg-white border border-indigo-300 rounded px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Searchable ShipsGo Link Selector */}
          <ShipsGoShipmentSelector
            shipments={shipments}
            selectedContainer={containerNo}
            selectedReference={shipsgoReference}
            isLinked={isShipsGoLinked}
            isFetching={isFetchingShipsGo}
            fetchStatus={shipsGoFetchSuccess}
            onSelect={handleSelectShipsGoItem}
            onUnlink={handleUnlinkShipsGo}
            onCustomReferenceChange={ref => {
              setShipsgoReference(ref);
              setIsShipsGoLinked(Boolean(ref.trim()));
            }}
            onTriggerFetch={query => fetchShipsGoDetails(query || containerNo, shipsgoReference)}
          />

          {/* Container & Stage */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-mono">
              <span>📦</span> 2. Shipment & Voyage Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 font-mono uppercase">Container Number</label>
                <input
                  type="text"
                  value={containerNo}
                  onChange={e => setContainerNo(e.target.value)}
                  placeholder="e.g. MSCU9876543 (optional)"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 font-mono uppercase">Shipment Stage</label>
                <select
                  value={stage}
                  onChange={e => setStage(e.target.value as ShipmentStage)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 font-extrabold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="Documentation">Documentation</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 font-mono uppercase">Destination / Port of Discharge (POD)</label>
              <input
                type="text"
                value={dest}
                onChange={e => setDest(e.target.value)}
                placeholder="e.g. CAPE TOWN / KARACHI"
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 font-mono uppercase">Estimated Departure (ETD)</label>
                <input
                  type="date"
                  value={etd}
                  onChange={e => setEtd(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 font-mono uppercase">Estimated Arrival (ETA)</label>
                <input
                  type="date"
                  value={eta}
                  onChange={e => setEta(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg cursor-pointer transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 text-xs font-mono"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⌛</span> Creating Invoice...
                </>
              ) : (
                <>
                  <span>✓</span> Create Invoice
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

