import * as authService from './auth.service.js';
import { success, created } from '../../utils/response.js';

export const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    success(res, result);
  } catch (err) { next(err); }
};

export const verifyTotp = async (req, res, next) => {
  try {
    const result = await authService.verifyTotp(req.body);
    success(res, result);
  } catch (err) { next(err); }
};

export const refresh = async (req, res, next) => {
  try {
    const result = await authService.refreshToken(req.body.refreshToken);
    success(res, result);
  } catch (err) { next(err); }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id, req.body.refreshToken);
    success(res, { message: 'Déconnecté' });
  } catch (err) { next(err); }
};

export const me = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    success(res, user);
  } catch (err) { next(err); }
};

export const setupTotp = async (req, res, next) => {
  try {
    const result = await authService.setupTotp(req.user.id);
    success(res, result);
  } catch (err) { next(err); }
};

export const confirmTotp = async (req, res, next) => {
  try {
    await authService.confirmTotp(req.user.id, req.body.code);
    success(res, { message: 'A2F activée avec succès' });
  } catch (err) { next(err); }
};
