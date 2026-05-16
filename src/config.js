import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env variable: ${name}`);
  return val;
}

function optional(name, fallback) {
  return process.env[name] ?? fallback;
}

export const config = {
  apify: {
    token: required('APIFY_API_TOKEN'),
    actorId: optional('APIFY_ACTOR_ID', 'apidojo/threads-scraper'),
    maxItems: parseInt(optional('APIFY_MAX_ITEMS', '50'), 10),
  },
  openai: {
    apiKey: required('OPENAI_API_KEY'),
  },
  telegram: {
    token: required('TELEGRAM_BOT_TOKEN'),
    chatId: required('TELEGRAM_CHAT_ID'),
  },
  db: {
    path: optional('DB_PATH', './data/leads.db'),
  },
  bot: {
    minScore: parseInt(optional('MIN_SCORE', '6'), 10),
    intervalMinutes: parseInt(optional('CHECK_INTERVAL_MINUTES', '10'), 10),
  },
  log: {
    level: optional('LOG_LEVEL', 'info'),
  },
};

export const KEYWORDS = [
  // Russian
  'ищу таргетолога',
  'нужен таргетолог',
  'meta ads',
  'facebook ads',
  'нужен маркетолог',
  // Ukrainian
  'шукаю таргетолога',
  'потрібен таргетолог',
  'потрібен маркетолог',
  'шукаю маркетолога',
  'таргетована реклама',
  'хто налаштовує рекламу',
  'потрібна реклама',
];
