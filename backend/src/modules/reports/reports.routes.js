import { Router } from 'express';
import * as ctrl from './reports.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permissions.js';

const router = Router();
router.use(authenticate);
router.use(requirePermission('GENERATE_REPORTS'));

router.get('/transactions',   ctrl.downloadTransactions);
router.get('/corridors',      ctrl.downloadCorridors);

export default router;
