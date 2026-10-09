import { Router } from 'express';
import { ShipmentController } from '../controllers/shipmentController.js';

const router = Router();

router.get('/', ShipmentController.getAll);
router.post('/sync-all-shipsgo', ShipmentController.syncAllShipsGo);
router.get('/:id', ShipmentController.getById);
router.post('/', ShipmentController.create);
router.put('/:id', ShipmentController.update);
router.patch('/:id/docs/:index', ShipmentController.updateDocStatus);
router.post('/:id/custom-doc', ShipmentController.addCustomDoc);
router.post('/:id/mark-all-completed', ShipmentController.markAllComplete);
router.post('/:id/sync-docs', ShipmentController.syncDocs);
router.post('/:id/sync-shipsgo', ShipmentController.syncShipsGo);
router.delete('/:id', ShipmentController.delete);

export default router;
