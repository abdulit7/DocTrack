import mongoose, { Schema } from 'mongoose';
import { Customer, Shipment, AuditLogItem } from '../types/index.js';
import { loadDatabase, saveDatabase } from './db.js';

let isConnecting = false;
let isConnected = false;

// Mongoose Schemas
const DocumentItemSchema = new Schema({
  name: { type: String, required: true },
  status: { type: String, required: true, default: 'Not Started' },
  notes: { type: String, default: '' },
  updatedAt: { type: String }
}, { _id: false });

const CustomerSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  requiredDocs: [{ type: String }],
  docs: [DocumentItemSchema],
  createdAt: { type: String },
  updatedAt: { type: String }
});

const ShipmentSchema = new Schema({
  id: { type: String, required: true, unique: true },
  invoice: { type: String, required: true },
  customerId: { type: String, required: true },
  dest: { type: String, required: true },
  status: { type: String, required: true },
  tradeType: { type: String, enum: ['Import', 'Export'], default: 'Export' },
  containerNo: { type: String },
  trackingLink: { type: String },
  pol: { type: String },
  etd: { type: String },
  eta: { type: String },
  shipsgoReference: { type: String },
  isShipsGoLinked: { type: Boolean },
  docs: [DocumentItemSchema],
  createdAt: { type: String },
  updatedAt: { type: String }
});

const AuditLogSchema = new Schema({
  id: { type: String, required: true, unique: true },
  action: { type: String, required: true },
  targetId: { type: String, required: true },
  targetType: { type: String, required: true },
  details: { type: String, required: true },
  timestamp: { type: String, required: true },
  user: { type: String },
  time: { type: String }
});

const MasterDocConfigSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  linkedStatuses: [{ type: String }]
}, { _id: false });

const CustomStatusConfigSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  color: { type: String }
}, { _id: false });

const DocConfigSchema = new Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  masterDocs: [MasterDocConfigSchema],
  statuses: [CustomStatusConfigSchema]
});

const DeletedShipmentSchema = new Schema({
  targetId: { type: String, required: true, unique: true },
  deletedAt: { type: String, default: () => new Date().toISOString() }
});

export const MongoCustomer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
export const MongoShipment = mongoose.models.Shipment || mongoose.model('Shipment', ShipmentSchema);
export const MongoAuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export const MongoDocConfig = mongoose.models.DocConfig || mongoose.model('DocConfig', DocConfigSchema);
export const MongoDeletedShipment = mongoose.models.DeletedShipment || mongoose.model('DeletedShipment', DeletedShipmentSchema);

export async function initMongoDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[MongoDB] MONGODB_URI variable not provided. Using in-memory runtime store.');
    return false;
  }

  if (isConnected) return true;
  if (isConnecting) return false;

  try {
    isConnecting = true;
    console.log('[MongoDB] Connecting to MongoDB instance...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    isConnecting = false;
    console.log('[MongoDB] Successfully connected to MongoDB. Existing database records are preserved.');

    return true;
  } catch (err: any) {
    isConnecting = false;
    isConnected = false;
    console.warn('[MongoDB] Connection failed, using fallback database:', err.message || err);
    return false;
  }
}

export function isMongoActive(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
