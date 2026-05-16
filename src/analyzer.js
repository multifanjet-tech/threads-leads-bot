import OpenAI from 'openai';
import { config } from './config.js';
import { logger } from './logger.js';

const client = new OpenAI({ apiKey: config.openai.apiKey });

const SYSTEM_PROMPT = `Ты — эксперт по лидогенерации для digital-маркетолога и таргетолога.
Тебе дают текст поста из социальной сети Threads.
Твоя задача — определить, является ли автор потенциальным клиентом, которому нужны услуги таргетолога / маркетолога / специалиста по рекламе в Meta (Facebook/Instagram).

Отвечай СТРОГО в JSON-формате без каких-либо дополнительных пояснений.`;

const USER_TEMPLATE = (text, keyword) =>
  `Ключевое слово, по которому найден пост: "${keyword}"

Текст поста:
"""
${text}
"""

Верни JSON строго в таком формате:
{
  "is_lead": true/false,
  "score": 1-10,
  "niche": "краткое название ниши бизнеса или 'не определено'",
  "summary": "1-2 предложения объяснения"
}

Правила оценки score (горячесть лида):
1-3  — не лид, случайное совпадение
4-5  — слабый лид, неоднозначно
6-7  — хороший лид, есть признаки потребности
8-9  — горячий лид, явная потребность
10   — очень горячий лид, ищет исполнителя прямо сейчас

is_lead = true если score >= 5`;

function parseResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      is_lead: Boolean(parsed.is_lead),
      score: Math.min(10, Math.max(1, parseInt(parsed.score, 10) || 1)),
      niche: String(parsed.niche || 'не определено').slice(0, 100),
      summary: String(parsed.summary || '').slice(0, 500),
    };
  } catch {
    return { is_lead: false, score: 1, niche: 'не определено', summary: 'Ошибка парсинга AI ответа' };
  }
}

export async function analyzePost(post) {
  const truncatedText = post.text.slice(0, 1500);

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 256,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_TEMPLATE(truncatedText, post.keyword) },
      ],
    });

    const responseText = completion.choices[0]?.message?.content ?? '';

    const result = parseResponse(responseText);
    logger.debug(`Analyzed post ${post.postId}: score=${result.score}, is_lead=${result.is_lead}`);
    return result;
  } catch (err) {
    logger.error(`analyzePost error for ${post.postId}:`, err.message);
    return { is_lead: false, score: 1, niche: 'не определено', summary: 'Ошибка анализа' };
  }
}
