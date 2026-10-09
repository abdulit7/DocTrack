import { loadDatabase, saveDatabase } from '../database/db.js';
import { isMongoActive, MongoCustomer, MongoShipment } from '../database/mongo.js';
import { AuditLogModel } from './AuditLog.js';
import { Customer, DocumentItem, DocStatus } from '../types/index.js';

/**
 * MERN Model: Customer
 * Directly accesses MongoDB database when connected, or in-memory runtime store.
 */

export class CustomerModel {
  static async find(): Promise<Customer[]> {
    if (isMongoActive()) {
      try {
        const mongoDocs = await (MongoCustomer as any).find({}).lean();
        return mongoDocs.map((doc: any) => {
          const { _id, __v, ...rest } = doc;
          return rest as Customer;
        });
      } catch (err) {
        console.error('[CustomerModel] Mongo find error:', err);
      }
    }
    const db = loadDatabase();
    return db.customers;
  }

  static async findById(id: string): Promise<Customer | null> {
    if (isMongoActive()) {
      try {
        const doc = await (MongoCustomer as any).findOne({ id }).lean();
        if (doc) {
          const { _id, __v, ...rest } = doc as any;
          return rest as Customer;
        }
        return null;
      } catch (err) {
        console.error('[CustomerModel] Mongo findById error:', err);
      }
    }
    const db = loadDatabase();
    return db.customers.find(c => c.id === id) || null;
  }

  static async create(payload: {
    name: string;
    requiredDocs?: string[];
    docs?: DocumentItem[];
  }): Promise<Customer> {
    const finalRequiredDocs = payload.requiredDocs ?? (payload.docs ? payload.docs.map(d => d.name) : []);
    const finalDocs = payload.docs ?? finalRequiredDocs.map(name => ({
      name,
      status: 'Not Started' as DocStatus
    }));

    const newCustomer: Customer = {
      id: 'cu_' + Math.random().toString(36).slice(2, 10),
      name: payload.name,
      requiredDocs: finalRequiredDocs,
      docs: finalDocs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMongoActive()) {
      try {
        await (MongoCustomer as any).create(newCustomer);
      } catch (err) {
        console.error('[CustomerModel] Mongo create error:', err);
      }
    }

    const db = loadDatabase();
    db.customers.unshift(newCustomer);
    saveDatabase(db);

    await AuditLogModel.create({
      action: 'Customer Created',
      targetId: newCustomer.id,
      targetType: 'customer',
      details: `Created customer profile "${newCustomer.name}" with ${newCustomer.requiredDocs.length} required compliance documents`
    });

    return newCustomer;
  }

  static async findByIdAndUpdate(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    let baseCustomer: Customer | null = null;
    if (isMongoActive()) {
      try {
        const updatedDoc = await (MongoCustomer as any).findOneAndUpdate(
          { id },
          { ...updates, updatedAt: new Date().toISOString() },
          { upsert: true, returnDocument: 'after' }
        ).lean();
        if (updatedDoc) {
          const { _id, __v, ...rest } = updatedDoc;
          baseCustomer = rest as Customer;
        }
      } catch (err) {
        console.error('[CustomerModel] Mongo findByIdAndUpdate error:', err);
      }
    }

    const db = loadDatabase();
    const index = db.customers.findIndex(c => c.id === id);
    if (!baseCustomer && index !== -1) {
      baseCustomer = db.customers[index];
    }

    const updated: Customer = {
      ...(baseCustomer || {
        id,
        name: updates.name || 'Customer',
        requiredDocs: updates.requiredDocs || [],
        docs: updates.docs || [],
        createdAt: new Date().toISOString()
      }),
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (index !== -1) {
      db.customers[index] = updated;
    } else {
      db.customers.unshift(updated);
    }
    saveDatabase(db);

    await AuditLogModel.create({
      action: 'Customer Updated',
      targetId: id,
      targetType: 'customer',
      details: `Updated customer "${updated.name}" (${updated.requiredDocs?.length || 0} required docs)`
    });

    return updated;
  }

  static async findByIdAndDelete(id: string): Promise<boolean> {
    let customerName = id;
    if (isMongoActive()) {
      try {
        const cust = await (MongoCustomer as any).findOne({ id }).lean();
        if (cust) customerName = cust.name || id;
        await (MongoCustomer as any).deleteOne({ id });
        await (MongoShipment as any).deleteMany({ customerId: id });
      } catch (err) {
        console.error('[CustomerModel] Mongo findByIdAndDelete error:', err);
      }
    }

    const db = loadDatabase();
    const existing = db.customers.find(c => c.id === id);
    if (existing) customerName = existing.name;

    const initialLen = db.customers.length;
    db.customers = db.customers.filter(c => c.id !== id);
    db.shipments = db.shipments.filter(s => s.customerId !== id);
    
    saveDatabase(db);

    await AuditLogModel.create({
      action: 'Customer Deleted',
      targetId: id,
      targetType: 'customer',
      details: `Deleted customer profile "${customerName}" and linked shipments`
    });

    return true;
  }
}

