import cron from 'node-cron';
import { refreshAllRates } from './refreshRates.js';
import { expireTransactions } from './expireTransactions.js';

export function startCronJobs() {
  // Refresh exchange rates — every day at 06:00 UTC
  cron.schedule('0 6 * * *', async () => {
    const ts = new Date().toISOString();
    console.log(`[CRON] Refresh rates — ${ts}`);
    try {
      const result = await refreshAllRates();
      console.log(`[CRON] Rates: ${result.updated} updated, ${result.errors} errors`);
    } catch (err) {
      console.error(`[CRON] Rate refresh failed:`, err.message);
    }
  }, { timezone: 'UTC' });

  // Expire pending transactions — every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const count = await expireTransactions();
      if (count > 0) console.log(`[CRON] Expired ${count} transactions`);
    } catch (err) {
      console.error(`[CRON] Expire transactions failed:`, err.message);
    }
  });

  console.log('[CRON] Jobs scheduled');
}
