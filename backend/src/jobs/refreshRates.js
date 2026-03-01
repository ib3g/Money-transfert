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

// Initialize rates for a newly created zone vs. all existing zones
export async function refreshRatesForZone(newZone) {
  const otherZones = await prisma.zone.findMany({
    where: { isActive: true, id: { not: newZone.id } },
  });

  let updated = 0;
  let errors = 0;

  for (const other of otherZones) {
    // newZone → other
    try {
      const rate = await fetchRateFromAPI(newZone.currency, other.currency);
      await prisma.exchangeRate.updateMany({
        where: { sourceZoneId: newZone.id, destZoneId: other.id, source: 'API', isActive: true },
        data: { isActive: false },
      });
      await prisma.exchangeRate.create({
        data: { sourceZoneId: newZone.id, destZoneId: other.id, rate, source: 'API', isActive: true },
      });
      updated++;
    } catch (err) {
      console.error(`[ZONE_INIT] ${newZone.currency}→${other.currency}: ${err.message}`);
      errors++;
    }

    // other → newZone
    try {
      const rate = await fetchRateFromAPI(other.currency, newZone.currency);
      await prisma.exchangeRate.updateMany({
        where: { sourceZoneId: other.id, destZoneId: newZone.id, source: 'API', isActive: true },
        data: { isActive: false },
      });
      await prisma.exchangeRate.create({
        data: { sourceZoneId: other.id, destZoneId: newZone.id, rate, source: 'API', isActive: true },
      });
      updated++;
    } catch (err) {
      console.error(`[ZONE_INIT] ${other.currency}→${newZone.currency}: ${err.message}`);
      errors++;
    }
  }

  return { updated, errors, total: otherZones.length * 2 };
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
