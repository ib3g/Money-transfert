import { prisma } from '../config/database.js';
import { env } from '../config/env.js';

export async function fetchRateFromAPI(fromCurrency, toCurrency) {
  const url = `${env.exchangeRate.baseUrl}/${env.exchangeRate.apiKey}/pair/${fromCurrency}/${toCurrency}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`ExchangeRate API error: ${res.status}`);
  const data = await res.json();
  if (data.result !== 'success') throw new Error(`API error: ${data['error-type']}`);
  return data.conversion_rate;
}

export async function refreshAllRates() {
  // Get all active zones
  const zones = await prisma.zone.findMany({ where: { isActive: true } });

  let updated = 0;
  let errors = 0;

  // For each pair of zones
  for (const src of zones) {
    for (const dst of zones) {
      if (src.id === dst.id) continue;

      try {
        const rate = await fetchRateFromAPI(src.currency, dst.currency);

        // Deactivate old API rates for this corridor
        await prisma.exchangeRate.updateMany({
          where: {
            sourceZoneId: src.id,
            destZoneId: dst.id,
            source: 'API',
            isActive: true,
          },
          data: { isActive: false },
        });

        // Create new rate
        await prisma.exchangeRate.create({
          data: {
            sourceZoneId: src.id,
            destZoneId: dst.id,
            rate,
            source: 'API',
            isActive: true,
          },
        });

        updated++;
      } catch (err) {
        console.error(`[CRON] Rate ${src.currency}→${dst.currency}: ${err.message}`);
        errors++;
      }
    }
  }

  return { updated, errors };
}
