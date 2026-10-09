import React, { useState, useEffect, useCallback } from 'react';
import { Shipment } from '../../types';
import { ShipsGoService } from '../../services/shipsgoService';
import { ShipmentService } from '../../services/shipmentService';

interface ShipsGoLiveFeedViewProps {
  savedShipments: Shipment[];
  onOpenContainerTracker: (containerNo?: string) => void;
  onRefreshWorkspaceShipments: () => void;
  onNavigateToSettings?: () => void;
}

interface ShipsGoApiShipment {
  id: string;
  reference: string;
  booking_number: string;
  container_number: string;
  carrier: { scac: string; name: string };
  status: string;
  pol: { name: string; code: string; flag: string; etd: string };
  pod: { name: string; code: string; flag: string; eta: string };
  transitTime: number;
  transitPercentage: number;
  tsCount: number;
  co2Emission?: number;
}

export const ShipsGoLiveFeedView: React.FC<ShipsGoLiveFeedViewProps> = ({
  savedShipments,
  onOpenContainerTracker,
  onRefreshWorkspaceShipments,
  onNavigateToSettings,
}) => {
  const [liveShipments, setLiveShipments] = useState<ShipsGoApiShipment[]>([]);
  const [isLiveApi, setIsLiveApi] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchLiveShipments = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await ShipsGoService.getLiveShipments(50);
      if (res && res.shipments) {
        setLiveShipments(res.shipments);
        setIsLiveApi(Boolean(res.liveApiSource));
      } else {
        setLiveShipments([]);
        setIsLiveApi(false);
      }
    } catch (err: any) {
      console.warn('Note on ShipsGo live shipments stream:', err.message);
      setErrorMsg(err.message || 'Failed to load shipments from ShipsGo API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveShipments();
  }, [fetchLiveShipments]);

  // Check if shipment is already saved in local DB
  const isShipmentSaved = (containerNo?: string, reference?: string) => {
    if (!containerNo && !reference) return false;
    const cleanCont = (containerNo || '').trim().toUpperCase();
    const cleanRef = (reference || '').trim().toUpperCase();
    return savedShipments.some(s => {
      const dbCont = (s.containerNo || '').trim().toUpperCase();
      const dbRef = (s.invoice || '').trim().toUpperCase();
      return (cleanCont && dbCont === cleanCont) || (cleanRef && dbRef === cleanRef);
    });
  };

  // Manual save live API shipment into Database
  const handleSaveToDatabase = async (ls: ShipsGoApiShipment) => {
    try {
      setSavingId(ls.id);
      const containerNo = ls.container_number !== '-' ? ls.container_number : '';
      const ref = ls.reference || (containerNo ? `REF-${containerNo}` : `REF-${ls.id}`);

      await ShipmentService.create({
        invoice: ref,
        customerId: 'general',
        dest: ls.pod?.name || 'DESTINATION PORT',
        containerNo,
        trackingLink: containerNo ? `https://shipsgo.com/tracking/${containerNo}` : '',
        etd: ls.pol?.etd || '',
        eta: ls.pod?.eta || '',
        status: ls.status === 'DELIVERED' ? 'Delivered' : 'In Transit',
        docs: [
          { name: 'Commercial Invoice', status: 'Not Started' },
          { name: 'Packing List', status: 'Not Started' },
          { name: 'Bill of Lading / AWB', status: 'Not Started' },
          { name: 'Certificate of Origin', status: 'Not Started' },
          { name: 'Customs Declaration', status: 'Not Started' },
        ],
      });

      setToastMessage(`✅ Shipment "${ref}" saved to database successfully!`);
      setTimeout(() => setToastMessage(null), 4000);

      onRefreshWorkspaceShipments();
    } catch (err: any) {
      alert(`Failed to save shipment to database: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const filtered = liveShipments.filter(ls => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (ls.reference || '').toLowerCase().includes(q) ||
      (ls.container_number || '').toLowerCase().includes(q) ||
      (ls.carrier?.name || '').toLowerCase().includes(q) ||
      (ls.pol?.name || '').toLowerCase().includes(q) ||
      (ls.pod?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-700 text-white font-bold text-xs px-4 py-3 rounded-lg shadow-xl animate-bounce flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800 uppercase font-sans flex items-center gap-2">
            <span>🌐</span> ShipsGo API Live Feed
          </h1>
          <p className="text-xs text-slate-500">
            Real-time API stream from ShipsGo account. Selectively import live containers into your saved compliance database.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={fetchLiveShipments}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs uppercase font-mono tracking-wide"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            <span>{loading ? 'Fetching...' : 'Refresh API Feed'}</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Counter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-700">
          {isLiveApi ? (
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live ShipsGo REST API Active
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Live Ocean Stream (Demo / Workspace)
              </span>
              {onNavigateToSettings && (
                <button
                  onClick={onNavigateToSettings}
                  className="text-sky-600 hover:text-sky-800 hover:underline font-medium text-[11px] cursor-pointer"
                >
                  Configure API Token →
                </button>
              )}
            </div>
          )}
          <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-[11px]">
            {filtered.length} Live Items
          </span>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by container, reference or port..."
          className="bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 font-medium"
        />
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs font-medium space-y-1">
          <div className="font-bold">⚠️ ShipsGo Live API Alert</div>
          <p>{errorMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-mono font-bold uppercase">Connecting to ShipsGo Ocean API...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500 text-xs font-medium space-y-2">
          <p className="text-sm font-bold text-slate-700">No Live API Shipments Found</p>
          <p>Make sure your ShipsGo API token is set in settings or try clearing the search filter.</p>
        </div>
      ) : (
        /* Live Shipments Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-900 text-slate-300 font-mono text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 text-center">Track</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Carrier</th>
                  <th className="py-3 px-3">CO₂</th>
                  <th className="py-3 px-3">Reference</th>
                  <th className="py-3 px-3">Container No</th>
                  <th className="py-3 px-3">POL & ETD</th>
                  <th className="py-3 px-3 text-center">TD</th>
                  <th className="py-3 px-3">POD & ETA</th>
                  <th className="py-3 px-3 text-right">Save to Database</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filtered.map(ls => {
                  const saved = isShipmentSaved(ls.container_number, ls.reference);
                  const isSavingThis = savingId === ls.id;

                  return (
                    <tr key={ls.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onOpenContainerTracker(ls.container_number)}
                          className="w-7 h-7 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white inline-flex items-center justify-center font-bold transition-colors cursor-pointer text-xs"
                          title="Track on Interactive Map"
                        >
                          👁
                        </button>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded font-mono uppercase ${
                            ls.status === 'SAILING'
                              ? 'bg-slate-800 text-white'
                              : ls.status === 'DISCHARGED' || ls.status === 'DELIVERED'
                              ? 'bg-sky-600 text-white'
                              : 'bg-amber-600 text-white'
                          }`}
                        >
                          {ls.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {ls.carrier?.name || 'Ocean Carrier'}
                      </td>

                      <td className="py-3 px-3 font-mono text-emerald-600 text-[11px] font-bold">
                        🍃 {ls.co2Emission ? `${ls.co2Emission}T` : '1.2T'}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-900 truncate max-w-[150px]" title={ls.reference}>
                        {ls.reference || `REF-${ls.id}`}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-sky-700">
                        {ls.container_number || '-'}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold flex items-center gap-1 text-[11px]">
                          <span>{ls.pol.flag}</span>
                          <span className="truncate max-w-[110px]">{ls.pol.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{ls.pol.etd}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-block bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold w-5 h-5 leading-5 rounded-full">
                          {ls.tsCount === 0 ? 'D' : ls.tsCount}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold flex items-center gap-1 text-[11px]">
                          <span>{ls.pod.flag}</span>
                          <span className="truncate max-w-[110px]">{ls.pod.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{ls.pod.eta}</div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        {saved ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-300 font-extrabold text-[10px] px-2.5 py-1 rounded-md font-mono">
                            ✓ Saved in DB
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSaveToDatabase(ls)}
                            disabled={isSavingThis}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-3 py-1 rounded cursor-pointer transition-colors font-mono shadow-2xs"
                          >
                            {isSavingThis ? 'Saving...' : '📥 Save to DB'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
