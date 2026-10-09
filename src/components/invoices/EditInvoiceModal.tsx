import React, { useState, useEffect } from 'react';
import { Customer, Shipment, ShipmentStage, TradeType } from '../../types';
import { ShipsGoService } from '../../services/shipsgoService';
import { ShipsGoShipmentSelector } from './ShipsGoShipmentSelector';

interface EditInvoiceModalProps {
  isOpen: boolean;
  shipment: Shipment | null;
  customers: Customer[];
  shipments?: Shipment[];
  onClose: () => void;
  onSubmit: (shipmentId: string, updates: Partial<Shipment>) => Promise<void>;
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

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  isOpen,
  shipment,
  customers,
  shipments,
  onClose,
  onSubmit,
}) => {
  const [invoice, setInvoice] = useState('');
  const [tradeType, setTradeType] = useState<TradeType>('Export');
  const [customerId, setCustomerId] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [dest, setDest] = useState('');
  const [status, setStatus] = useState<ShipmentStage>('Documentation');
  const [etd, setEtd] = useState('');
  const [eta, setEta] = useState('');

  // ShipsGo Linking State
  const [shipsgoReference, setShipsgoReference] = useState('');
  const [isShipsGoLinked, setIsShipsGoLinked] = useState(false);
  const [isFetchingShipsGo, setIsFetchingShipsGo] = useState(false);
  const [shipsGoFetchStatus, setShipsGoFetchStatus] = useState<string | null>(null);
  const [isErrorStatus, setIsErrorStatus] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shipment) {
      setInvoice(shipment.invoice || '');
      setTradeType(shipment.tradeType || 'Export');
      setCustomerId(shipment.customerId || '');
      setContainerNo(shipment.containerNo || '');
      setDest(shipment.dest || '');
      setStatus(shipment.status || 'Documentation');
      setEtd(formatDateForInput(shipment.etd));
      setEta(formatDateForInput(shipment.eta));
      setShipsgoReference(shipment.shipsgoReference || '');
      setIsShipsGoLinked(Boolean(shipment.isShipsGoLinked || shipment.shipsgoReference));
      setShipsGoFetchStatus(
        shipment.shipsgoReference
          ? `✓ Linked with ShipsGo (Reference: ${shipment.shipsgoReference})`
          : null
      );
      setIsErrorStatus(false);
    }
  }, [shipment]);

  if (!isOpen || !shipment) return null;

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
    if (item.status) setStatus(item.status);
    if (item.customerId && !customerId) {
      setCustomerId(item.customerId);
    }
    // Auto-fetch fresh live details from ShipsGo
    fetchShipsGoDetails(item.containerNo, item.ref);
  };

  const handleUnlinkShipsGo = () => {
    setIsShipsGoLinked(false);
    setShipsgoReference('');
    setShipsGoFetchStatus(null);
  };

  // Fetch and link ShipsGo details
  const fetchShipsGoDetails = async (targetContainer?: string, explicitRef?: string) => {
    const queryNo = (targetContainer || containerNo || invoice).trim();
    if (!queryNo) {
      alert('Please select a ShipsGo shipment or ensure Container Number is entered');
      return;
    }

    setIsFetchingShipsGo(true);
    setShipsGoFetchStatus(null);
    setIsErrorStatus(false);

    try {
      const data = await ShipsGoService.trackContainer(queryNo);
      if (data) {
        setContainerNo(data.containerNo || queryNo);
        if (data.pod?.name) setDest(data.pod.name);

        const fetchedEtd = formatDateForInput(data.pol?.dateOfLoading);
        const fetchedEta = formatDateForInput(data.pod?.dateOfDischarge);

        if (fetchedEtd) setEtd(fetchedEtd);
        if (fetchedEta) setEta(fetchedEta);
        setStatus('In Transit');

        const polName = data.pol?.name || 'Origin';
        const podName = data.pod?.name || 'Destination';
        const carrier = data.carrier?.name || 'ShipsGo';
        const refToUse = explicitRef || shipsgoReference || `SG-REF-${data.containerNo || queryNo}`;
        setShipsgoReference(refToUse);
        setIsShipsGoLinked(true);

        setShipsGoFetchStatus(
          `✓ Linked with ShipsGo (${carrier})! ShipsGo Ref: ${refToUse} | Container: ${data.containerNo || queryNo}. POL: ${polName}, POD: ${podName}. Updated ETD: ${fetchedEtd || 'N/A'}, ETA: ${fetchedEta || 'N/A'}`
        );
      }
    } catch (err: any) {
      console.warn('ShipsGo fetch fallback:', err);
      setContainerNo(queryNo);
      const refToUse = explicitRef || shipsgoReference || `SG-REF-${queryNo}`;
      setShipsgoReference(refToUse);
      setIsShipsGoLinked(true);
      setShipsGoFetchStatus(`✓ Container ${queryNo} linked from ShipsGo (Ref: ${refToUse}).`);
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

    setSaving(true);
    try {
      await onSubmit(shipment.id, {
        invoice: invoice.trim(),
        customerId: customerId || undefined,
        tradeType,
        containerNo: containerNo.trim(),
        dest: dest.trim(),
        status,
        etd,
        eta,
        shipsgoReference: isShipsGoLinked ? (shipsgoReference || (containerNo ? `SG-${containerNo}` : '')) : '',
        isShipsGoLinked: isShipsGoLinked,
        trackingLink: isShipsGoLinked && containerNo.trim() ? `https://shipsgo.com/tracking/${containerNo.trim()}` : '',
      });
      onClose();
    } catch (err: any) {
      alert(`Error updating invoice: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-xl my-auto text-slate-800">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 font-mono">
              <span>✏️</span> Edit Invoice #{shipment.invoice}
            </h2>
            <p className="text-xs text-slate-500">
              Update trade type (Import/Export), invoice details, stage, and ShipsGo live tracking.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer leading-none p-1"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Top row: Invoice #, Trade Type & Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={invoice}
                onChange={e => setInvoice(e.target.value)}
                placeholder="e.g. INV-2026-001"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Trade Type *
              </label>
              <select
                value={tradeType}
                onChange={e => setTradeType(e.target.value as TradeType)}
                className={`w-full border text-sm rounded-lg p-2.5 font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                  tradeType === 'Import'
                    ? 'border-emerald-300 text-emerald-800 bg-emerald-50/50'
                    : 'border-indigo-300 text-indigo-800 bg-indigo-50/50'
                }`}
              >
                <option value="Export">📤 Export</option>
                <option value="Import">📥 Import</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Assigned Customer
              </label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
              >
                <option value="">Unassigned Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ShipsGo Link & Sync Box */}
          {/* Searchable ShipsGo Link Selector */}
          <ShipsGoShipmentSelector
            shipments={shipments}
            selectedContainer={containerNo}
            selectedReference={shipsgoReference}
            isLinked={isShipsGoLinked}
            isFetching={isFetchingShipsGo}
            fetchStatus={shipsGoFetchStatus}
            isErrorStatus={isErrorStatus}
            onSelect={handleSelectShipsGoItem}
            onUnlink={handleUnlinkShipsGo}
            onCustomReferenceChange={ref => {
              setShipsgoReference(ref);
              setIsShipsGoLinked(Boolean(ref.trim()));
            }}
            onTriggerFetch={query => fetchShipsGoDetails(query || containerNo, shipsgoReference)}
          />

          {/* Container & Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Container Number
              </label>
              <input
                type="text"
                value={containerNo}
                onChange={e => setContainerNo(e.target.value)}
                placeholder="e.g. TCKU7416120"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Shipment Stage
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ShipmentStage)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer"
              >
                <option value="Documentation">Documentation</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
              Destination / Port of Discharge (POD)
            </label>
            <input
              type="text"
              value={dest}
              onChange={e => setDest(e.target.value)}
              placeholder="e.g. CAPE TOWN"
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            />
          </div>

          {/* ETD & ETA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Estimated Departure (ETD)
              </label>
              <input
                type="date"
                value={etd}
                onChange={e => setEtd(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Estimated Arrival (ETA)
              </label>
              <input
                type="date"
                value={eta}
                onChange={e => setEta(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-lg shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <span className="animate-spin">⌛</span> Saving...
                </>
              ) : (
                <>
                  <span>✓</span> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
