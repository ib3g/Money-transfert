import dotenv from 'dotenv';
dotenv.config();

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '8000', 10),
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',

  db: {
    url: required('DATABASE_URL'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  session: {
    inactivityTimeout: parseInt(process.env.SESSION_INACTIVITY_TIMEOUT ?? '18000', 10),
  },

  exchangeRate: {
    apiKey: process.env.EXCHANGE_RATE_API_KEY ?? '',
    baseUrl: 'https://v6.exchangerate-api.com/v6',
  },

  totp: {
    issuer: process.env.TOTP_ISSUER ?? 'TransferApp',
  },
};
