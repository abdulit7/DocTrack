import { loadDatabase, saveDatabase, DocConfigsData, MasterDocConfig, CustomStatusConfig } from '../database/db.js';
import { AuditLogModel } from './AuditLog.js';
import { MongoDocConfig, isMongoActive } from '../database/mongo.js';

export class DocConfigModel {
  static async get(): Promise<DocConfigsData> {
    if (isMongoActive()) {
      try {
        const mongoData = await (MongoDocConfig as any).findOne({ key: 'global' }).lean();
        if (mongoData) {
          const mongoMasterDocs: MasterDocConfig[] = (mongoData.masterDocs || []).map((m: any) => ({
            id: m.id,
            name: m.name,
            linkedStatuses: m.linkedStatuses || []
          }));
          const mongoStatuses: CustomStatusConfig[] = (mongoData.statuses || []).map((s: any) => ({
            id: s.id,
            label: s.label,
            color: s.color || 'amber'
          }));

          return {
            masterDocs: mongoMasterDocs,
            statuses: mongoStatuses
          };
        }
      } catch (err) {
        console.warn('[DocConfigModel] Error reading from Mongo:', err);
      }
    }

    const db = loadDatabase();
    if (!db.docConfigs) {
      db.docConfigs = {
        masterDocs: [],
        statuses: []
      };
      saveDatabase(db);
    }
    return db.docConfigs;
  }

  static async save(data: Partial<DocConfigsData>): Promise<DocConfigsData> {
    const db = loadDatabase();
    const current = db.docConfigs || {
      masterDocs: [],
      statuses: []
    };

    db.docConfigs = {
      masterDocs: Array.isArray(data.masterDocs) ? data.masterDocs : current.masterDocs,
      statuses: Array.isArray(data.statuses) ? data.statuses : current.statuses
    };

    saveDatabase(db);

    if (isMongoActive()) {
      try {
        await (MongoDocConfig as any).findOneAndUpdate(
          { key: 'global' },
          {
            key: 'global',
            masterDocs: db.docConfigs.masterDocs,
            statuses: db.docConfigs.statuses
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('[DocConfigModel] Error writing to Mongo:', err);
      }
    }

    await AuditLogModel.create({
      action: 'Doc Master Config Updated',
      targetId: 'doc_configs',
      targetType: 'doc_config',
      details: `Updated doc master types count: ${db.docConfigs.masterDocs.length}, statuses count: ${db.docConfigs.statuses.length}`
    });

    return db.docConfigs;
  }

  static async addMasterDoc(doc: { name: string; linkedStatuses?: string[] }): Promise<DocConfigsData> {
    const db = loadDatabase();
    const current = db.docConfigs || { masterDocs: [], statuses: [] };
    const trimmed = doc.name.trim();

    let targetDocId = '';
    const existingIndex = current.masterDocs.findIndex(d => d.name.toLowerCase() === trimmed.toLowerCase());
    if (existingIndex >= 0) {
      targetDocId = current.masterDocs[existingIndex].id;
      if (doc.linkedStatuses && doc.linkedStatuses.length > 0) {
        current.masterDocs[existingIndex].linkedStatuses = Array.from(
          new Set([...(current.masterDocs[existingIndex].linkedStatuses || []), ...doc.linkedStatuses])
        );
      }
    } else {
      const newDoc: MasterDocConfig = {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmed,
        linkedStatuses: doc.linkedStatuses && doc.linkedStatuses.length > 0 ? doc.linkedStatuses : ['Not Started', 'Completed']
      };
      targetDocId = newDoc.id;
      current.masterDocs.unshift(newDoc);
    }

    db.docConfigs = current;
    saveDatabase(db);

    if (isMongoActive()) {
      try {
        await (MongoDocConfig as any).findOneAndUpdate(
          { key: 'global' },
          {
            key: 'global',
            masterDocs: current.masterDocs,
            statuses: current.statuses
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('[DocConfigModel] Error writing to Mongo:', err);
      }
    }

    await AuditLogModel.create({
      action: 'Master Document Type Saved',
      targetId: targetDocId || 'doc_config',
      targetType: 'doc_config',
      details: `Saved master document type "${trimmed}" in database`
    });

    return current;
  }

  static async updateMasterDoc(id: string, doc: { name?: string; linkedStatuses?: string[] }): Promise<DocConfigsData> {
    const db = loadDatabase();
    const current = db.docConfigs || { masterDocs: [], statuses: [] };

    current.masterDocs = current.masterDocs.map(d => {
      if (d.id === id) {
        return {
          ...d,
          name: doc.name ? doc.name.trim() : d.name,
          linkedStatuses: doc.linkedStatuses || d.linkedStatuses
        };
      }
      return d;
    });

    db.docConfigs = current;
    saveDatabase(db);

    if (isMongoActive()) {
      try {
        await (MongoDocConfig as any).findOneAndUpdate(
          { key: 'global' },
          {
            key: 'global',
            masterDocs: current.masterDocs,
            statuses: current.statuses
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('[DocConfigModel] Error writing to Mongo:', err);
      }
    }

    return current;
  }

  static async deleteMasterDoc(id: string): Promise<DocConfigsData> {
    const db = loadDatabase();
    const current = db.docConfigs || { masterDocs: [], statuses: [] };

    current.masterDocs = current.masterDocs.filter(d => d.id !== id);
    db.docConfigs = current;
    saveDatabase(db);

    if (isMongoActive()) {
      try {
        await (MongoDocConfig as any).findOneAndUpdate(
          { key: 'global' },
          {
            key: 'global',
            masterDocs: current.masterDocs,
            statuses: current.statuses
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('[DocConfigModel] Error writing to Mongo:', err);
      }
    }

    return current;
  }
}
