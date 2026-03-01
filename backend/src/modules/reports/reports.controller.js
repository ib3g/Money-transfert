import * as reportsService from './reports.service.js';

export const downloadTransactions = async (req, res, next) => {
  try {
    const buffer = await reportsService.generateTransactionReport(req.query);
    const filename = `releve-${req.query.from ?? 'all'}-${req.query.to ?? 'now'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) { next(err); }
};

export const downloadCorridors = async (req, res, next) => {
  try {
    const buffer = await reportsService.generateCorridorReport(req.query);
    const filename = `corridors-${req.query.from ?? 'all'}-${req.query.to ?? 'now'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) { next(err); }
};
