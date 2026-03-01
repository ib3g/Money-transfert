import PDFDocument from 'pdfkit';
import { prisma } from '../../config/database.js';

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatAmount(amount, currency) {
  return `${(amount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

const STATUS_LABELS = { PENDING: 'En attente', COMPLETED: 'Complété', CANCELLED: 'Annulé', EXPIRED: 'Expiré' };

export async function generateTransactionReport(filters) {
  const { from, to, sourceZoneId, destZoneId, agentId, status } = filters;

  const where = {
    ...(status       && { status }),
    ...(sourceZoneId && { sourceZoneId }),
    ...(destZoneId   && { destZoneId }),
    ...(agentId      && { OR: [{ senderAgentId: agentId }, { receiverAgentId: agentId }] }),
    ...(from         && { createdAt: { gte: new Date(from) } }),
    ...(to           && { createdAt: { ...(from ? { gte: new Date(from) } : {}), lte: new Date(to) } }),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      sourceZone:    { select: { name: true, currency: true } },
      destZone:      { select: { name: true, currency: true } },
      senderAgent:   { select: { firstName: true, lastName: true } },
      receiverAgent: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.font('Helvetica-Bold').fontSize(16).text('TransferApp — Relevé de transactions', 50, 50);
    doc.font('Helvetica').fontSize(10)
      .text(`Période : ${from ? formatDate(from) : '—'} – ${to ? formatDate(to) : '—'}`, 50, 75)
      .text(`Généré le : ${formatDate(new Date())}`, 50, 90);

    doc.moveTo(50, 110).lineTo(770, 110).stroke();

    // Table header
    const cols = [50, 130, 220, 360, 460, 560, 660];
    const headers = ['Date', 'Code', 'Corridor', 'Destinataire', 'Envoyé', 'Reçu', 'Statut'];
    let y = 125;

    doc.font('Helvetica-Bold').fontSize(8);
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 15;
    doc.moveTo(50, y).lineTo(770, y).stroke();
    y += 5;

    doc.font('Helvetica').fontSize(8);
    let totalSent = 0;
    let totalReceived = {};
    let completedCount = 0;

    for (const tx of transactions) {
      if (y > 520) {
        doc.addPage({ layout: 'landscape' });
        y = 50;
      }
      const corridor = `${tx.sourceZone.name} → ${tx.destZone.name}`;
      const agentName = `${tx.senderAgent.firstName} ${tx.senderAgent.lastName}`;

      doc.text(formatDate(tx.createdAt), cols[0], y, { width: 75 })
         .text(tx.code,                 cols[1], y, { width: 85 })
         .text(corridor,                cols[2], y, { width: 135 })
         .text(tx.recipientName,        cols[3], y, { width: 95 })
         .text(formatAmount(tx.sourceAmount, tx.sourceCurrency), cols[4], y, { width: 95 })
         .text(formatAmount(tx.destAmount,   tx.destCurrency),   cols[5], y, { width: 95 })
         .text(STATUS_LABELS[tx.status] ?? tx.status, cols[6], y, { width: 100 });

      if (tx.status === 'COMPLETED') {
        totalSent += tx.sourceAmount;
        totalReceived[tx.destCurrency] = (totalReceived[tx.destCurrency] ?? 0) + tx.destAmount;
        completedCount++;
      }
      y += 14;
    }

    // Footer totals
    y += 10;
    doc.moveTo(50, y).lineTo(770, y).stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(9)
      .text(`TOTAUX : ${transactions.length} transactions | Complétées : ${completedCount}`, 50, y);

    doc.end();
  });
}

export async function generateCorridorReport(filters) {
  const { from, to } = filters;

  const transactions = await prisma.transaction.findMany({
    where: {
      status: 'COMPLETED',
      ...(from && { createdAt: { gte: new Date(from) } }),
      ...(to   && { createdAt: { ...(from ? { gte: new Date(from) } : {}), lte: new Date(to) } }),
    },
    include: {
      sourceZone: { select: { name: true, currency: true } },
      destZone:   { select: { name: true, currency: true } },
    },
  });

  const corridors = new Map();
  for (const tx of transactions) {
    const key = `${tx.sourceZoneId}-${tx.destZoneId}`;
    if (!corridors.has(key)) {
      corridors.set(key, {
        label: `${tx.sourceZone.name} → ${tx.destZone.name}`,
        srcCurrency: tx.sourceCurrency,
        dstCurrency: tx.destCurrency,
        count: 0, totalSrc: 0, totalDst: 0, rateSum: 0,
      });
    }
    const c = corridors.get(key);
    c.count++;
    c.totalSrc += tx.sourceAmount;
    c.totalDst += tx.destAmount;
    c.rateSum  += parseFloat(tx.appliedRate.toString());
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(16).text('TransferApp — Résumé par corridor', 50, 50);
    doc.font('Helvetica').fontSize(10)
      .text(`Période : ${from ? formatDate(from) : '—'} – ${to ? formatDate(to) : '—'}`, 50, 75)
      .text(`Généré le : ${formatDate(new Date())}`, 50, 90);

    doc.moveTo(50, 110).lineTo(550, 110).stroke();

    const cols = [50, 200, 280, 370, 460];
    const headers = ['Corridor', 'Nb trans.', 'Total envoyé', 'Total distribué', 'Taux moyen'];
    let y = 125;

    doc.font('Helvetica-Bold').fontSize(9);
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 15;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 5;

    let grandTotal = 0;
    doc.font('Helvetica').fontSize(9);

    for (const [, c] of corridors) {
      doc.text(c.label,                                               cols[0], y, { width: 145 })
         .text(c.count.toString(),                                    cols[1], y)
         .text(formatAmount(c.totalSrc, c.srcCurrency),              cols[2], y)
         .text(formatAmount(c.totalDst, c.dstCurrency),              cols[3], y)
         .text((c.rateSum / c.count).toFixed(4),                     cols[4], y);
      grandTotal += c.count;
      y += 18;
    }

    y += 10;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(9)
      .text(`GRAND TOTAL : ${grandTotal} transactions complétées`, 50, y);

    doc.end();
  });
}
