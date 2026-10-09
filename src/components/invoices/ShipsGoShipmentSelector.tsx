import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Shipment, ShipmentStage } from '../../types';

export interface ShipsGoOption {
  id: string;
  ref: string;
  containerNo: string;
  label: string;
  dest?: string;
  carrier?: string;
  pol?: string;
  etd?: string;
  eta?: string;
  status?: ShipmentStage;
  customerId?: string;
  isSaved?: boolean;
}

export const SHIPSGO_PRESETS: ShipsGoOption[] = [
  { id: 'p1', ref: 'SG-REF-2026-741', containerNo: 'TCKU7416120', label: 'SG-REF-2026-741 — TCKU7416120 — Cape Town', dest: 'Cape Town', carrier: 'Maersk', pol: 'Port of Loading', etd: '2026-09-05', eta: '2026-09-24', status: 'In Transit' },
  { id: 'p2', ref: 'SG-REF-2026-804', containerNo: 'MRSU8046302', label: 'SG-REF-2026-804 — MRSU8046302 — Cape Town', dest: 'Cape Town', carrier: 'Maersk', pol: 'Port of Loading', etd: '2026-09-08', eta: '2026-09-28', status: 'In Transit' },
  { id: 'p3', ref: 'SG-REF-2026-793', containerNo: 'TRHU7934282', label: 'SG-REF-2026-793 — TRHU7934282 — Karachi', dest: 'Karachi', carrier: 'Santos Line', pol: 'Santos', etd: '2026-09-02', eta: '2026-09-22', status: 'In Transit' },
  { id: 'p4', ref: 'SG-REF-2026-311', containerNo: 'CGMU3116867', label: 'SG-REF-2026-311 — CGMU3116867 — Khor Al Fakkan', dest: 'Khor Al Fakkan', carrier: 'CMA CGM', pol: 'Port of Loading', etd: '2026-09-10', eta: '2026-09-18', status: 'In Transit' },
  { id: 'p5', ref: 'SG-REF-2026-405', containerNo: 'MRKU4051695', label: 'SG-REF-2026-405 — MRKU4051695 — Cape Town', dest: 'Cape Town', carrier: 'Maersk', pol: 'Port of Loading', etd: '2026-09-04', eta: '2026-09-26', status: 'In Transit' },
  { id: 'p6', ref: 'SG-REF-2026-529', containerNo: 'TIIU5293631', label: 'SG-REF-2026-529 — TIIU5293631 — Port Elizabeth', dest: 'Port Elizabeth', carrier: 'Maersk', pol: 'Port of Loading', etd: '2026-09-12', eta: '2026-09-30', status: 'In Transit' },
  { id: 'p7', ref: 'SG-REF-2026-199', containerNo: 'TCNU1993330', label: 'SG-REF-2026-199 — TCNU1993330 — Karachi', dest: 'Karachi', carrier: 'Hapag-Lloyd', pol: 'Hamburg', etd: '2026-08-28', eta: '2026-09-15', status: 'In Transit' },
  { id: 'p8', ref: 'SG-REF-2026-304', containerNo: 'SIKU3045972', label: 'SG-REF-2026-304 — SIKU3045972 — Karachi', dest: 'Karachi', carrier: 'ONE Line', pol: 'Singapore', etd: '2026-09-01', eta: '2026-09-14', status: 'In Transit' },
  { id: 'p9', ref: 'SG-REF-2026-893', containerNo: 'MEDU8930726', label: 'SG-REF-2026-893 — MEDU8930726 — Cape Town', dest: 'Cape Town', carrier: 'MSC', pol: 'Port of Loading', etd: '2026-09-07', eta: '2026-09-29', status: 'In Transit' },
];

interface ShipsGoShipmentSelectorProps {
  shipments?: Shipment[];
  selectedReference?: string;
  selectedContainer?: string;
  isLinked?: boolean;
  isFetching?: boolean;
  fetchStatus?: string | null;
  isErrorStatus?: boolean;
  onSelect: (item: {
    containerNo: string;
    ref: string;
    dest?: string;
    etd?: string;
    eta?: string;
    status?: ShipmentStage;
    customerId?: string;
    carrier?: string;
  }) => void;
  onUnlink: () => void;
  onCustomReferenceChange?: (ref: string) => void;
  onTriggerFetch?: (query?: string) => void;
}

