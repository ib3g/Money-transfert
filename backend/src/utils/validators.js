import Joi from 'joi';
import { Errors } from './errors.js';

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return next(Errors.VALIDATION(details));
  }
  req.body = value;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return next(Errors.VALIDATION(details));
  }
  req.query = value;
  next();
};

// Schémas réutilisables
export const schemas = {
  id: Joi.string().required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(72).required(),
  totpCode: Joi.string().length(6).pattern(/^\d+$/).required(),
  permission: Joi.string().valid(
    'MANAGE_USERS', 'MANAGE_ZONES', 'MANAGE_RATES',
    'VIEW_ALL_TRANSACTIONS', 'CANCEL_TRANSACTIONS',
    'VIEW_AUDIT_LOGS', 'GENERATE_REPORTS', 'FULL_ADMIN'
  ),
};
