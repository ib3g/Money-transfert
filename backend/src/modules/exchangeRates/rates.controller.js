import * as ratesService from './rates.service.js';
import { success, created } from '../../utils/response.js';

export const list          = async (req, res, next) => { try { success(res, await ratesService.listRates()); } catch (e) { next(e); } };
export const corridor      = async (req, res, next) => { try { success(res, await ratesService.getCorridorRate(req.params.sourceZoneId, req.params.destZoneId)); } catch (e) { next(e); } };
export const setManual     = async (req, res, next) => { try { created(res, await ratesService.setManualRate(req.body, req.user)); } catch (e) { next(e); } };
export const deleteManual  = async (req, res, next) => { try { await ratesService.deleteManualRate(req.params.sourceZoneId, req.params.destZoneId, req.user); success(res, { message: 'Override supprimé' }); } catch (e) { next(e); } };
export const history       = async (req, res, next) => { try { success(res, await ratesService.getRateHistory(req.params.sourceZoneId, req.params.destZoneId)); } catch (e) { next(e); } };
export const forceRefresh  = async (req, res, next) => { try { success(res, await ratesService.forceRefresh(req.user)); } catch (e) { next(e); } };
