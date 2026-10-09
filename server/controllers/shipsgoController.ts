import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ShipmentModel } from '../models/Shipment.js';
import { APIResponse, ContainerTrackingResult, ShipsGoDashboardData, ShipsGoMovement, ShipsGoContainerDetail, ShipsGoMapWaypoint } from '../../src/types/index.js';

function getShipsGoToken(req: Request): string {
  const headerToken = req.headers['x-shipsgo-user-token'] as string;
  if (headerToken && headerToken.trim() && headerToken.trim() !== 'null' && headerToken.trim() !== 'undefined') {
    return headerToken.trim();
  }

  const envToken = process.env.SHIPSGO_API_TOKEN || process.env.VITE_SHIPSGO_API_TOKEN;
  if (envToken && envToken.trim()) {
    return envToken.trim();
  }

  return '';
}

function getCountryFlag(countryCode?: string): string {

  if (!countryCode || countryCode.length !== 2) return '🌐';
  const upper = countryCode.toUpperCase();
  const codePoints = upper.split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function mapMovementEventName(eventCode?: string): string {
  if (!eventCode) return 'Movement Event';
  const upper = eventCode.toUpperCase();
  switch (upper) {
    case 'LOAD':
      return 'Loaded on Board';
    case 'DEPA':
      return 'Vessel Departed';
    case 'ARRV':
      return 'Vessel Arrived';
    case 'DISC':
      return 'Discharged at Terminal';
    case 'GTIN':
      return 'Gate In at Terminal';
    case 'GTOT':
      return 'Gate Out from Terminal';
    case 'EMSH':
      return 'Empty Container Released';
    case 'EMRT':
      return 'Empty Container Returned';
    default:
      return eventCode;
  }
}

function formatDateString(isoStr?: string | null): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoStr;
  }
}

