import { Router } from 'express';
import * as ctrl from './audit.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permissions.js';

const router = Router();
router.use(authenticate);
router.use(requirePermission('VIEW_AUDIT_LOGS'));

router.get('/', ctrl.list);

export default router;
