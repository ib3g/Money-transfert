import { createServer } from 'http';
import { createApp } from './app.js';
import { initSocket } from './socket.js';
import { prisma } from './config/database.js';
import { env } from './config/env.js';
import { startCronJobs } from './jobs/index.js';

async function bootstrap() {
  const app = createApp();
  const httpServer = createServer(app);

  initSocket(httpServer);

  // Test DB connection
  try {
    await prisma.$connect();
    console.log('[DB] Connected to PostgreSQL');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }

  // Start cron jobs
  startCronJobs();

  httpServer.listen(env.port, () => {
    console.log(`[SERVER] Running on port ${env.port} (${env.nodeEnv})`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[SERVER] ${signal} received, shutting down...`);
    httpServer.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[BOOTSTRAP] Fatal error:', err);
  process.exit(1);
});
