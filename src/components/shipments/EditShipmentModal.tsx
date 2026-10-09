import React, { useState, useEffect } from 'react';
import { Shipment, Customer, ShipmentStage } from '../../types';

interface EditShipmentModalProps {
  isOpen: boolean;
  shipment: Shipment | null;
  customers: Customer[];
  onClose: () => void;
  onSubmit: (shipmentId: string, updates: Partial<Shipment>) => Promise<void>;
  onDelete?: (shipmentId: string) => Promise<void>;
}

export const EditShipmentModal: React.FC<EditShipmentModalProps> = ({
  isOpen,
  shipment,
  customers,
  onClose,
  onSubmit,
  onDelete,
}) => {
  const [invoice, setInvoice] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [dest, setDest] = useState('');
  const [status, setStatus] = useState<ShipmentStage>('In Transit');
  const [containerNo, setContainerNo] = useState('');
  const [etd, setEtd] = useState('');
  const [eta, setEta] = useState('');
  const [trackingLink, setTrackingLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (shipment) {
      setInvoice(shipment.invoice || '');
      setCustomerId(shipment.customerId || '');
      setDest(shipment.dest || '');
      setStatus(shipment.status || 'In Transit');
      setContainerNo(shipment.containerNo || '');
      setEtd(shipment.etd || '');
      setEta(shipment.eta || '');
      setTrackingLink(shipment.trackingLink || '');
    }
  }, [shipment]);

  if (!isOpen || !shipment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice.trim()) {
      alert('Please enter an Invoice reference.');
      return;
    }
    if (!customerId) {
      alert('Please select a customer.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(shipment.id, {
        invoice: invoice.trim(),
        customerId,
        dest: dest.trim() || '—',
        status,
        containerNo: containerNo.trim() || undefined,
        etd: etd.trim() || undefined,
        eta: eta.trim() || undefined,
        trackingLink: trackingLink.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(`Error updating invoice/shipment: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (window.confirm(`Are you sure you want to delete Invoice "${shipment.invoice}"? This action cannot be undone.`)) {
      setDeleting(true);
      try {
        await onDelete(shipment.id);
        onClose();
      } catch (err: any) {
        alert(`Error deleting invoice: ${err.message}`);
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-lg my-auto text-slate-800">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <span>🧾</span> Edit Invoice / Shipment
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Invoice Ref */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Invoice / File Ref *
              </label>
              <input
                type="text"
                value={invoice}
                onChange={e => setInvoice(e.target.value)}
                placeholder="e.g. IN # 5353 Spitzer"
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
              />
            </div>

            {/* Customer */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Assigned Customer *
              </label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Container No */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Container Number
              </label>
              <input
                type="text"
                value={containerNo}
                onChange={e => setContainerNo(e.target.value)}
                placeholder="e.g. TCKU7416120"
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* Stage Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Logistics Stage
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ShipmentStage)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="Documentation">Documentation</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>

            {/* Destination Port */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                Destination Port
              </label>
              <input
                type="text"
                value={dest}
                onChange={e => setDest(e.target.value)}
                placeholder="e.g. CAPE TOWN, SOUTH AFRICA"
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* ETD Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                ETD Date
              </label>
              <input
                type="date"
                value={etd}
                onChange={e => setEtd(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* ETA Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
                ETA Date
              </label>
              <input
                type="date"
                value={eta}
                onChange={e => setEta(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-mono">
              ShipsGo / Carrier Tracking URL
            </label>
            <input
              type="text"
              value={trackingLink}
              onChange={e => setTrackingLink(e.target.value)}
              placeholder="https://shipsgo.com/tracking/TCKU7416120"
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors"
              >
                {deleting ? 'Deleting...' : '🗑️ Delete Invoice'}
              </button>
            ) : <div />}

            <div className="flex gap-2">
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
                {saving ? 'Saving...' : 'Update Invoice'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
