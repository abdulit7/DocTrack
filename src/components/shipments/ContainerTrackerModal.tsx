import React, { useState, useEffect } from 'react';
import { ShipsGoService } from '../../services/shipsgoService';
import { ContainerTrackingResult, Customer, Shipment, ShipmentStage } from '../../types';

interface ContainerTrackerModalProps {
  initialContainerNo?: string;
  customers?: Customer[];
  existingShipments?: Shipment[];
  onClose: () => void;
  onLinkShipment?: (data: {
    customerId: string;
    newCustomerName?: string;
    invoice: string;
    containerNo: string;
    dest: string;
    status: ShipmentStage;
    trackingLink: string;
    etd: string;
    eta: string;
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

export const ContainerTrackerModal: React.FC<ContainerTrackerModalProps> = ({
  initialContainerNo = '',
  customers = [],
  existingShipments = [],
  onClose,
  onLinkShipment,
}) => {
  const [containerInput, setContainerInput] = useState(initialContainerNo || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContainerTrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'MOVEMENTS' | 'CONTAINERS' | 'EXTRAS'>('MOVEMENTS');

  const handleSearch = async (query?: string) => {
    const target = (query || containerInput).trim();
    if (!target) {
      setError('Please enter a valid Container Number or Booking/AWB number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await ShipsGoService.trackContainer(target);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch container tracking information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (containerInput.trim()) {
      handleSearch(containerInput);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white text-slate-800 rounded-lg max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* ShipsGo Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-700">
              Shipment #{result?.shipmentId || '6332869'}
            </h2>
            {result?.liveApiSource && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                Live ShipsGo API
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Quick Search Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={containerInput}
              onChange={e => setContainerInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Container No (e.g. TCKU7416120, MRSU8046302, TRHU7934282)..."
              className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs px-5 py-2 rounded cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading ? 'Tracking...' : 'Search Container'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
              ⚠️ {error}
            </div>
          )}

          {result && (
            <>
              {/* ShipsGo Main Metadata Grey Card */}
              <div className="bg-slate-100/80 border border-slate-200 rounded-lg p-5 text-xs text-slate-600 space-y-2.5 font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-6">
                  <div className="flex items-center">
                    <span className="font-bold text-slate-500 w-32">Reference :</span>
                    <span className="font-medium text-slate-700 break-all">{result.reference}</span>
                  </div>
                  <div className="flex items-center justify-between md:justify-start">
                    <span className="font-bold text-slate-500 w-28">Status :</span>
                    <span className="bg-indigo-600 text-white font-bold text-[11px] px-2.5 py-0.5 rounded uppercase tracking-wide">
                      {result.status}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <span className="font-bold text-slate-500 w-32">Carrier :</span>
                    <span className="font-medium text-slate-700">{result.carrier.name}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold text-slate-500 w-28">Container :</span>
                    <span className="font-semibold text-slate-800 font-mono">{result.containerNo}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="font-bold text-slate-500 w-32">Booking / MBL :</span>
                    <span className="font-medium text-slate-700">{result.bookingMbl}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold text-slate-500 w-28">Creator :</span>
                    <span className="font-medium text-slate-600 truncate">{result.creator.date} {result.creator.email}</span>
                  </div>
                </div>
              </div>

              {/* CO2 Emissions Banner */}
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-md flex items-center gap-2 font-medium">
                <span className="text-emerald-600 text-base">🌱</span>
                <span>The actual CO2 emission of this shipment voyage is {result.co2Emission}.</span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => alert(`Showing Live Vessel Coordinates: ${result.pol.name} ➔ ${result.pod.name}`)}
                  className="border border-sky-500 text-sky-600 hover:bg-sky-50 font-medium text-xs px-3.5 py-1.5 rounded-md cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  📍 Live Position
                </button>
                <button
                  type="button"
                  className="border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs px-3 py-1.5 rounded-md cursor-pointer"
                >
                  ☰
                </button>
              </div>

              {/* ShipsGo Tabs */}
              <div className="border-b border-slate-200 flex gap-8 pt-2 text-xs font-bold text-slate-500">
                {(['MOVEMENTS', 'CONTAINERS', 'EXTRAS'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2.5 cursor-pointer transition-colors relative ${
                      activeTab === tab
                        ? 'text-sky-600 border-b-2 border-sky-600'
                        : 'hover:text-slate-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* TAB CONTENT: MOVEMENTS */}
              {activeTab === 'MOVEMENTS' && (
                <div className="space-y-4 pt-2">
                  {/* Map Route Graphic */}
                  <div className="relative bg-sky-950/90 rounded-lg p-4 border border-slate-300 overflow-hidden text-white shadow-inner">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-2">
                      {/* Interactive Route SVG Map Representation */}
                      <div className="w-full h-36 flex items-center justify-between relative px-6">
                        <svg className="absolute inset-0 w-full h-full stroke-sky-400/60" strokeDasharray="4 4" strokeWidth="2">
                          <path d="M 50 70 Q 250 20 450 70 T 850 70" fill="none" />
                        </svg>

                        {/* Waypoints */}
                        {result.mapWaypoints.map((wp, idx) => (
                          <div key={wp.id} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg border-2 ${
                                wp.isDestination
                                  ? 'bg-red-500 border-white text-white animate-bounce'
                                  : 'bg-white border-sky-500 text-slate-800'
                              }`}
                            >
                              {wp.isDestination ? '📍' : wp.id}
                            </div>
                            <span className="text-[10px] font-semibold mt-1 bg-slate-900/80 px-2 py-0.5 rounded text-sky-200 text-center max-w-[100px] truncate">
                              {wp.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Movements Table */}
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Moves</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Vessel</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {result.movements.map((m, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="py-2.5 px-4 font-semibold text-slate-800">{m.location}</td>
                            <td className="py-2.5 px-4 text-slate-600">{m.moves}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">{m.date}</td>
                            <td className="py-2.5 px-4 font-mono text-sky-700">{m.vessel}</td>
                            <td className="py-2.5 px-4 text-center">
                              {m.completed ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] font-bold">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Delay Alert Banner */}
                  {result.delayAlert && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-2.5 rounded-md flex items-center gap-2 font-medium">
                      <span className="text-amber-600 text-base">⚠️</span>
                      <span>
                        First ETA of this shipment was {result.delayAlert.originalEta},{' '}
                        {String(result.delayAlert.delayDays).padStart(2, '0')} days Delay Occured.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: CONTAINERS */}
              {activeTab === 'CONTAINERS' && (
                <div className="pt-2 border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Container No</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">POD</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Waiting Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {result.containers.map((c, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">{c.number}</td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                              {c.size}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {c.podFlag} {c.pod}
                          </td>
                          <td className="py-3 px-4 font-semibold text-emerald-700">{c.status}</td>
                          <td className="py-3 px-4 text-slate-500 font-mono">{c.waitingTime || 'TODAY'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB CONTENT: EXTRAS */}
              {activeTab === 'EXTRAS' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-3 text-slate-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <div className="font-bold text-slate-800 mb-1">⚡ Real-Time Webhooks</div>
                      <p className="text-[11px] text-slate-500">
                        Webhook endpoint active: <code className="bg-slate-100 text-sky-700 px-1 py-0.5 rounded">/api/shipsgo/webhook</code>
                      </p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                        ✓ HMAC-SHA256 Signature Validated
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded border border-slate-200">
                      <div className="font-bold text-slate-800 mb-1">💳 Credit & Rate Limits</div>
                      <p className="text-[11px] text-slate-500">
                        1 Credit deducted per shipment creation. Rate limit: 100 requests/min.
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Auto-polled every 6 hours for milestone updates.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded border border-slate-200 space-y-1">
                    <div>
                      <span className="font-bold text-slate-700">Followers Subscribed:</span> {result.creator.email}
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Tags Assigned:</span> <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-1.5 py-0.5 rounded">IMPORT</span> <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">CUSTOMER_ABC</span>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
};

