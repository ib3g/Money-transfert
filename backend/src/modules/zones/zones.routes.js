import { Router } from 'express';
import Joi from 'joi';
import * as ctrl from './zones.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permissions.js';
import { validate } from '../../utils/validators.js';

const router = Router();
router.use(authenticate);

const createSchema = Joi.object({
  name:     Joi.string().trim().min(2).max(50).required(),
  currency: Joi.string().length(3).uppercase().required(),
});

const updateSchema = Joi.object({
  name:     Joi.string().trim().min(2).max(50),
  currency: Joi.string().length(3).uppercase(),
  isActive: Joi.boolean(),
}).min(1);

router.get('/',    ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/',   requirePermission('MANAGE_ZONES'), validate(createSchema), ctrl.create);
router.patch('/:id', requirePermission('MANAGE_ZONES'), validate(updateSchema), ctrl.update);
router.delete('/:id', requirePermission('MANAGE_ZONES'), ctrl.remove);

export default router;
