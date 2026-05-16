import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { config } from './config.js';
import { logger } from './logger.js';

let db;

export function initDatabase() {
  const dbPath = resolve(config.db.path);
  const dir = dirname(dbPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id       TEXT    NOT NULL UNIQUE,
      username      TEXT,
      text          TEXT,
      url           TEXT,
      keyword       TEXT,
      score         INTEGER,
      niche         TEXT,
      is_lead       INTEGER,
      ai_summary    TEXT,
      notified      INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_posts_post_id   ON posts (post_id);
    CREATE INDEX IF NOT EXISTS idx_posts_score      ON posts (score);
    CREATE INDEX IF NOT EXISTS idx_posts_notified   ON posts (notified);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at);
  `);

  logger.info('Database initialised:', dbPath);
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialised. Call initDatabase() first.');
  return db;
}

export function postExists(postId) {
  const row = getDb().prepare('SELECT 1 FROM posts WHERE post_id = ?').get(postId);
  return !!row;
}

export function savePost(post) {
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO posts
      (post_id, username, text, url, keyword, score, niche, is_lead, ai_summary, notified)
    VALUES
      (@post_id, @username, @text, @url, @keyword, @score, @niche, @is_lead, @ai_summary, @notified)
  `);
  const result = stmt.run(post);
  return result.changes > 0;
}

export function markNotified(postId) {
  getDb().prepare('UPDATE posts SET notified = 1 WHERE post_id = ?').run(postId);
}

export function getUnnotified(minScore) {
  return getDb()
    .prepare('SELECT * FROM posts WHERE notified = 0 AND score >= ? ORDER BY score DESC, created_at ASC')
    .all(minScore);
}

export function getStats() {
  const row = getDb().prepare(`
    SELECT
      COUNT(*)                              AS total,
      SUM(CASE WHEN is_lead = 1 THEN 1 ELSE 0 END) AS leads,
      SUM(CASE WHEN notified = 1 THEN 1 ELSE 0 END) AS notified,
      ROUND(AVG(score), 1)                  AS avg_score
    FROM posts
  `).get();
  return row;
}
