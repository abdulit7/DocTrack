import { Router } from 'express';
import { ShipsGoController } from '../controllers/shipsgoController.js';

const router = Router();
router.get('/settings', ShipsGoController.getSettings);
router.post('/settings', ShipsGoController.updateSettings);
router.post('/track', ShipsGoController.trackContainer);
router.get('/dashboard', ShipsGoController.getDashboard);
router.get('/shipments/live', ShipsGoController.getLiveShipments);
router.post('/shipments', ShipsGoController.createShipment);
router.post('/webhook', ShipsGoController.handleWebhook);
router.get('/shipments/:shipmentId/geojson', ShipsGoController.getGeoJsonRoute);

export default router;
