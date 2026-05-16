import axios from 'axios';
import { config, KEYWORDS } from './config.js';
import { logger } from './logger.js';

const APIFY_BASE = 'https://api.apify.com/v2';

async function runActor(keyword) {
  const url = `${APIFY_BASE}/acts/${encodeURIComponent(config.apify.actorId)}/runs`;

  logger.debug(`Starting Apify run for keyword: "${keyword}"`);

  const { data } = await axios.post(
    url,
    {
      searchQueries: [keyword],
      resultsLimit: config.apify.maxItems,
      scrapePostDetails: false,
    },
    {
      headers: { Authorization: `Bearer ${config.apify.token}` },
      timeout: 30_000,
    },
  );

  return data.data.id;
}

async function waitForRun(runId, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  const statusUrl = `${APIFY_BASE}/actor-runs/${runId}`;

  while (Date.now() < deadline) {
    await sleep(5_000);

    const { data } = await axios.get(statusUrl, {
      headers: { Authorization: `Bearer ${config.apify.token}` },
      timeout: 10_000,
    });

    const { status } = data.data;
    logger.debug(`Run ${runId} status: ${status}`);

    if (status === 'SUCCEEDED') return true;
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      logger.warn(`Apify run ${runId} ended with status: ${status}`);
      return false;
    }
  }

  logger.warn(`Apify run ${runId} timed out waiting`);
  return false;
}

async function fetchDataset(runId) {
  const url = `${APIFY_BASE}/actor-runs/${runId}/dataset/items`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${config.apify.token}` },
    params: { format: 'json', clean: true },
    timeout: 30_000,
  });
  return Array.isArray(data) ? data : [];
}

function normalisePost(raw, keyword) {
  const postId =
    raw.id ??
    raw.postId ??
    raw.code ??
    raw.shortcode ??
    String(raw.pk ?? '');

  const text =
    raw.caption ??
    raw.text ??
    raw.textContent ??
    raw.body ??
    '';

  const username =
    raw.username ??
    raw.ownerUsername ??
    raw.author?.username ??
    raw.user?.username ??
    'unknown';

  const url =
    raw.url ??
    raw.postUrl ??
    (raw.shortcode ? `https://www.threads.net/p/${raw.shortcode}` : null) ??
    (username !== 'unknown' && postId ? `https://www.threads.net/@${username}/post/${postId}` : null) ??
    'https://www.threads.net';

  return { postId, username, text, url, keyword };
}

function isValidPost(post) {
  return (
    post.postId &&
    typeof post.text === 'string' &&
    post.text.trim().length >= 10
  );
}

export async function scrapeKeyword(keyword) {
  try {
    const runId = await runActor(keyword);
    const succeeded = await waitForRun(runId);
    if (!succeeded) return [];

    const items = await fetchDataset(runId);
    logger.info(`Keyword "${keyword}": fetched ${items.length} raw items`);

    return items
      .map((raw) => normalisePost(raw, keyword))
      .filter(isValidPost);
  } catch (err) {
    logger.error(`scrapeKeyword error for "${keyword}":`, err.message);
    return [];
  }
}

export async function scrapeAllKeywords() {
  const allPosts = [];
  const seen = new Set();

  for (const keyword of KEYWORDS) {
    const posts = await scrapeKeyword(keyword);

    for (const post of posts) {
      if (!seen.has(post.postId)) {
        seen.add(post.postId);
        allPosts.push(post);
      }
    }

    // Brief pause between actor runs to avoid rate limits
    if (KEYWORDS.indexOf(keyword) < KEYWORDS.length - 1) {
      await sleep(2_000);
    }
  }

  logger.info(`Total unique posts collected: ${allPosts.length}`);
  return allPosts;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
