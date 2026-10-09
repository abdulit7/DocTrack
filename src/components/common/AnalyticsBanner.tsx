import React from 'react';
import { AnalyticsSummary } from '../../types';

interface AnalyticsBannerProps {
  summary: AnalyticsSummary | null;
  urgentCount?: number;
  onOpenUrgentModal?: () => void;
  onOpenAuditLog: () => void;
  onExportCSV: () => void;
  onOpenContainerTracker: (containerNo?: string) => void;
}

export const AnalyticsBanner: React.FC<AnalyticsBannerProps> = ({
  summary,
  urgentCount = 0,
  onOpenUrgentModal,
  onOpenAuditLog,
  onExportCSV,
  onOpenContainerTracker,
}) => {
  if (!summary) return null;

  return (
    <div className="bg-[var(--navy-panel)] border border-[var(--line)] rounded p-4 mb-4 font-mono-custom text-xs">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[var(--transit-teal)] font-bold uppercase tracking-wider text-xs">
            ⚡ Live Attestation & Logistics Overview
          </span>
          <span className="text-[10px] bg-[var(--navy-panel-2)] text-[var(--chalk-dim)] px-2 py-0.5 rounded border border-[var(--line)]">
            MERN API Sync Active
          </span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {urgentCount > 0 && (
            <button
              onClick={onOpenUrgentModal}
              className="text-[11px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1 rounded cursor-pointer transition-all animate-pulse flex items-center gap-1.5 shadow-sm"
            >
              🚨 {urgentCount} Urgent Doc Alert{urgentCount > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => onOpenContainerTracker()}
            className="text-[11px] bg-[var(--transit-teal)] text-[var(--navy-bg)] font-bold px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 hover:brightness-110"
          >
            🚢 Track Container Live
          </button>
          <button
            onClick={onExportCSV}
            className="text-[11px] bg-[var(--navy-panel-2)] hover:bg-[var(--navy-panel-2)]/80 text-[var(--chalk)] border border-[var(--line)] px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5"
          >
            📥 Export CSV
          </button>
          <button
            onClick={onOpenAuditLog}
            className="text-[11px] bg-[var(--navy-panel-2)] hover:bg-[var(--navy-panel-2)]/80 text-[var(--transit-teal)] border border-[var(--line)] px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5"
          >
            📋 Audit Log
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-[var(--navy-panel-2)] border border-[var(--line)] p-2.5 rounded text-center">
          <span className="block text-[10px] text-[var(--chalk-dim)] uppercase">Total Shipments</span>
          <span className="text-lg font-bold text-[var(--chalk)] mt-0.5 block">{summary.totalShipments}</span>
        </div>

        <div className="bg-[var(--navy-panel-2)] border border-[var(--line)] p-2.5 rounded text-center">
          <span className="block text-[10px] text-[var(--chalk-dim)] uppercase">In Documentation</span>
          <span className="text-lg font-bold text-[var(--customs-gold)] mt-0.5 block">
            {summary.documentationStage}
          </span>
        </div>

        <div className="bg-[var(--navy-panel-2)] border border-[var(--line)] p-2.5 rounded text-center">
          <span className="block text-[10px] text-[var(--chalk-dim)] uppercase">In Transit</span>
          <span className="text-lg font-bold text-[var(--transit-teal)] mt-0.5 block">
            {summary.inTransit}
          </span>
        </div>

        <div className="bg-[var(--navy-panel-2)] border border-[var(--line)] p-2.5 rounded text-center">
          <span className="block text-[10px] text-[var(--chalk-dim)] uppercase">Arriving &le; 7 Days</span>
          <span className="text-lg font-bold text-[var(--stamp-green)] mt-0.5 block">
            {summary.arrivingSoon}
          </span>
        </div>

        <div className="bg-[var(--navy-panel-2)] border border-[var(--line)] p-2.5 rounded text-center">
          <span className="block text-[10px] text-[var(--chalk-dim)] uppercase">Docs Verified</span>
          <span className="text-lg font-bold text-[var(--chalk)] mt-0.5 block">
            {summary.completedDocs} / {summary.totalDocs}
          </span>
        </div>

        <div className="bg-[var(--navy-panel-2)] border border-[var(--line)] p-2.5 rounded text-center">
          <span className="block text-[10px] text-[var(--chalk-dim)] uppercase">Compliance Score</span>
          <span
            className={`text-lg font-bold mt-0.5 block ${
              summary.complianceRate >= 80 ? 'text-[var(--stamp-green)]' : 'text-[var(--customs-gold)]'
            }`}
          >
            {summary.complianceRate}%
          </span>
        </div>
      </div>
    </div>
  );
};
