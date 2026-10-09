import React from 'react';
import { Shipment, Customer, DocStatus } from '../../types';

interface UrgentComplianceModalProps {
  urgentShipments: Array<{
    shipment: Shipment;
    customer?: Customer;
    daysLeft: number;
    pendingDocs: Array<{ index: number; name: string; status: DocStatus }>;
  }>;
  onClose: () => void;
  onUpdateDocStatus: (shipmentId: string, docIndex: number, status: DocStatus) => void;
  onOpenContainerTracker: (containerNo?: string) => void;
}

export const UrgentComplianceModal: React.FC<UrgentComplianceModalProps> = ({
  urgentShipments,
  onClose,
  onUpdateDocStatus,
  onOpenContainerTracker,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white text-slate-800 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden border border-rose-300 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-rose-700 text-white px-6 py-4 flex justify-between items-center border-b border-rose-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-bounce">🚨</span>
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider font-mono">
                Critical Compliance Alert ({urgentShipments.length} Shipment{urgentShipments.length > 1 ? 's' : ''})
              </h2>
              <p className="text-xs text-rose-100 mt-0.5">
                Shipment approaching destination port with pending authority clearance documents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-rose-200 hover:text-white text-xl font-bold px-2 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-slate-50">
          {urgentShipments.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-lg border border-slate-200 text-slate-600">
              <div className="text-3xl mb-2">🎉</div>
              <h3 className="text-sm font-bold text-slate-800">All Clearance Documents Complete!</h3>
              <p className="text-xs text-slate-500 mt-1">
                No approaching shipments have pending authority requirements.
              </p>
            </div>
          ) : (
            urgentShipments.map(({ shipment, customer, daysLeft, pendingDocs }) => (
              <div
                key={shipment.id}
                className="bg-white rounded-lg border border-rose-200 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Left urgency indicator bar */}
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-rose-600" />

                <div className="pl-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          Invoice #{shipment.invoice}
                        </span>
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 uppercase font-mono">
                          {daysLeft < 0
                            ? `Overdue (${Math.abs(daysLeft)} Days)`
                            : daysLeft === 0
                            ? 'ARRIVING TODAY'
                            : `Arriving in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-700 mt-0.5">
                        Shipment Reference: <span className="text-indigo-700 font-mono font-bold">{shipment.invoice}</span> · Destination: <span className="text-slate-800">{shipment.dest}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenContainerTracker(shipment.containerNo)}
                      className="bg-slate-100 hover:bg-sky-600 hover:text-white text-slate-700 text-xs font-semibold px-3 py-1.5 rounded border border-slate-300 transition-colors cursor-pointer flex items-center gap-1 font-mono"
                    >
                      🚢 Track Container {shipment.containerNo ? `(${shipment.containerNo})` : ''}
                    </button>
                  </div>

                  {/* Pending Documents Checklist */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 font-mono">
                      Pending Required Authority Documents ({pendingDocs.length} Remaining):
                    </h4>
                    <div className="space-y-2">
                      {pendingDocs.map(doc => (
                        <div
                          key={doc.index}
                          className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                doc.status === 'In Attestation'
                                  ? 'bg-amber-500 animate-pulse'
                                  : doc.status === 'Pending Approval'
                                  ? 'bg-sky-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span className="font-semibold text-slate-800">{doc.name}</span>
                            <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                              Status: {doc.status}
                            </span>
                          </div>

                          {/* Quick Change Status Buttons */}
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => onUpdateDocStatus(shipment.id, doc.index, 'Completed')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded cursor-pointer transition-colors"
                            >
                              ✓ Mark Complete
                            </button>
                            <button
                              onClick={() => onUpdateDocStatus(shipment.id, doc.index, 'In Attestation')}
                              className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-medium px-2.5 py-1 rounded cursor-pointer transition-colors"
                            >
                              ⏳ In Attestation
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Real-time Compliance Engine · Auto-notifies before vessel discharge</span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs px-5 py-2 rounded cursor-pointer transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
