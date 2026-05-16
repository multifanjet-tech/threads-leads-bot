import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { logger } from './logger.js';

const bot = new Telegraf(config.telegram.token);

const SCORE_EMOJI = (score) => {
  if (score >= 9) return '🔥🔥🔥';
  if (score >= 7) return '🔥🔥';
  if (score >= 5) return '🔥';
  return '❄️';
};

function escapeMarkdown(text) {
  return String(text ?? '').replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

export async function sendLeadNotification(post) {
  const emoji = SCORE_EMOJI(post.score);
  const isLeadLabel = post.is_lead ? '✅ Лид' : '❌ Не лид';

  const message = [
    `${emoji} *Новый лид найден\\!*`,
    '',
    `*Score:* ${escapeMarkdown(post.score)}/10 ${emoji}`,
    `*Статус:* ${escapeMarkdown(isLeadLabel)}`,
    `*Ниша:* ${escapeMarkdown(post.niche)}`,
    '',
    `*👤 Username:* @${escapeMarkdown(post.username)}`,
    `*🔑 Ключевое слово:* ${escapeMarkdown(post.keyword)}`,
    '',
    `*📝 Текст поста:*`,
    `${escapeMarkdown(post.text.slice(0, 800))}${post.text.length > 800 ? '\\.\\.\\.' : ''}`,
    '',
    `*🤖 AI анализ:*`,
    `${escapeMarkdown(post.ai_summary)}`,
    '',
    `[🔗 Открыть пост](${post.url})`,
  ].join('\n');

  try {
    await bot.telegram.sendMessage(config.telegram.chatId, message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: false,
    });
    logger.info(`Telegram notification sent for post ${post.post_id}`);
    return true;
  } catch (err) {
    logger.error('Telegram sendMessage error:', err.message);

    // Fallback: plain text if markdown fails
    try {
      const plain = [
        `${emoji} Новый лид!`,
        `Score: ${post.score}/10`,
        `Ниша: ${post.niche}`,
        `Username: @${post.username}`,
        `Ключевое слово: ${post.keyword}`,
        `Текст: ${post.text.slice(0, 600)}`,
        `AI анализ: ${post.ai_summary}`,
        `Ссылка: ${post.url}`,
      ].join('\n');

      await bot.telegram.sendMessage(config.telegram.chatId, plain);
      logger.info(`Telegram fallback sent for post ${post.post_id}`);
      return true;
    } catch (fallbackErr) {
      logger.error('Telegram fallback error:', fallbackErr.message);
      return false;
    }
  }
}

export async function sendStatusMessage(text) {
  try {
    await bot.telegram.sendMessage(config.telegram.chatId, text);
  } catch (err) {
    logger.error('sendStatusMessage error:', err.message);
  }
}

export function getBotInstance() {
  return bot;
}
