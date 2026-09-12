import { app } from './app.js';
import { ENV } from './config/env.js';
import { prisma } from './config/prisma.js';

async function main() {
  try {
    await prisma.$connect();
    console.log('✓ Connected to Database via Prisma');

    app.listen(ENV.PORT, () => {
      console.log(`🚀 IAP Backend Server running on http://localhost:${ENV.PORT}`);
      console.log(`📊 Health check: http://localhost:${ENV.PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
