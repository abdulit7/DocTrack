import { Router } from 'express';
import customerRoutes from './customerRoutes.js';
import shipmentRoutes from './shipmentRoutes.js';
import auditRoutes from './auditRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import shipsgoRoutes from './shipsgoRoutes.js';
import docConfigRoutes from './docConfigRoutes.js';

const router = Router();

router.use('/customers', customerRoutes);
router.use('/shipments', shipmentRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/shipsgo', shipsgoRoutes);
router.use('/doc-configs', docConfigRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Export Manifest API', timestamp: new Date().toISOString() });
});

export default router;
