export type ActiveTab = 'dashboard' | 'shipments' | 'customers' | 'invoices' | 'api_feed' | 'containers' | 'track' | 'documents' | 'doc_config' | 'api_webhooks';

export type DocStatus =
  | 'Not Started'
  | 'Pending'
  | 'Waiting'
  | 'In Attestation'
  | 'Pending Approval'
  | 'Completed'
  | 'Rejected'
  | 'Draft'
  | string;
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
  docs: DocumentItem[];
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

export interface ShipsGoMovement {
  location: string;
  moves: string;
  date: string;
  vessel: string;
  completed: boolean;
}

export interface ShipsGoContainerDetail {
  number: string;
  size: string;
  pod: string;
  podFlag?: string;
  status: string;
  gateOutDate?: string;
  waitingTime?: string;
}

export interface ShipsGoMapWaypoint {
  id: number;
  name: string;
  lat: number;
  lng: number;
  isDestination?: boolean;
}

export interface ContainerTrackingResult {
  shipmentId: string;
  reference: string;
  carrier: {
    scac: string;
    name: string;
  };
  status: string;
  bookingMbl: string;
  containerNo: string;
  creator: {
    date: string;
    email: string;
    company?: string;
  };
  co2Emission: string;
  delayAlert?: {
    originalEta: string;
    delayDays: number;
  } | null;
  transitPercentage: number;
  pol: {
    name: string;
    code: string;
    country: string;
    flag: string;
    dateOfLoading?: string;
  };
  pod: {
    name: string;
    code: string;
    country: string;
    flag: string;
    dateOfDischarge?: string;
  };
  transshipmentCount: number;
  timeAgo: string;
  vessel?: {
    name: string;
    imo?: number;
    voyage?: string;
  };
  movements: ShipsGoMovement[];
  containers: ShipsGoContainerDetail[];
  mapWaypoints: ShipsGoMapWaypoint[];
  liveApiSource: boolean;
}

export interface ShipsGoDashboardItem {
  shipmentId: string;
  containerNo: string;
  reference?: string;
  pol: {
    name: string;
    flag: string;
    date: string;
  };
  pod: {
    name: string;
    flag: string;
    date: string;
  };
  transshipmentCount: number | 'D';
  timeLabel: string;
  containerSize?: string;
  waitingTime?: string;
  gateOutDate?: string;
}

export interface ShipsGoDashboardData {
  latestArrivals: ShipsGoDashboardItem[];
  latestDepartures: ShipsGoDashboardItem[];
  waitingContainersInPod: ShipsGoDashboardItem[];
  latestGateOuts: ShipsGoDashboardItem[];
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
