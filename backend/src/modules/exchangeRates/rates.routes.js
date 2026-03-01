import { Router } from 'express';
import Joi from 'joi';
import * as ctrl from './rates.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermission, requireOwner } from '../../middlewares/permissions.js';
import { validate } from '../../utils/validators.js';

const router = Router();
router.use(authenticate);

const manualRateSchema = Joi.object({
  sourceZoneId: Joi.string().required(),
  destZoneId:   Joi.string().required(),
  rate:         Joi.number().positive().required(),
});

router.get('/',                                     ctrl.list);
router.get('/corridor/:sourceZoneId/:destZoneId',   ctrl.corridor);
router.post('/manual',  requirePermission('MANAGE_RATES'), validate(manualRateSchema), ctrl.setManual);
router.delete('/manual/:sourceZoneId/:destZoneId',  requirePermission('MANAGE_RATES'), ctrl.deleteManual);
router.get('/history/:sourceZoneId/:destZoneId',    requirePermission('MANAGE_RATES'), ctrl.history);
router.post('/refresh', requireOwner, ctrl.forceRefresh);

export default router;
