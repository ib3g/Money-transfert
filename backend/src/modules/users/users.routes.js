import { Router } from 'express';
import Joi from 'joi';
import * as ctrl from './users.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermission, requireOwner } from '../../middlewares/permissions.js';
import { validate, schemas } from '../../utils/validators.js';

const router = Router();

router.use(authenticate);

const createUserSchema = Joi.object({
  email: schemas.email,
  password: schemas.password,
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  role: Joi.string().valid('MANAGER', 'AGENT').required(),
  zoneIds: Joi.array().items(Joi.string()).default([]),
});

const updateUserSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50),
  lastName: Joi.string().trim().min(1).max(50),
  email: Joi.string().email().lowercase().trim(),
  isActive: Joi.boolean(),
  role: Joi.string().valid('MANAGER', 'AGENT'),
}).min(1);

router.get('/', requirePermission('MANAGE_USERS'), ctrl.list);
router.get('/:id', requirePermission('MANAGE_USERS'), ctrl.getById);

router.post('/',
  requirePermission('MANAGE_USERS'),
  validate(createUserSchema),
  ctrl.create
);

router.patch('/:id',
  requirePermission('MANAGE_USERS'),
  validate(updateUserSchema),
  ctrl.update
);

router.delete('/:id',
  requirePermission('MANAGE_USERS'),
  ctrl.remove
);

router.patch('/:id/permissions',
  requireOwner,
  validate(Joi.object({ permissions: Joi.array().items(schemas.permission).required() })),
  ctrl.updatePermissions
);

router.patch('/:id/password',
  validate(Joi.object({ currentPassword: Joi.string(), newPassword: schemas.password })),
  ctrl.changePassword
);

router.post('/:id/zones',
  requirePermission('MANAGE_USERS'),
  validate(Joi.object({ zoneIds: Joi.array().items(Joi.string()).min(1).required() })),
  ctrl.assignZones
);

router.delete('/:id/zones/:zoneId',
  requirePermission('MANAGE_USERS'),
  ctrl.removeZone
);

export default router;
