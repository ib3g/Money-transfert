import * as auditService from './audit.service.js';
import { paginated } from '../../utils/response.js';

export const list = async (req, res, next) => {
  try {
    const result = await auditService.listAuditLogs(req.query);
    paginated(res, result.data, result.pagination);
  } catch (e) { next(e); }
};
