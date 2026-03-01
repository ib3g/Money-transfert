import * as zonesService from './zones.service.js';
import { success, created } from '../../utils/response.js';

export const list   = async (req, res, next) => { try { success(res, await zonesService.listZones(req.user)); } catch (e) { next(e); } };
export const getById= async (req, res, next) => { try { success(res, await zonesService.getZoneById(req.params.id)); } catch (e) { next(e); } };
export const create = async (req, res, next) => { try { created(res, await zonesService.createZone(req.body, req.user)); } catch (e) { next(e); } };
export const update = async (req, res, next) => { try { success(res, await zonesService.updateZone(req.params.id, req.body, req.user)); } catch (e) { next(e); } };
export const remove = async (req, res, next) => { try { success(res, await zonesService.deleteZone(req.params.id, req.user)); } catch (e) { next(e); } };
