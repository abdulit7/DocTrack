import { Request, Response } from 'express';
import { DocConfigModel } from '../models/DocConfig.js';
import { APIResponse } from '../types/index.js';
import { DocConfigsData } from '../database/db.js';

export class DocConfigController {
  static async get(req: Request, res: Response<APIResponse<DocConfigsData>>) {
    try {
      const data = await DocConfigModel.get();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async save(req: Request, res: Response<APIResponse<DocConfigsData>>) {
    try {
      const data = await DocConfigModel.save(req.body);
      return res.status(200).json({ success: true, data, message: 'Doc configurations saved successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async addMasterDoc(req: Request, res: Response<APIResponse<DocConfigsData>>) {
    try {
      const { name, linkedStatuses } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Document name is required' });
      }
      const data = await DocConfigModel.addMasterDoc({ name, linkedStatuses });
      return res.status(201).json({ success: true, data, message: 'Master document added to database' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateMasterDoc(req: Request, res: Response<APIResponse<DocConfigsData>>) {
    try {
      const { id } = req.params;
      const data = await DocConfigModel.updateMasterDoc(id, req.body);
      return res.status(200).json({ success: true, data, message: 'Master document updated in database' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteMasterDoc(req: Request, res: Response<APIResponse<DocConfigsData>>) {
    try {
      const { id } = req.params;
      const data = await DocConfigModel.deleteMasterDoc(id);
      return res.status(200).json({ success: true, data, message: 'Master document deleted from database' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
