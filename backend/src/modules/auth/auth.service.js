import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { Errors } from '../../utils/errors.js';

const BCRYPT_ROUNDS = 12;

function signAccessToken(userId, sessionId) {
  return jwt.sign({ userId, sessionId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

function signRefreshToken(userId) {
  return jwt.sign({ userId }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpires });
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) throw Errors.INVALID_CREDENTIALS();
  if (!user.isActive) throw Errors.USER_INACTIVE();

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw Errors.INVALID_CREDENTIALS();

  // If TOTP is enabled, return a temp token
  if (user.totpEnabled) {
    const tempToken = jwt.sign(
      { userId: user.id, step: 'totp' },
      env.jwt.secret,
      { expiresIn: '10m' }
    );
    return { requireTotp: true, tempToken };
  }

  // TOTP not yet configured → force setup
  if (!user.totpEnabled && !user.totpSecret) {
    const sessionId = uuidv4();
    const accessToken = signAccessToken(user.id, sessionId);
    const refreshToken = signRefreshToken(user.id);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { currentSessionId: sessionId, lastActivityAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return {
      requireTotp: false,
      requireTotpSetup: true,
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    };
  }

  return { requireTotp: true, tempToken: jwt.sign({ userId: user.id, step: 'totp' }, env.jwt.secret, { expiresIn: '10m' }) };
}

export async function verifyTotp({ tempToken, totpCode }) {
  let payload;
  try {
    payload = jwt.verify(tempToken, env.jwt.secret);
  } catch {
    throw Errors.SESSION_EXPIRED();
  }

  if (payload.step !== 'totp') throw Errors.UNAUTHORIZED();

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) throw Errors.UNAUTHORIZED();
  if (!user.totpSecret || !user.totpEnabled) throw Errors.TOTP_NOT_CONFIGURED();

  const valid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: 'base32',
    token: totpCode,
    window: 1,
  });

  if (!valid) throw Errors.INVALID_TOTP();

  const sessionId = uuidv4();
  const accessToken = signAccessToken(user.id, sessionId);
  const refreshToken = signRefreshToken(user.id);

  // Invalidate old refresh tokens (session unique)
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: { currentSessionId: sessionId, lastActivityAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

export async function refreshToken(token) {
  if (!token) throw Errors.UNAUTHORIZED();

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.refreshSecret);
  } catch {
    throw Errors.SESSION_EXPIRED();
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw Errors.SESSION_EXPIRED();
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) throw Errors.UNAUTHORIZED();

  const sessionId = uuidv4();
  const newAccessToken = signAccessToken(user.id, sessionId);
  const newRefreshToken = signRefreshToken(user.id);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { token } }),
    prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { currentSessionId: sessionId, lastActivityAt: new Date() },
    }),
  ]);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user: sanitizeUser(user) };
}

export async function logout(userId, refreshToken) {
  await prisma.user.update({
    where: { id: userId },
    data: { currentSessionId: null },
  });

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  }
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      zones: { include: { zone: true } },
    },
  });
  if (!user) throw Errors.USER_NOT_FOUND();
  return sanitizeUser(user);
}

export async function setupTotp(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.USER_NOT_FOUND();
  if (user.totpEnabled) throw Errors.TOTP_ALREADY_ENABLED();

  const secret = speakeasy.generateSecret({
    name: `${env.totp.issuer} (${user.email})`,
    issuer: env.totp.issuer,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret.base32 },
  });

  const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

  return { qrCodeDataUrl, secret: secret.base32 };
}

export async function confirmTotp(userId, code) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.totpSecret) throw Errors.TOTP_NOT_CONFIGURED();

  const valid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!valid) throw Errors.INVALID_TOTP();

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true },
  });
}

function sanitizeUser(user) {
  const { password, totpSecret, ...safe } = user;
  return safe;
}