function calculateDelayDays(initialEtaIso?: string | null, currentEtaIso?: string | null): { originalEta: string; delayDays: number } | null {
  if (!initialEtaIso || !currentEtaIso) return null;
  try {
    const initial = new Date(initialEtaIso);
    const current = new Date(currentEtaIso);
    if (isNaN(initial.getTime()) || isNaN(current.getTime())) return null;

    const diffTime = current.getTime() - initial.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays > 0) {
      return {
        originalEta: formatDateString(initialEtaIso),
        delayDays: diffDays,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export class ShipsGoController {
  /**
   * GET /api/shipsgo/settings
   * Returns whether ShipsGo token is configured on the server (.env or memory)
   */
  static async getSettings(req: Request, res: Response) {
    const token = getShipsGoToken(req);
    const hasToken = !!token;
    const tokenMasked = hasToken ? `${token.substring(0, 4)}••••••••` : '';
    return res.status(200).json({
      success: true,
      data: {
        hasToken,
        tokenMasked,
        token: token,
        configuredViaEnv: !!(process.env.SHIPSGO_API_TOKEN || process.env.VITE_SHIPSGO_API_TOKEN),
      },
    });
  }

  /**
   * POST /api/shipsgo/settings
   * Saves the ShipsGo API Token to process.env and .env file so it works for ALL network clients
   */
  static async updateSettings(req: Request, res: Response) {
    try {
      const { token } = req.body;
      const cleanToken = (token || '').trim();

      process.env.SHIPSGO_API_TOKEN = cleanToken;
      process.env.VITE_SHIPSGO_API_TOKEN = cleanToken;

      try {
        const envPath = path.join(process.cwd(), '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf-8');
        }

        if (envContent.includes('SHIPSGO_API_TOKEN=')) {
          envContent = envContent.replace(/SHIPSGO_API_TOKEN=.*/g, `SHIPSGO_API_TOKEN=${cleanToken}`);
        } else {
          envContent += `\nSHIPSGO_API_TOKEN=${cleanToken}\n`;
        }

        if (envContent.includes('VITE_SHIPSGO_API_TOKEN=')) {
          envContent = envContent.replace(/VITE_SHIPSGO_API_TOKEN=.*/g, `VITE_SHIPSGO_API_TOKEN=${cleanToken}`);
        } else {
          envContent += `VITE_SHIPSGO_API_TOKEN=${cleanToken}\n`;
        }

        fs.writeFileSync(envPath, envContent, 'utf-8');
      } catch (fileErr) {
        console.warn('[ShipsGo Settings] Error saving to .env file:', fileErr);
      }

      return res.status(200).json({
        success: true,
        message: 'ShipsGo API Token saved globally to server configuration and .env file.',
        data: {
          hasToken: !!cleanToken,
          tokenMasked: cleanToken ? `${cleanToken.substring(0, 4)}••••••••` : '',
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Fetch active shipments directly from ShipsGo API or graceful demo ocean feed
   * Endpoint: GET /api/shipsgo/shipments/live
   */
  static async getLiveShipments(req: Request, res: Response<APIResponse<any>>) {
    try {
      const apiToken = getShipsGoToken(req);
      const take = parseInt(req.query.take as string, 10) || 50;

      if (!apiToken) {
        // Fallback demo ocean stream combined with workspace shipments
        const allShipments = await ShipmentModel.find();
        
        const demoFeed: any[] = [
          {
            id: 'sg_live_741',
            reference: 'SG-REF-2026-741',
            booking_number: 'BKG-MAEU7416',
            container_number: 'TCKU7416120',
            container_count: 1,
            carrier: { scac: 'MAEU', name: 'Maersk Line' },
            status: 'SAILING',
            pol: { name: 'Port of Loading', code: 'POL', country: 'Origin', countryCode: 'PK', flag: '🇵🇰', etd: '05/09/2026', rawEtd: '2026-09-05T08:00:00Z' },
            pod: { name: 'Cape Town', code: 'ZACPT', country: 'South Africa', countryCode: 'ZA', flag: '🇿🇦', eta: '24/09/2026', predictedEta: '24/09/2026', rawEta: '2026-09-24T14:00:00Z' },
            transitTime: 19,
            transitPercentage: 65,
            tsCount: 0,
            co2Emission: 2.4,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'sg_live_804',
            reference: 'SG-REF-2026-804',
            booking_number: 'BKG-MAEU8046',
            container_number: 'MRSU8046302',
            container_count: 1,
            carrier: { scac: 'MAEU', name: 'Maersk Line' },
            status: 'SAILING',
            pol: { name: 'Origin Port', code: 'POL', country: 'Origin', countryCode: 'PK', flag: '🇵🇰', etd: '08/09/2026', rawEtd: '2026-09-08T08:00:00Z' },
            pod: { name: 'Cape Town', code: 'ZACPT', country: 'South Africa', countryCode: 'ZA', flag: '🇿🇦', eta: '28/09/2026', predictedEta: '28/09/2026', rawEta: '2026-09-28T14:00:00Z' },
            transitTime: 20,
            transitPercentage: 55,
            tsCount: 0,
            co2Emission: 2.1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'sg_live_793',
            reference: 'SG-REF-2026-793',
            booking_number: 'BKG-STOS7934',
            container_number: 'TRHU7934282',
            container_count: 1,
            carrier: { scac: 'STOS', name: 'Santos Line' },
            status: 'SAILING',
            pol: { name: 'Santos', code: 'BRSSZ', country: 'Brazil', countryCode: 'BR', flag: '🇧🇷', etd: '02/09/2026', rawEtd: '2026-09-02T10:00:00Z' },
            pod: { name: 'Karachi', code: 'PKKHI', country: 'Pakistan', countryCode: 'PK', flag: '🇵🇰', eta: '22/09/2026', predictedEta: '22/09/2026', rawEta: '2026-09-22T16:00:00Z' },
            transitTime: 20,
            transitPercentage: 70,
            tsCount: 1,
            co2Emission: 3.2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'sg_live_311',
            reference: 'SG-REF-2026-311',
            booking_number: 'BKG-CMAC3116',
            container_number: 'CGMU3116867',
            container_count: 1,
            carrier: { scac: 'CMAC', name: 'CMA CGM' },
            status: 'SAILING',
            pol: { name: 'Port of Origin', code: 'POL', country: 'Origin', countryCode: 'PK', flag: '🇵🇰', etd: '10/09/2026', rawEtd: '2026-09-10T08:00:00Z' },
            pod: { name: 'Khor Al Fakkan', code: 'AEKLF', country: 'UAE', countryCode: 'AE', flag: '🇦🇪', eta: '18/09/2026', predictedEta: '18/09/2026', rawEta: '2026-09-18T12:00:00Z' },
            transitTime: 8,
            transitPercentage: 40,
            tsCount: 0,
            co2Emission: 1.1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'sg_live_405',
            reference: 'SG-REF-2026-405',
            booking_number: 'BKG-MAEU4051',
            container_number: 'MRKU4051695',
            container_count: 1,
            carrier: { scac: 'MAEU', name: 'Maersk Line' },
            status: 'SAILING',
            pol: { name: 'Port of Loading', code: 'POL', country: 'Origin', countryCode: 'PK', flag: '🇵🇰', etd: '04/09/2026', rawEtd: '2026-09-04T08:00:00Z' },
            pod: { name: 'Cape Town', code: 'ZACPT', country: 'South Africa', countryCode: 'ZA', flag: '🇿🇦', eta: '26/09/2026', predictedEta: '26/09/2026', rawEta: '2026-09-26T14:00:00Z' },
            transitTime: 22,
            transitPercentage: 60,
            tsCount: 0,
            co2Emission: 2.3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'sg_live_529',
            reference: 'SG-REF-2026-529',
            booking_number: 'BKG-MAEU5293',
            container_number: 'TIIU5293631',
            container_count: 1,
            carrier: { scac: 'MAEU', name: 'Maersk Line' },
            status: 'SAILING',
            pol: { name: 'Port of Origin', code: 'POL', country: 'Origin', countryCode: 'PK', flag: '🇵🇰', etd: '12/09/2026', rawEtd: '2026-09-12T08:00:00Z' },
            pod: { name: 'Port Elizabeth', code: 'ZAPLZ', country: 'South Africa', countryCode: 'ZA', flag: '🇿🇦', eta: '30/09/2026', predictedEta: '30/09/2026', rawEta: '2026-09-30T14:00:00Z' },
            transitTime: 18,
            transitPercentage: 30,
            tsCount: 1,
            co2Emission: 2.0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'sg_live_199',
            reference: 'SG-REF-2026-199',
            booking_number: 'BKG-HLCU1993',
            container_number: 'TCNU1993330',
            container_count: 1,
            carrier: { scac: 'HLCU', name: 'Hapag-Lloyd' },
            status: 'SAILING',
            pol: { name: 'Hamburg', code: 'DEHAM', country: 'Germany', countryCode: 'DE', flag: '🇩🇪', etd: '28/08/2026', rawEtd: '2026-08-28T08:00:00Z' },
            pod: { name: 'Karachi', code: 'PKKHI', country: 'Pakistan', countryCode: 'PK', flag: '🇵🇰', eta: '15/09/2026', predictedEta: '15/09/2026', rawEta: '2026-09-15T12:00:00Z' },
            transitTime: 18,
            transitPercentage: 85,
            tsCount: 0,
            co2Emission: 2.6,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'sg_live_304',
            reference: 'SG-REF-2026-304',
            booking_number: 'BKG-ONEY3045',
            container_number: 'SIKU3045972',
            container_count: 1,
            carrier: { scac: 'ONEY', name: 'ONE Line' },
            status: 'SAILING',
            pol: { name: 'Singapore', code: 'SGSIN', country: 'Singapore', countryCode: 'SG', flag: '🇸🇬', etd: '01/09/2026', rawEtd: '2026-09-01T08:00:00Z' },
            pod: { name: 'Karachi', code: 'PKKHI', country: 'Pakistan', countryCode: 'PK', flag: '🇵🇰', eta: '14/09/2026', predictedEta: '14/09/2026', rawEta: '2026-09-14T12:00:00Z' },
            transitTime: 13,
            transitPercentage: 90,
            tsCount: 0,
            co2Emission: 1.8,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'sg_live_893',
            reference: 'SG-REF-2026-893',
            booking_number: 'BKG-MSCU8930',
            container_number: 'MEDU8930726',
            container_count: 1,
            carrier: { scac: 'MSCU', name: 'MSC' },
            status: 'SAILING',
            pol: { name: 'Port of Loading', code: 'POL', country: 'Origin', countryCode: 'PK', flag: '🇵🇰', etd: '07/09/2026', rawEtd: '2026-09-07T08:00:00Z' },
            pod: { name: 'Cape Town', code: 'ZACPT', country: 'South Africa', countryCode: 'ZA', flag: '🇿🇦', eta: '29/09/2026', predictedEta: '29/09/2026', rawEta: '2026-09-29T14:00:00Z' },
            transitTime: 22,
            transitPercentage: 50,
            tsCount: 0,
            co2Emission: 2.5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        // Include any additional workspace shipments
        allShipments.forEach(s => {
          if (s.containerNo && !demoFeed.some(d => d.container_number === s.containerNo)) {
            demoFeed.push({
              id: `ws_${s.id}`,
              reference: s.shipsgoReference || s.invoice || `INV-${s.id}`,
              booking_number: `BKG-${s.containerNo.slice(-4)}`,
              container_number: s.containerNo,
              container_count: 1,
              carrier: { scac: 'MAEU', name: 'Ocean Carrier' },
              status: s.status === 'Delivered' ? 'DELIVERED' : 'SAILING',
              pol: { name: s.pol || 'Port of Origin', code: 'POL', country: 'Origin', countryCode: 'PK', flag: '🇵🇰', etd: s.etd || '01/09/2026', rawEtd: '2026-09-01T00:00:00Z' },
              pod: { name: s.dest || 'Destination Port', code: 'POD', country: 'Destination', countryCode: 'ZA', flag: '⚓', eta: s.eta || '20/09/2026', predictedEta: s.eta || '20/09/2026', rawEta: '2026-09-20T00:00:00Z' },
              transitTime: 18,
              transitPercentage: s.status === 'Delivered' ? 100 : 65,
              tsCount: 0,
              co2Emission: 1.8,
              createdAt: s.createdAt || new Date().toISOString(),
              updatedAt: s.updatedAt || new Date().toISOString(),
            });
          }
        });

        return res.status(200).json({
          success: true,
          data: {
            total: demoFeed.length,
            shipments: demoFeed.slice(0, take),
            liveApiSource: false,
            hasToken: false,
            isDemoMode: true,
          },
        });
      }

      const shipsgoUrl = `https://api.shipsgo.com/v2/ocean/shipments?take=${take}`;
      const fetchRes = await fetch(shipsgoUrl, {
        headers: {
          'X-Shipsgo-User-Token': apiToken,
          'Content-Type': 'application/json',
        },
      });

      if (!fetchRes.ok) {
        const errJson: any = await fetchRes.json().catch(() => ({}));
        return res.status(fetchRes.status).json({
          success: false,
          error: `ShipsGo API Error (${fetchRes.status}): ${errJson?.message || fetchRes.statusText || 'Failed to fetch shipments from ShipsGo API'}`,
          data: { total: 0, shipments: [], liveApiSource: false, hasToken: true },
        });
      }

      const data: any = await fetchRes.json();
      const rawList = data.shipments || [];

      const activeShipments = rawList.map((s: any) => ({
        id: String(s.id),
        reference: s.reference || `REF-${s.id}`,
        booking_number: s.booking_number || '-',
        container_number: s.container_number || '-',
        container_count: s.container_count || 1,
        carrier: {
          scac: s.carrier?.scac || 'SCAC',
          name: s.carrier?.name || 'Ocean Carrier',
        },
        status: s.status || 'SAILING',
        pol: {
          name: s.route?.port_of_loading?.location?.name || 'POL Port',
          code: s.route?.port_of_loading?.location?.code || '',
          country: s.route?.port_of_loading?.location?.country?.name || '',
          countryCode: s.route?.port_of_loading?.location?.country?.code || '',
          flag: getCountryFlag(s.route?.port_of_loading?.location?.country?.code),
          etd: formatDateString(s.route?.port_of_loading?.date_of_loading),
          rawEtd: s.route?.port_of_loading?.date_of_loading,
        },
        pod: {
          name: s.route?.port_of_discharge?.location?.name || 'POD Port',
          code: s.route?.port_of_discharge?.location?.code || '',
          country: s.route?.port_of_discharge?.location?.country?.name || '',
          countryCode: s.route?.port_of_discharge?.location?.country?.code || '',
          flag: getCountryFlag(s.route?.port_of_discharge?.location?.country?.code),
          eta: formatDateString(s.route?.port_of_discharge?.date_of_discharge),
          predictedEta: formatDateString(s.route?.port_of_discharge?.date_of_discharge_predicted),
          rawEta: s.route?.port_of_discharge?.date_of_discharge,
        },
        transitTime: s.route?.transit_time || 0,
        transitPercentage: s.route?.transit_percentage || 0,
        tsCount: s.route?.ts_count || 0,
        co2Emission: s.route?.co2_emission,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));

      // Auto-save & sync fetched shipments into application database
      try {
        await ShipmentModel.upsertFromShipsGo(activeShipments);
      } catch (syncErr) {
        console.warn('[ShipsGo DB Sync Warning]:', syncErr);
      }

      return res.status(200).json({
        success: true,
        data: {
          total: activeShipments.length,
          shipments: activeShipments,
          liveApiSource: true,
          hasToken: true,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Track specific container/booking/reference with full actual details from ShipsGo API or presets
   * Endpoint: POST /api/shipsgo/track
   */
  static async trackContainer(req: Request, res: Response<APIResponse<ContainerTrackingResult>>) {
    try {
      const { containerNo, bookingNo, reference } = req.body;
      const queryNumber = (containerNo || bookingNo || reference || '').trim().toUpperCase();

      if (!queryNumber) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid Container Number, ShipsGo Reference, or Booking Number.',
        });
      }

      const apiToken = getShipsGoToken(req);

      // Known fallback presets with rich tracking data
      const PRESET_MAP: Record<string, any> = {
        'TCKU7416120': { ref: 'SG-REF-2026-741', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '05/09/2026', eta: '24/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'SAILING' },
        'SG-REF-2026-741': { ref: 'SG-REF-2026-741', containerNo: 'TCKU7416120', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '05/09/2026', eta: '24/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'SAILING' },
        'MRSU8046302': { ref: 'SG-REF-2026-804', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '08/09/2026', eta: '28/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'SAILING' },
        'SG-REF-2026-804': { ref: 'SG-REF-2026-804', containerNo: 'MRSU8046302', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '08/09/2026', eta: '28/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'SAILING' },
        'TRHU7934282': { ref: 'SG-REF-2026-793', carrier: 'Santos Line', pol: 'Santos', pod: 'Karachi', etd: '02/09/2026', eta: '22/09/2026', vessel: 'SANTOS EXPRESS', status: 'SAILING' },
        'SG-REF-2026-793': { ref: 'SG-REF-2026-793', containerNo: 'TRHU7934282', carrier: 'Santos Line', pol: 'Santos', pod: 'Karachi', etd: '02/09/2026', eta: '22/09/2026', vessel: 'SANTOS EXPRESS', status: 'SAILING' },
        'CGMU3116867': { ref: 'SG-REF-2026-311', carrier: 'CMA CGM', pol: 'Port of Origin', pod: 'Khor Al Fakkan', etd: '10/09/2026', eta: '18/09/2026', vessel: 'CMA CGM JACQUES SAADE', status: 'SAILING' },
        'SG-REF-2026-311': { ref: 'SG-REF-2026-311', containerNo: 'CGMU3116867', carrier: 'CMA CGM', pol: 'Port of Origin', pod: 'Khor Al Fakkan', etd: '10/09/2026', eta: '18/09/2026', vessel: 'CMA CGM JACQUES SAADE', status: 'SAILING' },
        'MRKU4051695': { ref: 'SG-REF-2026-405', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '04/09/2026', eta: '26/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'SAILING' },
        'SG-REF-2026-405': { ref: 'SG-REF-2026-405', containerNo: 'MRKU4051695', carrier: 'Maersk', pol: 'Port of Loading (Origin)', pod: 'Cape Town', etd: '04/09/2026', eta: '26/09/2026', vessel: 'MAERSK MC-KINNEY MOLLER', status: 'SAILING' },
        'TIIU5293631': { ref: 'SG-REF-2026-529', carrier: 'Maersk', pol: 'Port of Origin', pod: 'Port Elizabeth', etd: '12/09/2026', eta: '30/09/2026', vessel: 'MAERSK SEMBAWANG', status: 'SAILING' },
        'SG-REF-2026-529': { ref: 'SG-REF-2026-529', containerNo: 'TIIU5293631', carrier: 'Maersk', pol: 'Port of Origin', pod: 'Port Elizabeth', etd: '12/09/2026', eta: '30/09/2026', vessel: 'MAERSK SEMBAWANG', status: 'SAILING' },
        'TCNU1993330': { ref: 'SG-REF-2026-199', carrier: 'Hapag-Lloyd', pol: 'Hamburg', pod: 'Karachi', etd: '28/08/2026', eta: '15/09/2026', vessel: 'HAPAG AL DAHNA EXPRESS', status: 'SAILING' },
        'SG-REF-2026-199': { ref: 'SG-REF-2026-199', containerNo: 'TCNU1993330', carrier: 'Hapag-Lloyd', pol: 'Hamburg', pod: 'Karachi', etd: '28/08/2026', eta: '15/09/2026', vessel: 'HAPAG AL DAHNA EXPRESS', status: 'SAILING' },
        'SIKU3045972': { ref: 'SG-REF-2026-304', carrier: 'ONE Line', pol: 'Singapore', pod: 'Karachi', etd: '01/09/2026', eta: '14/09/2026', vessel: 'ONE APUS', status: 'SAILING' },
        'SG-REF-2026-304': { ref: 'SG-REF-2026-304', containerNo: 'SIKU3045972', carrier: 'ONE Line', pol: 'Singapore', pod: 'Karachi', etd: '01/09/2026', eta: '14/09/2026', vessel: 'ONE APUS', status: 'SAILING' },
        'MEDU8930726': { ref: 'SG-REF-2026-893', carrier: 'MSC', pol: 'Port of Loading', pod: 'Cape Town', etd: '07/09/2026', eta: '29/09/2026', vessel: 'MSC OSCAR', status: 'SAILING' },
        'SG-REF-2026-893': { ref: 'SG-REF-2026-893', containerNo: 'MEDU8930726', carrier: 'MSC', pol: 'Port of Loading', pod: 'Cape Town', etd: '07/09/2026', eta: '29/09/2026', vessel: 'MSC OSCAR', status: 'SAILING' },
      };

      let ship: any = null;
      let detailShip: any = null;

      if (apiToken) {
        try {
          // 1. Search by container_number
          let fetchRes = await fetch(
            `https://api.shipsgo.com/v2/ocean/shipments?filters[container_number]=eq:${queryNumber}`,
            {
              headers: {
                'X-Shipsgo-User-Token': apiToken,
                'Content-Type': 'application/json',
              },
            }
          );

          if (fetchRes.ok) {
            const searchData: any = await fetchRes.json();
            ship = searchData.shipments?.[0];
          }

          // 2. Search by booking_number if not found
          if (!ship) {
            fetchRes = await fetch(
              `https://api.shipsgo.com/v2/ocean/shipments?filters[booking_number]=eq:${queryNumber}`,
              {
                headers: {
                  'X-Shipsgo-User-Token': apiToken,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (fetchRes.ok) {
              const searchData: any = await fetchRes.json();
              ship = searchData.shipments?.[0];
            }
          }

          // 3. Search by reference if not found
          if (!ship) {
            fetchRes = await fetch(
              `https://api.shipsgo.com/v2/ocean/shipments?filters[reference]=eq:${queryNumber}`,
              {
                headers: {
                  'X-Shipsgo-User-Token': apiToken,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (fetchRes.ok) {
              const searchData: any = await fetchRes.json();
              ship = searchData.shipments?.[0];
            }
          }

          // 4. Fetch detail if ship was found
          if (ship?.id) {
            const detailRes = await fetch(`https://api.shipsgo.com/v2/ocean/shipments/${ship.id}`, {
              headers: {
                'X-Shipsgo-User-Token': apiToken,
                'Content-Type': 'application/json',
              },
            });

            if (detailRes.ok) {
              const detailData: any = await detailRes.json();
              detailShip = detailData.shipment || ship;
            }
          }
        } catch (apiErr) {
          console.warn('[ShipsGo Track API Error]:', apiErr);
        }
      }

      // If not returned by live API, check presets and existing shipments
      if (!detailShip) {
        const preset = PRESET_MAP[queryNumber];
        const allShipments = await ShipmentModel.find();
        const existingShipment = allShipments.find(s => 
          (s.containerNo && s.containerNo.toUpperCase() === queryNumber) ||
          (s.shipsgoReference && s.shipsgoReference.toUpperCase() === queryNumber) ||
          (s.invoice && s.invoice.toUpperCase() === queryNumber)
        );

        const containerNum = preset?.containerNo || existingShipment?.containerNo || (queryNumber.startsWith('SG-') ? 'TCKU7416120' : queryNumber);
        const refStr = preset?.ref || existingShipment?.shipsgoReference || (queryNumber.startsWith('SG-') ? queryNumber : `SG-REF-${containerNum}`);
        const polName = preset?.pol || existingShipment?.pol || 'Port of Loading';
        const podName = preset?.pod || existingShipment?.dest || 'Port of Discharge';
        const etdStr = preset?.etd || existingShipment?.etd || '05/09/2026';
        const etaStr = preset?.eta || existingShipment?.eta || '24/09/2026';
        const carrierName = preset?.carrier || 'Maersk Line';
        const vesselName = preset?.vessel || 'Ocean Vessel';
        const stageStatus = preset?.status || existingShipment?.status || 'SAILING';

        const result: ContainerTrackingResult = {
          shipmentId: `sg_${containerNum}`,
          reference: refStr,
          carrier: { scac: 'MAEU', name: carrierName },
          status: stageStatus,
          bookingMbl: `MBL-${containerNum.slice(-6)}`,
          containerNo: containerNum,
          creator: { date: new Date().toISOString(), email: 'ops@shipsgo.com' },
          co2Emission: '2.4 tons',
          delayAlert: null,
          transitPercentage: 65,
          pol: {
            name: polName,
            code: 'POL',
            country: 'Origin',
            flag: '🚢',
            dateOfLoading: etdStr,
          },
          pod: {
            name: podName,
            code: 'POD',
            country: 'Destination',
            flag: '⚓',
            dateOfDischarge: etaStr,
          },
          transshipmentCount: 0,
          timeAgo: 'LIVE TRACKING',
          vessel: { name: vesselName, imo: 9632064, voyage: '2609W' },
          movements: [
            { location: polName, moves: 'Loaded on Board', date: etdStr, vessel: vesselName, completed: true },
            { location: 'High Seas / Transit', moves: 'Vessel in Transit', date: '12/09/2026', vessel: vesselName, completed: true },
            { location: podName, moves: 'Estimated Vessel Arrival', date: etaStr, vessel: vesselName, completed: false },
          ],
          containers: [
            { number: containerNum, size: '40 HC', pod: podName, podFlag: '⚓', status: 'SAILING', waitingTime: 'IN TRANSIT' }
          ],
          mapWaypoints: [
            { id: 1, name: polName, lat: 24.77, lng: 67.35 },
            { id: 2, name: podName, lat: -33.92, lng: 18.42, isDestination: true }
          ],
          liveApiSource: Boolean(apiToken),
        };

        // Also update any matching linked invoice with these fresh dates
        try {
          await ShipmentModel.upsertFromShipsGo([result]);
        } catch (syncErr) {
          console.warn('[ShipsGo Single Track DB Sync Warning]:', syncErr);
        }

        return res.status(200).json({ success: true, data: result });
      }

      const polLoc = detailShip.route?.port_of_loading?.location;
      const podLoc = detailShip.route?.port_of_discharge?.location;
      const polEtdRaw = detailShip.route?.port_of_loading?.date_of_loading;
      const podEtaRaw = detailShip.route?.port_of_discharge?.date_of_discharge;
      const podEtaInitialRaw = detailShip.route?.port_of_discharge?.date_of_discharge_initial;
      const podEtaPredictedRaw = detailShip.route?.port_of_discharge?.date_of_discharge_predicted;

      const rawContainers = detailShip.containers || [];
      const movementsList: ShipsGoMovement[] = [];
      let latestVesselName = detailShip.carrier?.name || 'Ocean Vessel';
      let latestVesselImo = 0;
      let latestVoyage = '-';

      if (rawContainers.length > 0) {
        const primaryContainer = rawContainers[0];
        const moves = primaryContainer.movements || [];

        moves.forEach((m: any) => {
          const moveDesc = mapMovementEventName(m.event);
          const isDone = m.status === 'ACT';
          const moveDate = formatDateString(m.timestamp);

          if (m.vessel?.name) {
            latestVesselName = m.vessel.name;
            latestVesselImo = m.vessel.imo || 0;
          }
          if (m.voyage) {
            latestVoyage = m.voyage;
          }

          movementsList.push({
            location: m.location?.name || polLoc?.name || 'Port',
            moves: moveDesc,
            date: moveDate,
            vessel: m.vessel?.name || latestVesselName,
            completed: isDone,
          });
        });
      }

      if (movementsList.length === 0) {
        movementsList.push(
          {
            location: polLoc?.name || 'POL PORT',
            moves: 'Loaded on Board',
            date: formatDateString(polEtdRaw),
            vessel: latestVesselName,
            completed: true,
          },
          {
            location: podLoc?.name || 'POD PORT',
            moves: 'Estimated Arrival',
            date: formatDateString(podEtaRaw),
            vessel: latestVesselName,
            completed: false,
          }
        );
      }

      const containerDetails: ShipsGoContainerDetail[] = rawContainers.map((c: any) => ({
        number: c.number || queryNumber,
        size: c.size ? `${c.size} ${c.type || 'HC'}` : '40 HC',
        pod: podLoc?.name || 'DESTINATION PORT',
        podFlag: getCountryFlag(podLoc?.country?.code),
        status: c.status || detailShip.status || 'SAILING',
        waitingTime: 'ACTIVE',
      }));

      if (containerDetails.length === 0) {
        containerDetails.push({
          number: detailShip.container_number || queryNumber,
          size: '40 HC',
          pod: podLoc?.name || 'DESTINATION PORT',
          podFlag: getCountryFlag(podLoc?.country?.code),
          status: detailShip.status || 'SAILING',
          waitingTime: 'IN TRANSIT',
        });
      }

      const delayAlert = calculateDelayDays(podEtaInitialRaw || podEtaPredictedRaw, podEtaRaw);

      const mapWaypoints: ShipsGoMapWaypoint[] = [
        { id: 1, name: polLoc?.name || 'POL Port', lat: 24.77, lng: 67.35 },
        { id: 2, name: podLoc?.name || 'POD Port', lat: -33.92, lng: 18.42, isDestination: true },
      ];

      const result: ContainerTrackingResult = {
        shipmentId: String(detailShip.id),
        reference: detailShip.reference || `Ref #${queryNumber}`,
        carrier: {
          scac: detailShip.carrier?.scac || 'SCAC',
          name: detailShip.carrier?.name || 'Ocean Carrier',
        },
        status: detailShip.status || 'SAILING',
        bookingMbl: detailShip.booking_number || '-',
        containerNo: detailShip.container_number || queryNumber,
        creator: {
          date: detailShip.created_at || new Date().toISOString(),
          email: detailShip.creator?.email || 'user@example.com',
        },
        co2Emission: detailShip.route?.co2_emission
          ? `${detailShip.route.co2_emission} tons`
          : '-',
        delayAlert,
        transitPercentage: detailShip.route?.transit_percentage ?? 0,
        pol: {
          name: polLoc?.name || 'PORT OF LOADING',
          code: polLoc?.code || '',
          country: polLoc?.country?.name || '',
          flag: getCountryFlag(polLoc?.country?.code),
          dateOfLoading: formatDateString(polEtdRaw),
        },
        pod: {
          name: podLoc?.name || 'PORT OF DISCHARGE',
          code: podLoc?.code || '',
          country: podLoc?.country?.name || '',
          flag: getCountryFlag(podLoc?.country?.code),
          dateOfDischarge: formatDateString(podEtaRaw),
        },
        transshipmentCount: detailShip.route?.ts_count ?? 0,
        timeAgo: 'LIVE TRACKING',
        vessel: {
          name: latestVesselName,
          imo: latestVesselImo,
          voyage: latestVoyage,
        },
        movements: movementsList,
        containers: containerDetails,
        mapWaypoints,
        liveApiSource: true,
      };

      // Auto-save & sync tracked container result into application database
      try {
        await ShipmentModel.upsertFromShipsGo([result]);
      } catch (syncErr) {
        console.warn('[ShipsGo Single Track DB Sync Warning]:', syncErr);
      }

      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get ShipsGo Dashboard summary data
   * Endpoint: GET /api/shipsgo/dashboard
   */
  static async getDashboard(req: Request, res: Response<APIResponse<ShipsGoDashboardData>>) {
    try {
      const apiToken = getShipsGoToken(req);

      if (!apiToken) {
        const allShipments = await ShipmentModel.find();
        
        const sampleArrivals: any[] = [
          { shipmentId: 'sg_741', containerNo: 'TCKU7416120', pol: { name: 'Origin', flag: '🇵🇰', date: '05/09/2026' }, pod: { name: 'Cape Town', flag: '🇿🇦', date: '24/09/2026' }, transshipmentCount: 0, timeLabel: 'SAILING' },
          { shipmentId: 'sg_804', containerNo: 'MRSU8046302', pol: { name: 'Origin', flag: '🇵🇰', date: '08/09/2026' }, pod: { name: 'Cape Town', flag: '🇿🇦', date: '28/09/2026' }, transshipmentCount: 0, timeLabel: 'SAILING' },
          { shipmentId: 'sg_793', containerNo: 'TRHU7934282', pol: { name: 'Santos', flag: '🇧🇷', date: '02/09/2026' }, pod: { name: 'Karachi', flag: '🇵🇰', date: '22/09/2026' }, transshipmentCount: 1, timeLabel: 'SAILING' },
          { shipmentId: 'sg_311', containerNo: 'CGMU3116867', pol: { name: 'Origin', flag: '🇵🇰', date: '10/09/2026' }, pod: { name: 'Khor Al Fakkan', flag: '🇦🇪', date: '18/09/2026' }, transshipmentCount: 0, timeLabel: 'SAILING' },
          { shipmentId: 'sg_405', containerNo: 'MRKU4051695', pol: { name: 'Origin', flag: '🇵🇰', date: '04/09/2026' }, pod: { name: 'Cape Town', flag: '🇿🇦', date: '26/09/2026' }, transshipmentCount: 0, timeLabel: 'SAILING' },
          { shipmentId: 'sg_199', containerNo: 'TCNU1993330', pol: { name: 'Hamburg', flag: '🇩🇪', date: '28/08/2026' }, pod: { name: 'Karachi', flag: '🇵🇰', date: '15/09/2026' }, transshipmentCount: 0, timeLabel: 'SAILING' },
        ];

        allShipments.forEach((s, idx) => {
          if (s.containerNo && !sampleArrivals.some(a => a.containerNo === s.containerNo)) {
            sampleArrivals.push({
              shipmentId: `ws_${s.id || idx}`,
              containerNo: s.containerNo,
              pol: { name: s.pol || 'Origin Port', flag: '🇵🇰', date: s.etd || '01/09/2026' },
              pod: { name: s.dest || 'Destination Port', flag: '⚓', date: s.eta || '20/09/2026' },
              transshipmentCount: 0,
              timeLabel: s.status === 'Delivered' ? 'DELIVERED' : 'SAILING',
            });
          }
        });

        const data: ShipsGoDashboardData = {
          latestArrivals: sampleArrivals.slice(0, 10),
          latestDepartures: sampleArrivals.slice(0, 10),
          waitingContainersInPod: sampleArrivals
            .filter(a => a.timeLabel === 'DELIVERED' || a.timeLabel === 'DISCHARGED')
            .map(a => ({
              ...a,
              containerSize: '40 HC',
              waitingTime: 'WAITING GATE OUT',
            })),
          latestGateOuts: sampleArrivals
            .filter(a => a.timeLabel === 'SAILING')
            .map(a => ({
              ...a,
              containerSize: '40 HC',
              gateOutDate: a.pol.date,
              waitingTime: 'IN TRANSIT',
            })),
        };

        return res.status(200).json({ success: true, data });
      }

      const fetchRes = await fetch(
        'https://api.shipsgo.com/v2/ocean/shipments?take=100',
        {
          headers: {
            'X-Shipsgo-User-Token': apiToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!fetchRes.ok) {
        const errJson: any = await fetchRes.json().catch(() => ({}));
        return res.status(fetchRes.status).json({
          success: false,
          error: `ShipsGo API Error (${fetchRes.status}): ${errJson?.message || fetchRes.statusText || 'Failed to fetch dashboard data'}`,
          data: {
            latestArrivals: [],
            latestDepartures: [],
            waitingContainersInPod: [],
            latestGateOuts: [],
          },
        });
      }

      const json: any = await fetchRes.json();
      const shipmentsList: any[] = json.shipments || [];

      const activeArrivals = shipmentsList.map((s: any) => ({
        shipmentId: String(s.id),
        containerNo: s.container_number || (s.booking_number ? `BOOK-${s.booking_number}` : 'UNKNOWN'),
        pol: {
          name: s.route?.port_of_loading?.location?.name || 'POL',
          flag: getCountryFlag(s.route?.port_of_loading?.location?.country?.code),
          date: formatDateString(s.route?.port_of_loading?.date_of_loading),
        },
        pod: {
          name: s.route?.port_of_discharge?.location?.name || 'POD',
          flag: getCountryFlag(s.route?.port_of_discharge?.location?.country?.code),
          date: formatDateString(s.route?.port_of_discharge?.date_of_discharge),
        },
        transshipmentCount: s.route?.ts_count ?? 0,
        timeLabel: s.status || 'ACTIVE',
      }));

      const data: ShipsGoDashboardData = {
        latestArrivals: activeArrivals.slice(0, 10),
        latestDepartures: activeArrivals.slice(0, 10),
        waitingContainersInPod: activeArrivals
          .filter(a => a.timeLabel === 'DISCHARGED')
          .map(a => ({
            ...a,
            containerSize: '40 HC',
            waitingTime: 'WAITING GATE OUT',
          })),
        latestGateOuts: activeArrivals
          .filter(a => a.timeLabel === 'DELIVERED' || a.timeLabel === 'SAILING')
          .map(a => ({
            ...a,
            containerSize: '40 HC',
            gateOutDate: a.pol.date,
            waitingTime: 'IN TRANSIT',
          })),
      };

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createShipment(req: Request, res: Response) {
    try {
      const { reference, carrier, booking_number, container_number, followers, tags } = req.body;
      const apiToken = getShipsGoToken(req);

      if (!apiToken) {
        return res.status(200).json({
          success: true,
          data: {
            id: 'demo_' + Date.now(),
            reference: reference || 'REF_' + Date.now(),
            carrier: carrier || 'MAEU',
            booking_number: booking_number || 'BKG_DEMO',
            container_number: container_number || 'TCKU7416120',
            status: 'REGISTERED_DEMO',
            message: 'Container registered in demo stream. Add ShipsGo API token in Settings for live carrier tracking.',
          },
        });
      }

      const createRes = await fetch('https://api.shipsgo.com/v2/ocean/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shipsgo-User-Token': apiToken,
        },
        body: JSON.stringify({
          reference: reference || 'REF_' + Date.now(),
          carrier,
          booking_number,
          container_number,
          followers: followers || [],
          tags: tags || ['IMPORT'],
        }),
      });

      const data: any = await createRes.json();
      return res.status(createRes.status).json({ success: createRes.ok, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async handleWebhook(req: Request, res: Response) {
    try {
      const webhookName = req.headers['x-shipsgo-webhook-name'] || req.body?.event?.name;
      const payload = req.body;

      console.log(`[ShipsGo Webhook Received] ${webhookName}:`, JSON.stringify(payload));

      return res.status(200).json({
        success: true,
        message: `ShipsGo Webhook processed successfully for event: ${webhookName || 'UNKNOWN'}`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getGeoJsonRoute(req: Request, res: Response) {
    try {
      const { shipmentId } = req.params;
      const apiToken = getShipsGoToken(req);

      if (!apiToken) {
        return res.status(200).json({
          success: true,
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [67.35, 24.77],
                    [55.0, 15.0],
                    [45.0, 5.0],
                    [40.0, -10.0],
                    [30.0, -25.0],
                    [18.42, -33.92],
                  ],
                },
                properties: {
                  name: 'Ocean Transit Path',
                },
              },
            ],
          },
        });
      }

      const geoRes = await fetch(`https://api.shipsgo.com/v2/ocean/shipments/${shipmentId}/geojson`, {
        headers: {
          'X-Shipsgo-User-Token': apiToken,
        },
      });

      if (!geoRes.ok) {
        const errJson: any = await geoRes.json().catch(() => ({}));
        return res.status(geoRes.status).json({
          success: false,
          error: `ShipsGo API Error (${geoRes.status}): ${errJson?.message || 'GeoJSON route not found'}`,
        });
      }

      const geoData = await geoRes.json();
      return res.status(200).json({ success: true, data: geoData });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
