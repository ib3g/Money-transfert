import * as txService from './transactions.service.js';
import { success, created, paginated } from '../../utils/response.js';

export const list = async (req, res, next) => {
  try {
    const result = await txService.listTransactions(req.query, req.user);
    paginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try { success(res, await txService.getTransactionById(req.params.id, req.user)); }
  catch (err) { next(err); }
};

export const getByCode = async (req, res, next) => {
  try { success(res, await txService.getTransactionByCode(req.params.code, req.user)); }
  catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try { created(res, await txService.createTransaction(req.body, req.user)); }
  catch (err) { next(err); }
};

export const confirm = async (req, res, next) => {
  try { success(res, await txService.confirmTransaction(req.params.id, req.user)); }
  catch (err) { next(err); }
};

export const cancel = async (req, res, next) => {
  try { success(res, await txService.cancelTransaction(req.params.id, req.body, req.user)); }
  catch (err) { next(err); }
};
