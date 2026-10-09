import React, { useState, useEffect } from 'react';
import { ShipsGoService } from '../../services/shipsgoService';
import { ShipsGoDashboardData } from '../../types';

interface ShipsGoDashboardViewProps {
  onOpenTracker: (containerNo: string) => void;
}

export const ShipsGoDashboardView: React.FC<ShipsGoDashboardViewProps> = ({ onOpenTracker }) => {
  const [data, setData] = useState<ShipsGoDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftTab, setLeftTab] = useState<'ARRIVALS' | 'DEPARTURES'>('ARRIVALS');
  const [rightTab, setRightTab] = useState<'WAITING' | 'GATE_OUTS'>('WAITING');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await ShipsGoService.getDashboard();
        setData(res);
      } catch (err) {
        console.error('Failed to load ShipsGo dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-mono animate-pulse">
        Loading ShipsGo Container Overview...
      </div>
    );
  }

  if (!data) return null;

  const leftItems = leftTab === 'ARRIVALS' ? data.latestArrivals : data.latestDepartures;
  const rightItems = rightTab === 'WAITING' ? data.waitingContainersInPod : data.latestGateOuts;

  return (
    <div className="space-y-6 my-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            🚢 ShipsGo Live Container Operations
          </h2>
          <p className="text-xs text-slate-500">
            Real-time port arrivals, transshipments, POD dwell times, and gate outs
          </p>
        </div>
        <button
          onClick={() => onOpenTracker('')}
          className="bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs px-4 py-2 rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          🔍 Quick Track Container
        </button>
      </div>

      {/* Two-Column Side-by-Side Cards (Matching ShipsGo Images 3 & 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL: Latest Arrivals / Departures */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
              <button
                onClick={() => setLeftTab('ARRIVALS')}
                className={`flex-1 py-3 px-4 text-center cursor-pointer transition-colors border-b-2 ${
                  leftTab === 'ARRIVALS'
                    ? 'border-sky-600 text-sky-600 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                LATEST ARRIVALS
              </button>
              <button
                onClick={() => setLeftTab('DEPARTURES')}
                className={`flex-1 py-3 px-4 text-center cursor-pointer transition-colors border-b-2 ${
                  leftTab === 'DEPARTURES'
                    ? 'border-sky-600 text-sky-600 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                LATEST DEPARTURES
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center">View</th>
                    <th className="py-2.5 px-3">Shipment</th>
                    <th className="py-2.5 px-3">POL</th>
                    <th className="py-2.5 px-2 text-center">TD</th>
                    <th className="py-2.5 px-3">POD</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leftItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-sky-50/40 transition-colors">
                      {/* View Button */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onOpenTracker(item.containerNo)}
                          title="View Shipment Details"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-600 hover:text-white transition-colors cursor-pointer"
                        >
                          👁
                        </button>
                      </td>
                      {/* Shipment Code */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {item.containerNo}
                      </td>
                      {/* POL */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
                          <span>{item.pol.flag}</span>
                          <span className="truncate max-w-[130px]">{item.pol.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.pol.date}</div>
                      </td>
                      {/* TD (Transshipment Count) */}
                      <td className="py-2.5 px-2 text-center">
                        <span className="inline-block bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold w-5 h-5 leading-5 rounded-full">
                          {item.transshipmentCount}
                        </span>
                      </td>
                      {/* POD */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
                          <span>{item.pod.flag}</span>
                          <span className="truncate max-w-[120px]">{item.pod.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.pod.date}</div>
                      </td>
                      {/* Time */}
                      <td className="py-2.5 px-3 text-right font-bold text-[10px] text-slate-500">
                        {item.timeLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Show More Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button
              onClick={() => onOpenTracker('')}
              className="text-xs text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
            >
              Show More Shipments ➔
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Waiting Containers in POD / Latest Gate Outs */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
              <button
                onClick={() => setRightTab('WAITING')}
                className={`flex-1 py-3 px-3 text-center cursor-pointer transition-colors border-b-2 ${
                  rightTab === 'WAITING'
                    ? 'border-sky-600 text-sky-600 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                WAITING CONTAINERS IN POD
              </button>
              <button
                onClick={() => setRightTab('GATE_OUTS')}
                className={`flex-1 py-3 px-3 text-center cursor-pointer transition-colors border-b-2 ${
                  rightTab === 'GATE_OUTS'
                    ? 'border-sky-600 text-sky-600 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                LATEST GATE OUTS
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center">View</th>
                    <th className="py-2.5 px-3">Container</th>
                    <th className="py-2.5 px-3">POD</th>
                    <th className="py-2.5 px-3 text-right">
                      {rightTab === 'WAITING' ? 'Waiting Time' : 'Gate Out Dwell'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rightItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                      {/* View Button */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onOpenTracker(item.containerNo)}
                          title="View Container Detail"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200 hover:bg-sky-600 hover:text-white transition-colors cursor-pointer"
                        >
                          👁
                        </button>
                      </td>
                      {/* Container */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-800">{item.containerNo}</div>
                        {item.containerSize && (
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                            {item.containerSize}
                          </span>
                        )}
                      </td>
                      {/* POD */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
                          <span>{item.pod.flag}</span>
                          <span className="truncate max-w-[140px]">{item.pod.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.pod.date}</div>
                      </td>
                      {/* Waiting Time / Dwell */}
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            rightTab === 'WAITING' && parseInt(item.timeLabel) > 10
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {item.waitingTime || item.timeLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Show More Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button
              onClick={() => onOpenTracker('')}
              className="text-xs text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
            >
              Show More Containers ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
