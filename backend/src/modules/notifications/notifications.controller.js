import * as service from './notifications.service.js';
import { success, paginated } from '../../utils/response.js';

export const list = async (req, res, next) => {
  try {
    const result = await service.listNotifications(req.user.id, parseInt(req.query.page ?? '1', 10));
    paginated(res, result.data, result.pagination);
  } catch (e) { next(e); }
};

export const unreadCount = async (req, res, next) => {
  try { success(res, await service.getUnreadCount(req.user.id)); }
  catch (e) { next(e); }
};

export const markRead = async (req, res, next) => {
  try { await service.markRead(req.params.id, req.user.id); success(res, { message: 'Lu' }); }
  catch (e) { next(e); }
};

export const markAllRead = async (req, res, next) => {
  try { await service.markAllRead(req.user.id); success(res, { message: 'Tout lu' }); }
  catch (e) { next(e); }
};
