import { Customer, Shipment, DocStatus, AuditLogItem } from '../types/index.js';

export interface MasterDocConfig {
  id: string;
  name: string;
  linkedStatuses: string[];
}

export interface CustomStatusConfig {
  id: string;
  label: string;
  color: 'emerald' | 'amber' | 'sky' | 'rose' | 'purple' | 'slate' | 'indigo';
}

export interface DocConfigsData {
  masterDocs: MasterDocConfig[];
  statuses: CustomStatusConfig[];
}

export interface SchemaDB {
  customers: Customer[];
  shipments: Shipment[];
  auditLogs: AuditLogItem[];
  deletedShipmentIds?: string[];
  docConfigs?: DocConfigsData;
}

export const INITIAL_MASTER_DOCS: MasterDocConfig[] = [];
export const DEFAULT_STATUS_CONFIGS: CustomStatusConfig[] = [];

// In-memory runtime store used only when running in memory or when Mongo is not configured
const initialData: SchemaDB = {
  customers: [],
  shipments: [],
  auditLogs: [],
  deletedShipmentIds: [],
  docConfigs: {
    masterDocs: [],
    statuses: []
  }
};

let dbCache: SchemaDB = {
  customers: [],
  shipments: [],
  auditLogs: [],
  deletedShipmentIds: [],
  docConfigs: {
    masterDocs: [],
    statuses: []
  }
};

export function loadDatabase(forceReload: boolean = false): SchemaDB {
  if (!dbCache.deletedShipmentIds) {
    dbCache.deletedShipmentIds = [];
  }
  if (!dbCache.docConfigs) {
    dbCache.docConfigs = {
      masterDocs: [],
      statuses: []
    };
  }
  return dbCache;
}

export function saveDatabase(data: SchemaDB): void {
  dbCache = data;
}
