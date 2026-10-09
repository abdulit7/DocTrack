import { Router } from 'express';
import { AuditController } from '../controllers/auditController.js';

const router = Router();
router.get('/', AuditController.getAll);

export default router;
