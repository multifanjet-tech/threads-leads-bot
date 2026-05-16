import axios from 'axios';
import { Telegraf } from 'telegraf';
import { config } from './config.js';

const APIFY_BASE = 'https://api.apify.com/v2';

async function checkTelegram() {
  console.log('\n=== TELEGRAM ===');
  try {
    const bot = new Telegraf(config.telegram.token);
    const me = await bot.telegram.getMe();
    console.log('✅ Bot connected:', `@${me.username} (${me.first_name})`);

    await bot.telegram.sendMessage(
      config.telegram.chatId,
      '✅ Threads Leads Bot — тест подключения прошёл успешно!',
    );
    console.log('✅ Test message sent to chat:', config.telegram.chatId);
  } catch (err) {
    console.error('❌ Telegram error:', err.message);
  }
}

async function checkApify() {
  console.log('\n=== APIFY ===');
  try {
    const { data } = await axios.get(`${APIFY_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${config.apify.token}` },
      timeout: 10_000,
    });
    console.log('✅ Apify auth OK, user:', data.data?.username);
  } catch (err) {
    console.error('❌ Apify auth error:', err.response?.status, err.message);
  }

  try {
    const actorId = encodeURIComponent(config.apify.actorId);
    const { data } = await axios.get(`${APIFY_BASE}/acts/${actorId}`, {
      headers: { Authorization: `Bearer ${config.apify.token}` },
      timeout: 10_000,
    });
    console.log('✅ Actor found:', data.data?.name, `(id: ${data.data?.id})`);
  } catch (err) {
    console.error('❌ Actor error:', err.response?.status, err.response?.data?.error?.message ?? err.message);
  }
}

async function checkOpenAI() {
  console.log('\n=== OPENAI ===');
  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: config.openai.apiKey });
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }],
    });
    console.log('✅ OpenAI OK, model:', res.model);
  } catch (err) {
    console.error('❌ OpenAI error:', err.message);
  }
}

async function main() {
  console.log('🔍 Running diagnostics...');
  console.log('Actor ID:', config.apify.actorId);
  console.log('Chat ID:', config.telegram.chatId);

  await checkTelegram();
  await checkApify();
  await checkOpenAI();

  console.log('\n=== DONE ===');
}

main();
