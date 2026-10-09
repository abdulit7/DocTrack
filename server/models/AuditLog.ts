import { loadDatabase, saveDatabase } from '../database/db.js';
import { isMongoActive, MongoAuditLog } from '../database/mongo.js';
import { AuditLogItem } from '../types/index.js';

export class AuditLogModel {
  static async find(): Promise<AuditLogItem[]> {
    let logs: AuditLogItem[] = [];
    if (isMongoActive()) {
      try {
        const mongoDocs = await (MongoAuditLog as any).find({}).sort({ timestamp: -1 }).limit(100).lean();
        logs = mongoDocs.map((doc: any) => {
          const { _id, __v, ...rest } = doc;
          return {
            ...rest,
            time: rest.time || (rest.timestamp ? new Date(rest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'),
            user: rest.user || 'Admin'
          } as AuditLogItem;
        });
      } catch (err) {
        console.error('[AuditLogModel] Mongo find error:', err);
      }
    }

    if (logs.length === 0) {
      const db = loadDatabase();
      logs = (db.auditLogs || []).map(l => ({
        ...l,
        time: l.time || (l.timestamp ? new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'),
        user: l.user || 'Admin'
      }));
    }

    // If completely empty on fresh instance, seed initial workspace event
    if (logs.length === 0) {
      const initLog = await AuditLogModel.create({
        action: 'System Initialized',
        targetId: 'WORKSPACE',
        targetType: 'system',
        details: 'ShipsGo DocTrack audit logging & compliance engine active and monitoring',
        user: 'System Admin'
      });
      return [initLog];
    }

    return logs;
  }

  static async create(payload: {
    action: string;
    targetId: string;
    targetType: 'shipment' | 'customer' | 'doc_config' | 'system' | 'invoice' | 'tracking';
    details: string;
    user?: string;
  }): Promise<AuditLogItem> {
    const now = new Date();
    const newLog: AuditLogItem = {
      id: 'log_' + Math.random().toString(36).slice(2, 10),
      action: payload.action,
      targetId: payload.targetId || 'system',
      targetType: payload.targetType || 'system',
      details: payload.details,
      timestamp: now.toISOString(),
      user: payload.user || 'System Operator',
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (isMongoActive()) {
      try {
        await (MongoAuditLog as any).create(newLog);
      } catch (err) {
        console.error('[AuditLogModel] Mongo create error:', err);
      }
    }

    const db = loadDatabase();
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(newLog);
    if (db.auditLogs.length > 200) {
      db.auditLogs = db.auditLogs.slice(0, 200);
    }
    saveDatabase(db);

    return newLog;
  }
}

