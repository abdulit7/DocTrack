import React from 'react';
import { AuditLogItem } from '../../types';

interface AuditLogModalProps {
  logs: AuditLogItem[];
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ logs, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--navy-panel)] border border-[var(--line)] text-[var(--chalk)] rounded-lg max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[85vh]">
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-[var(--line)]">
          <div>
            <h2 className="text-base font-bold font-mono-custom tracking-wider uppercase text-[var(--transit-teal)]">
              📋 System Audit & Attestation Log
            </h2>
            <p className="text-xs text-[var(--chalk-dim)] mt-0.5 font-mono-custom">
              Immutable history of document updates, stage changes, and export manifests
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--chalk-dim)] hover:text-[var(--chalk)] text-lg px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--chalk-dim)] font-mono-custom">
            No system audit logs recorded yet.
          </div>
        ) : (
          <div className="space-y-3 font-mono-custom text-xs">
            {logs.map(log => {
              const d = new Date(log.timestamp);
              const formattedTime = d.toLocaleString();

              return (
                <div
                  key={log.id}
                  className="bg-[var(--navy-panel-2)] border border-[var(--line)] p-3 rounded flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[var(--transit-teal)] text-[11px] uppercase tracking-wide">
                        [{log.action}]
                      </span>
                      <span className="text-[10px] text-[var(--chalk-dim)]">{formattedTime}</span>
                    </div>
                    <div className="text-[12px] text-[var(--chalk)] font-sans">{log.details}</div>
                  </div>
                  <span className="text-[10px] text-[var(--chalk-dim)] bg-[var(--navy-bg)] px-2 py-0.5 rounded border border-[var(--line)]">
                    {log.targetType} #{log.targetId}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono-custom bg-[var(--navy-panel-2)] text-[var(--chalk)] border border-[var(--line)] rounded hover:border-[var(--transit-teal)] cursor-pointer"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};
