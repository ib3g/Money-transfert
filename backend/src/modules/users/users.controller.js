import * as usersService from './users.service.js';
import { success, created, noContent } from '../../utils/response.js';

export const list = async (req, res, next) => {
  try {
    const users = await usersService.listUsers(req.user);
    success(res, users);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id, req.user);
    success(res, user);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const user = await usersService.createUser(req.body, req.user);
    created(res, user);
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const user = await usersService.updateUser(req.params.id, req.body, req.user);
    success(res, user);
  } catch (err) { next(err); }
};

export const deactivate = async (req, res, next) => {
  try {
    await usersService.deactivateUser(req.params.id, req.user);
    noContent(res);
  } catch (err) { next(err); }
};

export const updatePermissions = async (req, res, next) => {
  try {
    const user = await usersService.updatePermissions(req.params.id, req.body.permissions, req.user);
    success(res, user);
  } catch (err) { next(err); }
};

export const changePassword = async (req, res, next) => {
  try {
    await usersService.changePassword(req.params.id, req.body, req.user);
    success(res, { message: 'Mot de passe mis à jour' });
  } catch (err) { next(err); }
};

export const assignZones = async (req, res, next) => {
  try {
    await usersService.assignZones(req.params.id, req.body.zoneIds, req.user);
    success(res, { message: 'Zones assignées' });
  } catch (err) { next(err); }
};

export const removeZone = async (req, res, next) => {
  try {
    await usersService.removeZone(req.params.id, req.params.zoneId, req.user);
    noContent(res);
  } catch (err) { next(err); }
};
