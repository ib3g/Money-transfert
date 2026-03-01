import { Router } from 'express';
import Joi from 'joi';
import * as ctrl from './transactions.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/permissions.js';
import { validate, validateQuery } from '../../utils/validators.js';
import { transactionLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();
router.use(authenticate);

const createSchema = Joi.object({
  sourceAmount:  Joi.number().integer().positive().max(100_000_00).required(),
  sourceZoneId:  Joi.string().required(),
  destZoneId:    Joi.string().required(),
  recipientName: Joi.string().trim().min(2).max(100).required(),
});

const cancelSchema = Joi.object({
  cancelReason: Joi.string().trim().min(2).max(255).required(),
});

const listQuerySchema = Joi.object({
  status:       Joi.string().valid('PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED'),
  sourceZoneId: Joi.string(),
  destZoneId:   Joi.string(),
  agentId:      Joi.string(),
  from:         Joi.date().iso(),
  to:           Joi.date().iso(),
  page:         Joi.number().integer().min(1).default(1),
  limit:        Joi.number().integer().min(1).max(100).default(20),
});

router.get('/',              validateQuery(listQuerySchema), ctrl.list);
router.get('/code/:code',    ctrl.getByCode);
router.get('/:id',           ctrl.getById);

router.post('/',
  transactionLimiter,
  requireRole('AGENT', 'MANAGER', 'OWNER'),
  validate(createSchema),
  ctrl.create
);

router.patch('/:id/confirm',
  requireRole('AGENT', 'MANAGER', 'OWNER'),
  ctrl.confirm
);

router.patch('/:id/cancel',
  validate(cancelSchema),
  ctrl.cancel
);

export default router;
