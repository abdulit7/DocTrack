import React, { useState } from 'react';
import { Customer, Shipment, DocStatus } from '../../types';
import { CustomerCard } from './CustomerCard';
import { MasterDocConfig } from '../documents/DocConfigPage';

interface CustomersViewProps {
  customers: Customer[];
  shipments: Shipment[];
  masterDocs?: MasterDocConfig[];
  onOpenNewCustomerModal: () => void;
  onEditCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customerId: string, updates: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (customerId: string) => Promise<void>;
  onUpdateCustomerDocStatus?: (customerId: string, docIndex: number, status: DocStatus) => Promise<void>;
  onUpdateShipmentDocStatus: (shipmentId: string, docIndex: number, status: DocStatus) => Promise<void>;
  onUpdateShipmentDocs?: (shipmentId: string, docs: { name: string; status: DocStatus }[]) => void;
  onLinkShipmentToCustomer?: (shipmentId: string, customerId: string) => Promise<void>;
  onJumpToShipment?: (shipmentId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  shipments,
  masterDocs,
  onOpenNewCustomerModal,
  onEditCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onUpdateCustomerDocStatus,
  onUpdateShipmentDocStatus,
  onUpdateShipmentDocs,
  onLinkShipmentToCustomer,
  onJumpToShipment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(customers[0]?.id || null);

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.requiredDocs && c.requiredDocs.some(d => {
        const docName = typeof d === 'string' ? d : (d as any)?.name || '';
        return docName.toLowerCase().includes(q);
      }))
    );
  });

  // Check if customer has in-process shipments
  const isCustomerPending = (c: Customer) => {
    const custShipments = shipments.filter(s => s.customerId === c.id);
    const reqDocs = (c.requiredDocs || [])
      .map(d => (typeof d === 'string' ? d : (d as any)?.name || ''))
      .filter(Boolean);

    return custShipments.some(s => {
      const existingDocMap = new Map<string, DocStatus>(
        (s.docs || []).map(d => [typeof d === 'string' ? d : d?.name || '', typeof d === 'string' ? 'Not Started' : d?.status || 'Not Started'])
      );
      const shipDocNames = (s.docs || []).map(d => (typeof d === 'string' ? d : d?.name || ''));
      const allDocNames = Array.from(new Set<string>([...reqDocs, ...shipDocNames])).filter(Boolean);
      const effDocs = allDocNames.map(docName => ({
        name: docName,
        status: existingDocMap.get(docName) || ('Not Started' as DocStatus),
      }));
      if (effDocs.length === 0) return true;
      return effDocs.some(d => d.status !== 'Completed');
    });
  };

  const completedCount = customers.filter(c => !isCustomerPending(c)).length;

  const totalInProcessInvoices = shipments.filter(s => {
    if (!s.customerId) return false;
    const docs = s.docs || [];
    return docs.some(d => d.status !== 'Completed');
  }).length;

  return (
    <div className="space-y-4 select-none">
      {/* Header & Breadcrumbs */}
      <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
        <div>
          <h1 className="text-xl font-bold text-slate-800 uppercase font-sans flex items-center gap-2">
            <span>🏢</span> Customers & Document Requirements
          </h1>
          <p className="text-xs text-slate-500">
            Register customer profiles, assign document checklists, and link created invoices or ShipsGo shipments.
          </p>
        </div>
        <div className="font-mono text-[11px] text-slate-400 hidden sm:block">
          Dashboard &gt; Clients & Invoices &gt; <span className="text-slate-700 font-bold">Customers</span>
        </div>
      </div>

      {/* Metrics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">Total Customers</div>
            <div className="text-2xl font-extrabold text-slate-900">{customers.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
            🏢
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">Completed Profiles</div>
            <div className="text-2xl font-extrabold text-emerald-600">
              {completedCount} / {customers.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            ✓
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">In-Process Shipments</div>
            <div className="text-2xl font-extrabold text-indigo-600">{totalInProcessInvoices}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
            📄
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onOpenNewCustomerModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm uppercase tracking-wide"
        >
          <span>🏢</span> + Register New Customer
        </button>

        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search customer name or document requirement..."
          className="bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-72 font-medium"
        />
      </div>

      {/* Customers Cards List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500">
          <div className="text-4xl mb-2">🏢</div>
          <div className="font-bold text-slate-800 text-base">No Customers Found</div>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery ? 'No customer matches your search criteria.' : 'No customers registered yet. Click "+ Register New Customer" above to create one.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map(customer => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              shipments={shipments}
              masterDocs={masterDocs}
              isOpen={expandedId === customer.id}
              onToggle={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
              onUpdateCustomer={updates => onUpdateCustomer(customer.id, updates)}
              onEditCustomer={onEditCustomer}
              onUpdateDocStatus={(docIdx, status) => onUpdateCustomerDocStatus?.(customer.id, docIdx, status)}
              onUpdateShipmentDocStatus={onUpdateShipmentDocStatus}
              onUpdateShipmentDocs={onUpdateShipmentDocs}
              onLinkShipmentToCustomer={onLinkShipmentToCustomer}
              onDelete={() => onDeleteCustomer(customer.id)}
              onJumpToShipment={shipmentId => onJumpToShipment?.(shipmentId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
