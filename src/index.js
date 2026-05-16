import { initDatabase } from './database.js';
import { startScheduler } from './scheduler.js';
import { sendStatusMessage } from './telegram.js';
import { config } from './config.js';
import { logger } from './logger.js';

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

async function main() {
  logger.info('=== Threads Leads Bot starting ===');
  logger.info(`Min score for Telegram: ${config.bot.minScore}`);
  logger.info(`Check interval: ${config.bot.intervalMinutes} min`);
  logger.info(`Apify actor: ${config.apify.actorId}`);

  initDatabase();

  await sendStatusMessage(
    `🤖 Threads Leads Bot запущен\n` +
    `⏱ Интервал проверки: каждые ${config.bot.intervalMinutes} мин\n` +
    `🎯 Минимальный score: ${config.bot.minScore}/10\n` +
    `🔍 Слежу за ${(await import('./config.js')).KEYWORDS.length} ключевыми словами`,
  );

  startScheduler();
}

main();
