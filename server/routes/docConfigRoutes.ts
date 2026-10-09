import { Router } from 'express';
import { DocConfigController } from '../controllers/docConfigController.js';

const router = Router();

router.get('/', DocConfigController.get);
router.put('/', DocConfigController.save);
router.post('/master-docs', DocConfigController.addMasterDoc);
router.put('/master-docs/:id', DocConfigController.updateMasterDoc);
router.delete('/master-docs/:id', DocConfigController.deleteMasterDoc);

export default router;