export const ShipsGoShipmentSelector: React.FC<ShipsGoShipmentSelectorProps> = ({
  shipments = [],
  selectedReference,
  selectedContainer,
  isLinked = false,
  isFetching = false,
  fetchStatus = null,
  isErrorStatus = false,
  onSelect,
  onUnlink,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Build options list
  const allOptions: ShipsGoOption[] = useMemo(() => {
    const list: ShipsGoOption[] = [...SHIPSGO_PRESETS];
    const seen = new Set(SHIPSGO_PRESETS.map(p => p.containerNo.toUpperCase()));

    shipments.forEach(s => {
      const cNo = (s.containerNo || '').trim().toUpperCase();
      if (cNo && !seen.has(cNo)) {
        seen.add(cNo);
        const ref = s.shipsgoReference || `SG-${cNo}`;
        list.push({
          id: `saved-${s.id}`,
          ref,
          containerNo: cNo,
          label: `${ref} — ${cNo} — ${s.dest || 'Saved Destination'}`,
          dest: s.dest,
          pol: s.pol,
          etd: s.etd,
          eta: s.eta,
          status: s.status,
          customerId: s.customerId,
          isSaved: true,
        });
      }
    });

    return list;
  }, [shipments]);

  // Find currently selected option text
  const selectedDisplay = useMemo(() => {
    if (!isLinked) return '';
    const cleanRef = (selectedReference || '').trim().toUpperCase();
    const cleanCont = (selectedContainer || '').trim().toUpperCase();

    const matched = allOptions.find(
      opt =>
        (cleanRef && opt.ref.toUpperCase() === cleanRef) ||
        (cleanCont && opt.containerNo.toUpperCase() === cleanCont) ||
        (cleanRef && opt.containerNo.toUpperCase() === cleanRef)
    );

    if (matched) {
      return `${matched.ref} — ${matched.containerNo} — ${matched.dest || 'Destination'}`;
    }

    if (cleanRef || cleanCont) {
      return `${selectedReference || `SG-${selectedContainer}`} — ${selectedContainer || 'Container'}`;
    }

    return '';
  }, [isLinked, selectedReference, selectedContainer, allOptions]);

  // Filtered options based on search term
  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allOptions;
    return allOptions.filter(opt =>
      opt.ref.toLowerCase().includes(term) ||
      opt.containerNo.toLowerCase().includes(term) ||
      (opt.dest || '').toLowerCase().includes(term) ||
      (opt.carrier || '').toLowerCase().includes(term)
    );
  }, [allOptions, searchTerm]);

  const handleSelectOption = (opt: ShipsGoOption) => {
    onSelect({
      containerNo: opt.containerNo,
      ref: opt.ref,
      dest: opt.dest,
      etd: opt.etd,
      eta: opt.eta,
      status: opt.status,
      customerId: opt.customerId,
      carrier: opt.carrier,
    });
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUnlink();
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchTerm.trim().toUpperCase();
    if (!clean) return;
    onSelect({
      containerNo: clean,
      ref: `SG-${clean}`,
    });
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      <label className="block text-xs font-bold text-slate-700 uppercase font-mono">
        Link ShipsGo Shipment (Optional)
      </label>

      <div className="relative">
        {/* Single Selection Field Box */}
        <div
          onClick={() => setIsOpen(prev => !prev)}
          className={`w-full min-h-[42px] px-3 py-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between gap-2 transition-all shadow-2xs ${
            isLinked
              ? 'bg-sky-50/70 border-sky-400 text-sky-950 ring-1 ring-sky-300'
              : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm shrink-0">⚓</span>
            {isLinked && selectedDisplay ? (
              <span className="font-mono font-bold text-slate-900 truncate">
                {selectedDisplay}
              </span>
            ) : (
              <span className="text-slate-500 font-medium truncate">
                -- Choose or Search ShipsGo Shipment (Ref / Container / Destination) --
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isFetching && <span className="animate-spin text-sky-600">⌛</span>}
            {isLinked && (
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-400 hover:text-rose-600 text-sm font-bold px-1 py-0.5 rounded cursor-pointer transition-colors"
                title="Unlink ShipsGo shipment"
              >
                ✕
              </button>
            )}
            <span className="text-slate-400 text-[10px]">▼</span>
          </div>
        </div>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl max-h-72 overflow-hidden flex flex-col divide-y divide-slate-100">
            {/* Search Input Bar */}
            <div className="p-2 bg-slate-50 flex items-center gap-2">
              <span className="text-slate-400 text-xs pl-1">🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
                placeholder="Type to filter by Ref #, Container #, Destination..."
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Options List */}
            <div className="overflow-y-auto max-h-56 divide-y divide-slate-100">
              {/* Option to clear/unlink */}
              <button
                type="button"
                onClick={() => {
                  onUnlink();
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                  !isLinked ? 'bg-slate-100 font-bold text-slate-800' : 'hover:bg-slate-50 text-slate-500'
                }`}
              >
                <span>🚫</span>
                <span>— No ShipsGo Shipment Linked (Manual Invoice) —</span>
              </button>

              {filteredOptions.length > 0 ? (
                filteredOptions.map(opt => {
                  const isThisSelected =
                    isLinked &&
                    ((selectedReference && opt.ref.toUpperCase() === selectedReference.toUpperCase()) ||
                      (selectedContainer && opt.containerNo.toUpperCase() === selectedContainer.toUpperCase()));

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer group ${
                        isThisSelected
                          ? 'bg-sky-50 font-bold text-sky-950 border-l-4 border-sky-600'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-900">
                            {opt.ref}
                          </span>
                          <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                            Container: {opt.containerNo}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Destination: <span className="font-medium text-slate-700">{opt.dest || 'Port'}</span>
                          {opt.carrier ? ` • ${opt.carrier}` : ''}
                          {opt.etd ? ` • ETD: ${opt.etd}` : ''}
                          {opt.eta ? ` • ETA: ${opt.eta}` : ''}
                        </div>
                      </div>

                      {isThisSelected ? (
                        <span className="text-emerald-700 font-bold text-[11px] shrink-0 font-mono">
                          ✓ Selected
                        </span>
                      ) : (
                        <span className="text-sky-600 font-semibold text-[11px] shrink-0 group-hover:translate-x-0.5 transition-transform">
                          Select ➔
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-slate-500 space-y-2">
                  <div>No preset matches "{searchTerm}"</div>
                  {searchTerm.trim() && (
                    <button
                      type="button"
                      onClick={handleCustomSubmit}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-mono font-bold text-xs px-3 py-1.5 rounded cursor-pointer"
                    >
                      Link Custom Container: {searchTerm.trim().toUpperCase()}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fetch status message if available */}
      {fetchStatus && (
        <div
          className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border ${
            isErrorStatus
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-300'
          }`}
        >
          {fetchStatus}
        </div>
      )}
    </div>
  );
};
