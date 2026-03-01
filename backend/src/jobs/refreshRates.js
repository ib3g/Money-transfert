import { prisma } from '../config/database.js';
import { env } from '../config/env.js';

export async function fetchAllRatesFromAPI(baseCurrency) {
  const url = `${env.exchangeRate.baseUrl}/${env.exchangeRate.apiKey}/latest/${baseCurrency}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`ExchangeRate API error: ${res.status}`);
  const data = await res.json();
  if (data.result !== 'success') throw new Error(`API error: ${data['error-type']}`);
  return data.conversion_rates;
}

// Initialize rates for a newly created zone vs. all existing zones
export async function refreshRatesForZone(newZone) {
  const otherZones = await prisma.zone.findMany({
    where: { isActive: true, id: { not: newZone.id } },
  });

  let updated = 0;
  let errors = 0;

  // newZone -> others
  try {
    const rates = await fetchAllRatesFromAPI(newZone.currency);
    for (const other of otherZones) {
      const rate = rates[other.currency];
      if (rate) {
        await prisma.exchangeRate.updateMany({
          where: { sourceZoneId: newZone.id, destZoneId: other.id, source: 'API', isActive: true },
          data: { isActive: false },
        });
        await prisma.exchangeRate.create({
          data: { sourceZoneId: newZone.id, destZoneId: other.id, rate, source: 'API', isActive: true },
        });
        updated++;
      } else {
        errors++;
      }
    }
  } catch (err) {
    console.error(`[ZONE_INIT] ${newZone.currency} rates: ${err.message}`);
    errors += otherZones.length;
  }

  // others -> newZone
  for (const other of otherZones) {
    try {
      const rates = await fetchAllRatesFromAPI(other.currency);
      const rate = rates[newZone.currency];
      if (rate) {
        await prisma.exchangeRate.updateMany({
          where: { sourceZoneId: other.id, destZoneId: newZone.id, source: 'API', isActive: true },
          data: { isActive: false },
        });
        await prisma.exchangeRate.create({
          data: { sourceZoneId: other.id, destZoneId: newZone.id, rate, source: 'API', isActive: true },
        });
        updated++;
      } else {
        errors++;
      }
    } catch (err) {
      console.error(`[ZONE_INIT] ${other.currency} rates: ${err.message}`);
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

  for (const src of zones) {
    try {
      const rates = await fetchAllRatesFromAPI(src.currency);

      for (const dst of zones) {
        if (src.id === dst.id) continue;
        const rate = rates[dst.currency];

        if (rate) {
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
        } else {
          errors++;
        }
      }
    } catch (err) {
      console.error(`[CRON] Rates for ${src.currency}: ${err.message}`);
      errors += zones.length - 1;
    }
  }

  return { updated, errors };
}
