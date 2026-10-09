import { apiRequest } from './apiClient';
import { Shipment, DocStatus, ShipmentStage, DocumentItem, TradeType } from '../types';

export const ShipmentService = {
  getAll: async (): Promise<Shipment[]> => {
    return apiRequest<Shipment[]>('/shipments');
  },

  getById: async (id: string): Promise<Shipment> => {
    return apiRequest<Shipment>(`/shipments/${id}`);
  },

  create: async (payload: {
    invoice: string;
    customerId: string;
    dest: string;
    status?: ShipmentStage;
    tradeType?: TradeType;
    containerNo?: string;
    trackingLink?: string;
    etd?: string;
    eta?: string;
    shipsgoReference?: string;
    isShipsGoLinked?: boolean;
    docs?: DocumentItem[];
  }): Promise<Shipment> => {
    return apiRequest<Shipment>('/shipments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, updates: Partial<Shipment>): Promise<Shipment> => {
    return apiRequest<Shipment>(`/shipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  updateDocStatus: async (shipmentId: string, docIndex: number, status: DocStatus): Promise<Shipment> => {
    return apiRequest<Shipment>(`/shipments/${shipmentId}/docs/${docIndex}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  syncDocs: async (shipmentId: string): Promise<Shipment> => {
    return apiRequest<Shipment>(`/shipments/${shipmentId}/sync-docs`, {
      method: 'POST',
    });
  },

  addCustomDoc: async (shipmentId: string, docName: string): Promise<Shipment> => {
    return apiRequest<Shipment>(`/shipments/${shipmentId}/custom-doc`, {
      method: 'POST',
      body: JSON.stringify({ docName }),
    });
  },

  markAllComplete: async (shipmentId: string): Promise<Shipment> => {
    return apiRequest<Shipment>(`/shipments/${shipmentId}/mark-all-completed`, {
      method: 'POST',
    });
  },

  syncShipsGo: async (shipmentId: string): Promise<Shipment> => {
    return apiRequest<Shipment>(`/shipments/${shipmentId}/sync-shipsgo`, {
      method: 'POST',
    });
  },

  syncAllShipsGo: async (): Promise<{ updatedCount: number; shipments: Shipment[] }> => {
    return apiRequest<{ updatedCount: number; shipments: Shipment[] }>('/shipments/sync-all-shipsgo', {
      method: 'POST',
    });
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest<null>(`/shipments/${id}`, {
      method: 'DELETE',
    });
  },
};
