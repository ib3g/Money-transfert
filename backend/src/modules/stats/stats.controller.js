import * as statsService from './stats.service.js';
import { success } from '../../utils/response.js';

export const summary     = async (req, res, next) => { try { success(res, await statsService.getSummary(req.query, req.user)); } catch (e) { next(e); } };
export const byCorridor  = async (req, res, next) => { try { success(res, await statsService.getByCorridor(req.query, req.user)); } catch (e) { next(e); } };
