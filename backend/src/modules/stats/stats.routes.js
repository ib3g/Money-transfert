import { Router } from 'express';
import * as ctrl from './stats.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/permissions.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('OWNER', 'MANAGER'));

router.get('/summary',      ctrl.summary);
router.get('/by-corridor',  ctrl.byCorridor);

export default router;
