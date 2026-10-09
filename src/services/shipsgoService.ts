import { apiRequest } from './apiClient';
import { ContainerTrackingResult, ShipsGoDashboardData } from '../types';

export const ShipsGoService = {
  getSettings: async (): Promise<{ hasToken: boolean; tokenMasked: string; token: string; configuredViaEnv: boolean }> => {
    return apiRequest<{ hasToken: boolean; tokenMasked: string; token: string; configuredViaEnv: boolean }>('/shipsgo/settings');
  },
  saveSettings: async (token: string): Promise<any> => {
    return apiRequest<any>('/shipsgo/settings', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  trackContainer: async (containerNo: string, bookingNo?: string): Promise<ContainerTrackingResult> => {
    return apiRequest<ContainerTrackingResult>('/shipsgo/track', {
      method: 'POST',
      body: JSON.stringify({ containerNo, bookingNo }),
    });
  },
  getDashboard: async (): Promise<ShipsGoDashboardData> => {
    return apiRequest<ShipsGoDashboardData>('/shipsgo/dashboard');
  },
  getLiveShipments: async (take: number = 50): Promise<any> => {
    return apiRequest<any>(`/shipsgo/shipments/live?take=${take}`);
  },
  createShipment: async (payload: {
    reference?: string;
    carrier?: string;
    booking_number?: string;
    container_number?: string;
    followers?: string[];
    tags?: string[];
  }): Promise<any> => {
    return apiRequest<any>('/shipsgo/shipments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getGeoJsonRoute: async (shipmentId: string): Promise<any> => {
    return apiRequest<any>(`/shipsgo/shipments/${shipmentId}/geojson`);
  },
};

