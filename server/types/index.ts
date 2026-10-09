/**
 * MERN Architecture Types - Server Side
 * Clear interfaces representing data models across MongoDB / Database and Controller layers.
 */

export type DocStatus = 'Not Started' | 'In Attestation' | 'Pending Approval' | 'Completed';
export type ShipmentStage = 'Documentation' | 'In Transit' | 'Delivered';
export type TradeType = 'Import' | 'Export';

export interface DocumentItem {
  id?: string;
  name: string;
  status: DocStatus;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  requiredDocs: string[];
  docs?: DocumentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  invoice: string;
  customerId: string;
  dest: string;
  status: ShipmentStage;
  tradeType?: TradeType;
  containerNo?: string;
  trackingLink?: string;
  pol?: string;
  etd?: string;
  eta?: string;
  shipsgoReference?: string;
  isShipsGoLinked?: boolean;
  docs: DocumentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  targetId: string;
  targetType: 'shipment' | 'customer' | 'doc_config' | 'system' | 'invoice' | 'tracking';
  details: string;
  timestamp: string;
  user?: string;
  time?: string;
}

export interface AnalyticsSummary {
  totalShipments: number;
  totalCustomers: number;
  inTransit: number;
  documentationStage: number;
  delivered: number;
  arrivingSoon: number;
  totalDocs: number;
  completedDocs: number;
  pendingDocs: number;
  complianceRate: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
