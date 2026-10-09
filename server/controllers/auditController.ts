import { Request, Response } from 'express';
import { AuditLogModel } from '../models/AuditLog.js';
import { APIResponse, AuditLogItem } from '../types/index.js';

export class AuditController {
  static async getAll(req: Request, res: Response<APIResponse<AuditLogItem[]>>) {
    try {
      const logs = await AuditLogModel.find();
      return res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
