import React, { useState, useEffect } from 'react';
import { ShipsGoService } from '../../services/shipsgoService';

export const ApiWebhooksView: React.FC = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [testLog, setTestLog] = useState<string | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingToken, setTestingToken] = useState(false);
  const [tokenStatusMessage, setTokenStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadTokenSettings = async () => {
      try {
        const settings = await ShipsGoService.getSettings();
        if (settings && settings.hasToken) {
          const activeToken = settings.token || localStorage.getItem('SHIPSGO_API_TOKEN') || '';
          setTokenInput(activeToken);
          setSavedToken(activeToken);
          if (activeToken) {
            localStorage.setItem('SHIPSGO_API_TOKEN', activeToken);
          }
          setTokenStatusMessage('✅ ShipsGo API Token active on server. All network computers share this configuration!');
        } else {
          const existing = localStorage.getItem('SHIPSGO_API_TOKEN') || '';
          setTokenInput(existing);
          setSavedToken(existing);
        }
      } catch {
        const existing = localStorage.getItem('SHIPSGO_API_TOKEN') || '';
        setTokenInput(existing);
        setSavedToken(existing);
      }
    };
    loadTokenSettings();
  }, []);

  const handleSaveToken = async () => {
    setTestingToken(true);
    setTokenStatusMessage(null);
    try {
      const cleanToken = tokenInput.trim();
      localStorage.setItem('SHIPSGO_API_TOKEN', cleanToken);
      setSavedToken(cleanToken);

      // Save token to server configuration (.env & process.env) so it works across all network computers
      await ShipsGoService.saveSettings(cleanToken);

      // Test connection with live shipments
      const liveRes = await ShipsGoService.getLiveShipments(5);
      if (liveRes && liveRes.liveApiSource) {
        setTokenStatusMessage('✅ ShipsGo API Token verified and saved globally to .env! Active for all network computers.');
      } else {
        setTokenStatusMessage('✅ Token saved globally on server (.env) and locally.');
      }
    } catch (err: any) {
      setTokenStatusMessage(`⚠️ Saved token to server (.env), test response: ${err.message}`);
    } finally {
      setTestingToken(false);
    }
  };

  const handleClearToken = async () => {
    localStorage.removeItem('SHIPSGO_API_TOKEN');
    setTokenInput('');
    setSavedToken('');
    try {
      await ShipsGoService.saveSettings('');
    } catch {}
    setTokenStatusMessage('Cleared ShipsGo API Token from server and local storage.');
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setTestLog(null);
    try {
      const res = await fetch('/api/shipsgo/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shipsgo-Webhook-Name': 'OCEAN.SHIPMENTS.SHIPMENT_UPDATED',
        },
        body: JSON.stringify({
          event: { id: 'evt_test_999', name: 'OCEAN.SHIPMENTS.SHIPMENT_UPDATED' },
          shipment: { id: 123456, container_number: 'TIIU5293631', status: 'SAILING' },
        }),
      });

      const data = await res.json();
      setTestLog(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestLog(`Error firing webhook: ${err.message}`);
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* Breadcrumbs */}
      <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
        <h1 className="text-xl font-bold text-slate-800 uppercase font-sans">API & Webhooks Integration</h1>
        <div className="font-mono text-[11px] text-slate-400">
          Dashboard &gt; Integrations &gt; <span className="text-slate-700 font-bold">API & Webhooks</span>
        </div>
      </div>

      {/* ShipsGo API User Token Configuration */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔑</span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">ShipsGo API User Token Setup</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Connect your live ShipsGo account directly by entering your User Token from the ShipsGo Developer Dashboard.
              </p>
            </div>
          </div>
          {savedToken ? (
            <span className="bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold px-2.5 py-1 rounded border border-emerald-300">
              ● API TOKEN ACTIVE
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-800 font-mono text-[11px] font-bold px-2.5 py-1 rounded border border-amber-300">
              ● USING SCREENSHOT SHIPMENT DATA
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            placeholder="Paste your ShipsGo X-Shipsgo-User-Token here..."
            className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
          <button
            onClick={handleSaveToken}
            disabled={testingToken}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer transition-colors shadow-xs"
          >
            {testingToken ? 'Verifying...' : 'Save & Test Connection'}
          </button>
          {savedToken && (
            <button
              onClick={handleClearToken}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2.5 rounded-lg cursor-pointer border border-slate-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {tokenStatusMessage && (
          <div className="p-3 bg-slate-900 text-slate-200 font-mono text-xs rounded-lg border border-slate-800">
            {tokenStatusMessage}
          </div>
        )}

        <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
          💡 <span className="font-bold text-slate-700">How token fetching works:</span> You can either paste your token above or configure <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">SHIPSGO_API_TOKEN</code> in your server secrets. If set, all endpoints (Live Shipments, Container Tracking, Dashboard Stats, GeoJSON Routes) query the live ShipsGo REST API v2 directly!
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Webhook Configuration Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h2 className="text-sm font-bold text-slate-900">Real-Time ShipsGo Webhook Endpoint</h2>
          </div>

          <p className="text-xs text-slate-600">
            ShipsGo automatically pushes real-time milestone & event triggers to this endpoint whenever vessel status or container movements update.
          </p>

          <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-3 rounded-lg border border-slate-800">
            <code>POST /api/shipsgo/webhook</code>
          </div>

          <div className="space-y-1 text-xs text-slate-600">
            <div><span className="font-bold text-slate-800">Authentication:</span> HMAC-SHA256 Signature via <code>X-Shipsgo-Webhook-Signature</code></div>
            <div><span className="font-bold text-slate-800">Event Triggers:</span> OCEAN.SHIPMENTS.SHIPMENT_CREATED, SHIPMENT_UPDATED</div>
          </div>

          <button
            onClick={handleTestWebhook}
            disabled={testingWebhook}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
          >
            {testingWebhook ? 'Testing...' : '⚡ Trigger Test Webhook Event'}
          </button>

          {testLog && (
            <pre className="bg-slate-900 text-slate-200 text-[10px] font-mono p-3 rounded-lg overflow-x-auto max-h-40">
              {testLog}
            </pre>
          )}
        </div>

        {/* API Rate Limit & Usage Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">💳</span>
            <h2 className="text-sm font-bold text-slate-900">API Credit & Rate Limits</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-800">Credit Consumption</div>
              <p className="text-slate-500 mt-0.5">
                Each container tracking creation deducts 1 credit. Subsequent status checks every 6 hours incur zero extra credit cost.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-800">Query Limit Policy</div>
              <p className="text-slate-500 mt-0.5">
                Standard company threshold: 100 requests per minute across your team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
