import { Request, Response } from 'express';
import { ShipmentModel } from '../models/Shipment.js';
import { APIResponse, Shipment, DocStatus } from '../types/index.js';

/**
 * Controller: Shipment
 * Handles HTTP operations for export shipments, logistics tracking, and attestation statuses.
 */

export class ShipmentController {
  // GET /api/shipments
  static async getAll(req: Request, res: Response<APIResponse<Shipment[]>>) {
    try {
      const shipments = await ShipmentModel.find();
      return res.status(200).json({ success: true, data: shipments });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch shipments' });
    }
  }

  // GET /api/shipments/:id
  static async getById(req: Request, res: Response<APIResponse<Shipment>>) {
    try {
      const shipment = await ShipmentModel.findById(req.params.id);
      if (!shipment) {
        return res.status(404).json({ success: false, error: 'Shipment not found' });
      }
      return res.status(200).json({ success: true, data: shipment });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/shipments
  static async create(req: Request, res: Response<APIResponse<Shipment>>) {
    try {
      const { invoice, customerId, dest, status, tradeType, containerNo, trackingLink, etd, eta, docs, shipsgoReference, isShipsGoLinked } = req.body;
      if (!invoice || !invoice.trim()) {
        return res.status(400).json({ success: false, error: 'Invoice number is required' });
      }
      const shipment = await ShipmentModel.create({
        invoice: invoice.trim(),
        customerId: customerId || 'general',
        dest: dest || '—',
        status,
        tradeType: tradeType === 'Import' || tradeType === 'Export' ? tradeType : 'Export',
        containerNo,
        trackingLink,
        etd,
        eta,
        shipsgoReference,
        isShipsGoLinked,
        docs
      });

      return res.status(201).json({ success: true, data: shipment, message: 'Shipment created successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // PUT /api/shipments/:id
  static async update(req: Request, res: Response<APIResponse<Shipment>>) {
    try {
      const updated = await ShipmentModel.findByIdAndUpdate(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Shipment not found' });
      }
      return res.status(200).json({ success: true, data: updated, message: 'Shipment updated successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // PATCH /api/shipments/:id/docs/:index
  static async updateDocStatus(req: Request, res: Response<APIResponse<Shipment>>) {
    try {
      const { id, index } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'Document status is required' });
      }

      const updated = await ShipmentModel.updateDocStatus(id, parseInt(index, 10), status as DocStatus);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Shipment or document not found' });
      }

      return res.status(200).json({ success: true, data: updated, message: 'Document status updated' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/shipments/:id/sync-docs
  static async syncDocs(req: Request, res: Response<APIResponse<Shipment>>) {
    try {
      const updated = await ShipmentModel.syncDocsWithCustomer(req.params.id);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Shipment not found' });
      }
      return res.status(200).json({ success: true, data: updated, message: 'Shipment docs synced with customer requirements' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/shipments/:id/custom-doc
  static async addCustomDoc(req: Request, res: Response<APIResponse<Shipment>>) {
    try {
      const { id } = req.params;
      const { docName } = req.body;

      if (!docName || !docName.trim()) {
        return res.status(400).json({ success: false, error: 'Document name is required' });
      }

      const updated = await ShipmentModel.addCustomDoc(id, docName.trim());
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Shipment not found' });
      }

      return res.status(200).json({ success: true, data: updated, message: 'Custom document added' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/shipments/:id/mark-all-completed
  static async markAllComplete(req: Request, res: Response<APIResponse<Shipment>>) {
    try {
      const { id } = req.params;
      const updated = await ShipmentModel.markAllDocsComplete(id);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Shipment not found' });
      }

      return res.status(200).json({ success: true, data: updated, message: 'All documents marked as completed' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/shipments/:id/sync-shipsgo
  static async syncShipsGo(req: Request, res: Response<APIResponse<Shipment>>) {
    try {
      const { id } = req.params;
      const updated = await ShipmentModel.syncSingleShipmentFromShipsGo(id);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Shipment not found' });
      }

      return res.status(200).json({ success: true, data: updated, message: 'ShipsGo dates synced successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/shipments/sync-all-shipsgo
  static async syncAllShipsGo(req: Request, res: Response<APIResponse<{ updatedCount: number; shipments: Shipment[] }>>) {
    try {
      const result = await ShipmentModel.syncAllLinkedShipmentsFromShipsGo();
      return res.status(200).json({ success: true, data: result, message: `Synced ${result.updatedCount} linked invoices with ShipsGo` });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // DELETE /api/shipments/:id
  static async delete(req: Request, res: Response<APIResponse<null>>) {
    try {
      const { id } = req.params;
      if (!id || !id.trim()) {
        return res.status(400).json({ success: false, error: 'Shipment ID is required' });
      }
      await ShipmentModel.findByIdAndDelete(id.trim());
      return res.status(200).json({ success: true, message: 'Shipment deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to delete shipment' });
    }
  }
}
