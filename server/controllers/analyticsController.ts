import { Request, Response } from 'express';
import { ShipmentModel } from '../models/Shipment.js';
import { CustomerModel } from '../models/Customer.js';
import { APIResponse, AnalyticsSummary } from '../types/index.js';

export class AnalyticsController {
  static async getSummary(req: Request, res: Response<APIResponse<AnalyticsSummary>>) {
    try {
      const shipments = await ShipmentModel.find();
      const customers = await CustomerModel.find();

      const totalShipments = shipments.length;
      const totalCustomers = customers.length;

      let inTransit = 0;
      let documentationStage = 0;
      let delivered = 0;
      let arrivingSoon = 0;
      let totalDocs = 0;
      let completedDocs = 0;
      let pendingDocs = 0;

      const now = new Date();

      shipments.forEach(s => {
        if (s.status === 'In Transit') inTransit++;
        else if (s.status === 'Documentation') documentationStage++;
        else if (s.status === 'Delivered') delivered++;

        if (s.eta) {
          const etaDate = new Date(s.eta);
          const diffDays = (etaDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
          if (diffDays >= 0 && diffDays <= 7) {
            arrivingSoon++;
          }
        }

        s.docs.forEach(d => {
          totalDocs++;
          if (d.status === 'Completed') completedDocs++;
          else pendingDocs++;
        });
      });

      const complianceRate = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 100;

      const summary: AnalyticsSummary = {
        totalShipments,
        totalCustomers,
        inTransit,
        documentationStage,
        delivered,
        arrivingSoon,
        totalDocs,
        completedDocs,
        pendingDocs,
        complianceRate
      };

      return res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
