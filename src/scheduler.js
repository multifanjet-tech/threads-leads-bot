import cron from 'node-cron';
import { scrapeAllKeywords } from './scraper.js';
import { analyzePost } from './analyzer.js';
import { postExists, savePost, getUnnotified, markNotified, getStats } from './database.js';
import { sendLeadNotification, sendStatusMessage } from './telegram.js';
import { config } from './config.js';
import { logger } from './logger.js';

let isRunning = false;

export async function runCheck() {
  if (isRunning) {
    logger.warn('Previous check still running, skipping this cycle');
    return;
  }

  isRunning = true;
  logger.info('=== Starting new check cycle ===');

  try {
    const posts = await scrapeAllKeywords();
    let newCount = 0;
    let skippedCount = 0;

    for (const post of posts) {
      if (postExists(post.postId)) {
        skippedCount++;
        continue;
      }

      const analysis = await analyzePost(post);

      const saved = savePost({
        post_id: post.postId,
        username: post.username,
        text: post.text,
        url: post.url,
        keyword: post.keyword,
        score: analysis.score,
        niche: analysis.niche,
        is_lead: analysis.is_lead ? 1 : 0,
        ai_summary: analysis.summary,
        notified: 0,
      });

      if (saved) newCount++;
    }

    logger.info(`Cycle done: ${newCount} new, ${skippedCount} duplicates skipped`);

    // Send notifications for qualifying leads
    const leads = getUnnotified(config.bot.minScore);
    logger.info(`Leads pending notification (score >= ${config.bot.minScore}): ${leads.length}`);

    for (const lead of leads) {
      const ok = await sendLeadNotification(lead);
      if (ok) markNotified(lead.post_id);

      // Small delay between Telegram messages to avoid flood
      await sleep(1_500);
    }

    if (leads.length > 0) {
      const stats = getStats();
      logger.info(`DB stats: total=${stats.total}, leads=${stats.leads}, notified=${stats.notified}, avg_score=${stats.avg_score}`);
    }
  } catch (err) {
    logger.error('runCheck unhandled error:', err);
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  const minutes = config.bot.intervalMinutes;

  // Convert minutes to cron expression
  const cronExpr = minutes < 60
    ? `*/${minutes} * * * *`
    : `0 */${Math.floor(minutes / 60)} * * *`;

  logger.info(`Scheduler started: every ${minutes} minute(s) [${cronExpr}]`);

  // Run once immediately on startup
  runCheck();

  cron.schedule(cronExpr, () => {
    runCheck();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
