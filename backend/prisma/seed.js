import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const hash = (pw) => bcrypt.hash(pw, 12);
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const usedCodes = new Set();
function genCode() {
  let c;
  do { c = 'TR-' + Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join(''); }
  while (usedCodes.has(c));
  usedCodes.add(c);
  return c;
}
const ago = (h) => new Date(Date.now() - h * 3600000);
const fromNow = (h) => new Date(Date.now() + h * 3600000);

async function main() {
  console.log('\nSeeding database...\n');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.userZone.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.zone.deleteMany();

  const fr = await prisma.zone.create({ data: { name: 'France', currency: 'EUR' } });
  const sn = await prisma.zone.create({ data: { name: 'Senegal', currency: 'XOF' } });
  const ma = await prisma.zone.create({ data: { name: 'Maroc', currency: 'MAD' } });
  const ca = await prisma.zone.create({ data: { name: 'Canada', currency: 'CAD' } });
  const dz = await prisma.zone.create({ data: { name: 'Algerie', currency: 'DZD' } });
  console.log('5 zones created');

  const owner = await prisma.user.create({ data: { email: 'owner@transferapp.com', password: await hash('Owner1234!'), firstName: 'Jean', lastName: 'Dupont', role: 'OWNER', isActive: true } });
  const mgr1 = await prisma.user.create({ data: { email: 'manager1@transferapp.com', password: await hash('Manager1234!'), firstName: 'Sophie', lastName: 'Dubois', role: 'MANAGER', permissions: ['MANAGE_USERS', 'MANAGE_ZONES', 'MANAGE_RATES', 'VIEW_ALL_TRANSACTIONS', 'CANCEL_TRANSACTIONS', 'GENERATE_REPORTS', 'VIEW_AUDIT_LOGS'], createdById: owner.id } });
  const mgr2 = await prisma.user.create({ data: { email: 'manager2@transferapp.com', password: await hash('Manager1234!'), firstName: 'Karim', lastName: 'Benali', role: 'MANAGER', permissions: ['VIEW_ALL_TRANSACTIONS', 'CANCEL_TRANSACTIONS'], createdById: owner.id } });
  const ap1 = await prisma.user.create({ data: { email: 'agent.paris@transferapp.com', password: await hash('Agent1234!'), firstName: 'Amadou', lastName: 'Sy', role: 'AGENT', createdById: mgr1.id } });
  const ap2 = await prisma.user.create({ data: { email: 'agent.paris2@transferapp.com', password: await hash('Agent1234!'), firstName: 'Pierre', lastName: 'Martin', role: 'AGENT', createdById: mgr1.id } });
  const adk = await prisma.user.create({ data: { email: 'agent.dakar@transferapp.com', password: await hash('Agent1234!'), firstName: 'Moussa', lastName: 'Diallo', role: 'AGENT', createdById: mgr1.id } });
  const acs = await prisma.user.create({ data: { email: 'agent.casablanca@transferapp.com', password: await hash('Agent1234!'), firstName: 'Fatima', lastName: 'El Ouafi', role: 'AGENT', createdById: mgr1.id } });
  const amt = await prisma.user.create({ data: { email: 'agent.montreal@transferapp.com', password: await hash('Agent1234!'), firstName: 'Aminata', lastName: 'Traore', role: 'AGENT', createdById: mgr2.id } });
  const aal = await prisma.user.create({ data: { email: 'agent.alger@transferapp.com', password: await hash('Agent1234!'), firstName: 'Nabil', lastName: 'Meziani', role: 'AGENT', createdById: mgr2.id } });
  console.log('9 users created');

  await prisma.userZone.createMany({
    data: [
      { userId: mgr1.id, zoneId: fr.id }, { userId: mgr1.id, zoneId: sn.id }, { userId: mgr1.id, zoneId: ma.id }, { userId: mgr1.id, zoneId: ca.id }, { userId: mgr1.id, zoneId: dz.id },
      { userId: mgr2.id, zoneId: fr.id }, { userId: mgr2.id, zoneId: sn.id },
      { userId: ap1.id, zoneId: fr.id }, { userId: ap2.id, zoneId: fr.id },
      { userId: adk.id, zoneId: sn.id }, { userId: acs.id, zoneId: ma.id },
      { userId: amt.id, zoneId: ca.id }, { userId: aal.id, zoneId: dz.id },
    ]
  });

  await prisma.exchangeRate.createMany({
    data: [
      { sourceZoneId: fr.id, destZoneId: sn.id, rate: 655.957, source: 'API', isActive: true },
      { sourceZoneId: fr.id, destZoneId: sn.id, rate: 652.000, source: 'MANUAL', isActive: true, setById: owner.id },
      { sourceZoneId: sn.id, destZoneId: fr.id, rate: 0.001524, source: 'API', isActive: true },
      { sourceZoneId: fr.id, destZoneId: ma.id, rate: 10.85, source: 'API', isActive: true },
      { sourceZoneId: ma.id, destZoneId: fr.id, rate: 0.09217, source: 'API', isActive: true },
      { sourceZoneId: fr.id, destZoneId: ca.id, rate: 1.498, source: 'API', isActive: true },
      { sourceZoneId: ca.id, destZoneId: fr.id, rate: 0.668, source: 'API', isActive: true },
      { sourceZoneId: fr.id, destZoneId: dz.id, rate: 145.20, source: 'API', isActive: true },
      { sourceZoneId: dz.id, destZoneId: fr.id, rate: 0.006887, source: 'API', isActive: true },
      { sourceZoneId: sn.id, destZoneId: ma.id, rate: 0.016527, source: 'API', isActive: true },
      { sourceZoneId: ma.id, destZoneId: sn.id, rate: 60.49, source: 'API', isActive: true },
      { sourceZoneId: sn.id, destZoneId: ca.id, rate: 0.002285, source: 'API', isActive: true },
      { sourceZoneId: ca.id, destZoneId: sn.id, rate: 437.58, source: 'API', isActive: true },
      { sourceZoneId: ma.id, destZoneId: ca.id, rate: 0.13810, source: 'API', isActive: true },
      { sourceZoneId: ca.id, destZoneId: ma.id, rate: 7.2408, source: 'API', isActive: true },
    ]
  });
  console.log('15 exchange rates created');

  const pc1 = genCode(), pc2 = genCode(), pc3 = genCode();

  const txs = [
    { code: genCode(), sourceAmount: 20000, sourceCurrency: 'EUR', destAmount: 13040000, destCurrency: 'XOF', appliedRate: 652.0, rateSource: 'MANUAL', sourceZoneId: fr.id, destZoneId: sn.id, senderAgentId: ap1.id, receiverAgentId: adk.id, senderName: 'Jean Dupont', recipientName: 'Fatou Diallo', status: 'COMPLETED', confirmedAt: ago(48) },
    { code: genCode(), sourceAmount: 5000, sourceCurrency: 'EUR', destAmount: 3260000, destCurrency: 'XOF', appliedRate: 652.0, rateSource: 'MANUAL', sourceZoneId: fr.id, destZoneId: sn.id, senderAgentId: ap1.id, receiverAgentId: adk.id, senderName: 'Sophie Dubois', recipientName: 'Mamadou Ndiaye', status: 'COMPLETED', confirmedAt: ago(72) },
    { code: genCode(), sourceAmount: 10000, sourceCurrency: 'EUR', destAmount: 6520000, destCurrency: 'XOF', appliedRate: 652.0, rateSource: 'MANUAL', sourceZoneId: fr.id, destZoneId: sn.id, senderAgentId: ap2.id, receiverAgentId: adk.id, senderName: 'Pierre Martin', recipientName: 'Rokhaya Fall', status: 'COMPLETED', confirmedAt: ago(24) },
    { code: genCode(), sourceAmount: 30000, sourceCurrency: 'EUR', destAmount: 19560000, destCurrency: 'XOF', appliedRate: 652.0, rateSource: 'MANUAL', sourceZoneId: fr.id, destZoneId: sn.id, senderAgentId: ap1.id, receiverAgentId: adk.id, senderName: 'Marie Lefebvre', recipientName: 'Ibrahima Ba', status: 'COMPLETED', confirmedAt: ago(120) },
    { code: pc1, sourceAmount: 15000, sourceCurrency: 'EUR', destAmount: 9780000, destCurrency: 'XOF', appliedRate: 652.0, rateSource: 'MANUAL', sourceZoneId: fr.id, destZoneId: sn.id, senderAgentId: ap1.id, senderName: 'Paul Bernard', recipientName: 'Aissatou Sow', status: 'PENDING', expiresAt: fromNow(46) },
    { code: pc2, sourceAmount: 25000, sourceCurrency: 'EUR', destAmount: 16300000, destCurrency: 'XOF', appliedRate: 652.0, rateSource: 'MANUAL', sourceZoneId: fr.id, destZoneId: sn.id, senderAgentId: ap2.id, senderName: 'Claire Petit', recipientName: 'Ousmane Ndiaye', status: 'PENDING', expiresAt: fromNow(24) },
    { code: genCode(), sourceAmount: 30000, sourceCurrency: 'EUR', destAmount: 325500, destCurrency: 'MAD', appliedRate: 10.85, rateSource: 'API', sourceZoneId: fr.id, destZoneId: ma.id, senderAgentId: ap1.id, receiverAgentId: acs.id, senderName: 'Luc Moreau', recipientName: 'Mohamed Tazi', status: 'COMPLETED', confirmedAt: ago(5) },
    { code: genCode(), sourceAmount: 8000, sourceCurrency: 'EUR', destAmount: 86800, destCurrency: 'MAD', appliedRate: 10.85, rateSource: 'API', sourceZoneId: fr.id, destZoneId: ma.id, senderAgentId: ap2.id, receiverAgentId: acs.id, senderName: 'Julie Simon', recipientName: 'Zineb Alaoui', status: 'COMPLETED', confirmedAt: ago(36) },
    { code: genCode(), sourceAmount: 5000, sourceCurrency: 'EUR', destAmount: 7490, destCurrency: 'CAD', appliedRate: 1.498, rateSource: 'API', sourceZoneId: fr.id, destZoneId: ca.id, senderAgentId: ap1.id, receiverAgentId: amt.id, senderName: 'Robert Lavoie', recipientName: 'Sarah Tremblay', status: 'COMPLETED', confirmedAt: ago(12) },
    { code: pc3, sourceAmount: 2000, sourceCurrency: 'EUR', destAmount: 290400, destCurrency: 'DZD', appliedRate: 145.2, rateSource: 'API', sourceZoneId: fr.id, destZoneId: dz.id, senderAgentId: ap1.id, senderName: 'Alice Gagnon', recipientName: 'Yacine Boudiaf', status: 'PENDING', expiresAt: fromNow(40) },
    { code: genCode(), sourceAmount: 10000, sourceCurrency: 'EUR', destAmount: 6520000, destCurrency: 'XOF', appliedRate: 652.0, rateSource: 'MANUAL', sourceZoneId: fr.id, destZoneId: sn.id, senderAgentId: ap1.id, senderName: 'Michel Leroy', recipientName: 'Lamine Sall', status: 'CANCELLED', cancelledAt: ago(3), cancelReason: 'Client a change d avis' },
    { code: genCode(), sourceAmount: 3000, sourceCurrency: 'EUR', destAmount: 32550, destCurrency: 'MAD', appliedRate: 10.85, rateSource: 'API', sourceZoneId: fr.id, destZoneId: ma.id, senderAgentId: ap2.id, senderName: 'Sonia Dahmani', recipientName: 'Hassan Rami', status: 'CANCELLED', cancelledAt: ago(8), cancelReason: 'Erreur de saisie' },
    { code: genCode(), sourceAmount: 7500, sourceCurrency: 'EUR', destAmount: 4890000, destCurrency: 'XOF', appliedRate: 652.0, rateSource: 'MANUAL', sourceZoneId: fr.id, destZoneId: sn.id, senderAgentId: ap1.id, senderName: 'Samba Diouf', recipientName: 'Seydou Camara', status: 'EXPIRED', expiresAt: ago(5) },
    { code: genCode(), sourceAmount: 1500, sourceCurrency: 'EUR', destAmount: 217800, destCurrency: 'DZD', appliedRate: 145.2, rateSource: 'API', sourceZoneId: fr.id, destZoneId: dz.id, senderAgentId: ap2.id, senderName: 'Amar Bensaid', recipientName: 'Riad Cherif', status: 'EXPIRED', expiresAt: ago(2) },
    { code: genCode(), sourceAmount: 500000, sourceCurrency: 'XOF', destAmount: 762, destCurrency: 'EUR', appliedRate: 0.001524, rateSource: 'API', sourceZoneId: sn.id, destZoneId: fr.id, senderAgentId: adk.id, receiverAgentId: ap1.id, senderName: 'Abdoualye Sy', recipientName: 'Marc Girard', status: 'COMPLETED', confirmedAt: ago(2) },
    { code: genCode(), sourceAmount: 3000, sourceCurrency: 'CAD', destAmount: 1312740, destCurrency: 'XOF', appliedRate: 437.58, rateSource: 'API', sourceZoneId: ca.id, destZoneId: sn.id, senderAgentId: amt.id, receiverAgentId: adk.id, senderName: 'Thomas Roy', recipientName: 'Bintou Kone', status: 'COMPLETED', confirmedAt: ago(18) },
    { code: genCode(), sourceAmount: 2000, sourceCurrency: 'CAD', destAmount: 875160, destCurrency: 'XOF', appliedRate: 437.58, rateSource: 'API', sourceZoneId: ca.id, destZoneId: sn.id, senderAgentId: amt.id, senderName: 'Emma Fortin', recipientName: 'Adama Kouyate', status: 'PENDING', expiresAt: fromNow(38) },
  ];

  for (const tx of txs) { await prisma.transaction.create({ data: tx }); }
  console.log(txs.length + ' transactions created');

  await prisma.notification.createMany({
    data: [
      { userId: adk.id, type: 'TRANSACTION_CONFIRMED', title: 'Transfert confirme', message: 'Paiement 13 040 000 XOF pour Fatou Diallo.', data: { transactionCode: txs[0].code }, isRead: true },
      { userId: adk.id, type: 'TRANSACTION_CONFIRMED', title: 'Transfert confirme', message: 'Paiement 3 260 000 XOF pour Mamadou Ndiaye.', data: { transactionCode: txs[1].code }, isRead: true },
      { userId: adk.id, type: 'TRANSACTION_CONFIRMED', title: 'Transfert confirme', message: 'Paiement 6 520 000 XOF pour Rokhaya Fall.', data: { transactionCode: txs[2].code }, isRead: false },
      { userId: ap1.id, type: 'TRANSACTION_CONFIRMED', title: 'Transfert complete', message: 'Votre transfert pour Fatou Diallo confirme.', data: { transactionCode: txs[0].code }, isRead: true },
      { userId: ap1.id, type: 'TRANSACTION_CANCELLED', title: 'Transfert annule', message: 'Transfert pour Lamine Sall annule.', data: { transactionCode: txs[10].code }, isRead: false },
      { userId: ap1.id, type: 'TRANSACTION_EXPIRED', title: 'Transfert expire', message: 'Transfert pour Seydou Camara expire.', data: { transactionCode: txs[12].code }, isRead: false },
      { userId: ap1.id, type: 'RATE_UPDATED', title: 'Taux mis a jour', message: 'EUR -> XOF mis a jour a 652.00 (manuel).', isRead: true },
      { userId: ap2.id, type: 'TRANSACTION_EXPIRED', title: 'Transfert expire', message: 'Transfert pour Riad Cherif expire.', data: { transactionCode: txs[13].code }, isRead: false },
      { userId: ap2.id, type: 'TRANSACTION_CONFIRMED', title: 'Transfert complete', message: 'Votre transfert pour Rokhaya Fall confirme.', data: { transactionCode: txs[2].code }, isRead: true },
      { userId: acs.id, type: 'TRANSACTION_CONFIRMED', title: 'Transfert confirme', message: 'Paiement 325 500 MAD pour Mohamed Tazi.', data: { transactionCode: txs[6].code }, isRead: true },
      { userId: amt.id, type: 'TRANSACTION_CONFIRMED', title: 'Transfert complete', message: 'Votre transfert pour Bintou Kone confirme.', data: { transactionCode: txs[15].code }, isRead: false },
      { userId: owner.id, type: 'USER_CREATED', title: 'Nouvel agent', message: 'Sophie Dubois a cree Nabil Meziani (Alger).', isRead: true },
      { userId: owner.id, type: 'RATE_UPDATED', title: 'Taux manuel', message: 'Taux EUR->XOF defini a 652.00.', isRead: true },
    ]
  });
  console.log('13 notifications created');

  await prisma.auditLog.createMany({
    data: [
      { userId: owner.id, action: 'USER_CREATED', entity: 'User', entityId: mgr1.id, details: { email: mgr1.email, role: 'MANAGER' } },
      { userId: owner.id, action: 'USER_CREATED', entity: 'User', entityId: mgr2.id, details: { email: mgr2.email, role: 'MANAGER' } },
      { userId: owner.id, action: 'RATE_SET_MANUAL', entity: 'ExchangeRate', entityId: fr.id, details: { from: 'EUR', to: 'XOF', rate: 652.0 } },
      { userId: mgr1.id, action: 'USER_CREATED', entity: 'User', entityId: ap1.id, details: { email: ap1.email, role: 'AGENT' } },
      { userId: mgr1.id, action: 'USER_CREATED', entity: 'User', entityId: adk.id, details: { email: adk.email, role: 'AGENT' } },
      { userId: mgr1.id, action: 'ZONE_CREATED', entity: 'Zone', entityId: ca.id, details: { name: 'Canada', currency: 'CAD' } },
      { userId: ap1.id, action: 'TRANSACTION_CREATED', entity: 'Transaction', entityId: pc1, details: { amount: 15000, currency: 'EUR' } },
      { userId: adk.id, action: 'TRANSACTION_CONFIRMED', entity: 'Transaction', entityId: txs[0].code, details: { amount: 13040000, currency: 'XOF' } },
      { userId: adk.id, action: 'TRANSACTION_CONFIRMED', entity: 'Transaction', entityId: txs[1].code, details: { amount: 3260000, currency: 'XOF' } },
      { userId: ap1.id, action: 'TRANSACTION_CANCELLED', entity: 'Transaction', entityId: txs[10].code, details: { reason: 'Client a change d avis' } },
    ]
  });
  console.log('10 audit logs created');

  console.log('\n=== SEED COMPLETE ===');
  console.log('Pending codes for confirm flow:');
  console.log('  pc1 =', pc1, '(Aissatou Sow  - 15 000 EUR)');
  console.log('  pc2 =', pc2, '(Ousmane Ndiaye - 25 000 EUR)');
  console.log('  pc3 =', pc3, '(Yacine Boudiaf -  2 000 EUR)');
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
