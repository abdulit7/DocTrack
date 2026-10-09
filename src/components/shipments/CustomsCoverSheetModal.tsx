import React from 'react';
import { Shipment, Customer } from '../../types';

interface CustomsCoverSheetModalProps {
  shipment: Shipment;
  customer?: Customer;
  onClose: () => void;
}

export const CustomsCoverSheetModal: React.FC<CustomsCoverSheetModalProps> = ({
  shipment,
  customer,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const completedDocs = shipment.docs.filter(d => d.status === 'Completed').length;
  const isFullyCleared = completedDocs === shipment.docs.length && shipment.docs.length > 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white text-slate-900 rounded-lg max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Printable Area */}
        <div className="print-area">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
            <div>
              <h1 className="text-xl font-bold font-mono tracking-tight uppercase text-slate-900">
                EXPORT CUSTOMS COVER SHEET
              </h1>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                MANIFEST & ATTESTATION COMPLIANCE RECORD
              </p>
            </div>
            <div className="text-right font-mono">
              <div className="text-sm font-bold text-slate-900">{shipment.invoice}</div>
              <div className="text-xs text-slate-500">Date: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 font-mono text-xs border border-slate-300 p-3 rounded bg-slate-50">
            <div>
              <span className="text-slate-500 block">EXPORTER / CUSTOMER:</span>
              <span className="font-bold text-slate-800">{customer?.name || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">PORT OF DESTINATION:</span>
              <span className="font-bold text-slate-800">{shipment.dest}</span>
            </div>
            <div>
              <span className="text-slate-500 block">CONTAINER ID:</span>
              <span className="font-bold text-slate-800">{shipment.containerNo || 'PENDING ASSIGNMENT'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">LOGISTICS STATUS:</span>
              <span className="font-bold text-slate-800 uppercase">{shipment.status}</span>
            </div>
            {shipment.etd && (
              <div>
                <span className="text-slate-500 block">ESTIMATED ETD:</span>
                <span className="font-bold text-slate-800">{shipment.etd}</span>
              </div>
            )}
            {shipment.eta && (
              <div>
                <span className="text-slate-500 block">ESTIMATED ETA:</span>
                <span className="font-bold text-slate-800">{shipment.eta}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-xs font-bold font-mono uppercase text-slate-700 mb-2 tracking-wider">
              ATTESTATION & DOCUMENTATION VERIFICATION CHECKLIST
            </h2>
            <table className="w-full text-xs font-mono border border-slate-300 text-left">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300">#</th>
                  <th className="p-2 border-r border-slate-300">DOCUMENT REQUIRED</th>
                  <th className="p-2 border-r border-slate-300">ATTESTATION STATUS</th>
                  <th className="p-2">VERIFICATION</th>
                </tr>
              </thead>
              <tbody>
                {shipment.docs.map((d, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200 font-bold">{i + 1}</td>
                    <td className="p-2 border-r border-slate-200">{d.name}</td>
                    <td className="p-2 border-r border-slate-200">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          d.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.status === 'In Attestation'
                            ? 'bg-amber-100 text-amber-800'
                            : d.status === 'Pending Approval'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {d.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 font-bold text-slate-600">
                      {d.status === 'Completed' ? '[ PASS ]' : '[ PENDING ]'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center border-t border-slate-300 pt-4 font-mono text-xs">
            <div>
              <span className="text-slate-500">CLEARANCE RATING: </span>
              <span className={`font-bold ${isFullyCleared ? 'text-emerald-700' : 'text-amber-700'}`}>
                {completedDocs} / {shipment.docs.length} VERIFIED ({Math.round((completedDocs / (shipment.docs.length || 1)) * 100)}%)
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">STAMP: </span>
              <span className="border-2 border-slate-900 px-2 py-0.5 font-bold tracking-widest uppercase">
                {isFullyCleared ? 'CUSTOMS READY' : 'DOCUMENTATION INCOMPLETE'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-semibold cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-mono bg-slate-900 text-white hover:bg-slate-800 rounded font-semibold cursor-pointer flex items-center gap-1.5"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
};
