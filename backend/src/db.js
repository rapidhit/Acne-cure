import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.resolve("./data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "app.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT UNIQUE NOT NULL,
  email TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed
  paystack_response TEXT,
  download_token TEXT,
  download_token_expires_at INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  verified_at INTEGER
);

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  path TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  price_kobo INTEGER NOT NULL,
  currency TEXT NOT NULL,
  product_name TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_session ON visits(session_id);
`);

export default db;

// Seed the settings row once, from env vars, so the DB becomes the
// source of truth from then on — env vars only matter on first boot.
const existing = db.prepare(`SELECT id FROM settings WHERE id = 1`).get();
if (!existing) {
  db.prepare(
    `INSERT INTO settings (id, price_kobo, currency, product_name, updated_at)
     VALUES (1, ?, ?, ?, ?)`
  ).run(
    Number(process.env.PRODUCT_PRICE_KOBO) || 499,
    process.env.PRODUCT_CURRENCY || "USD",
    process.env.PRODUCT_NAME || "Flawless Natural Remedies - 8 Steps PDF",
    Date.now()
  );
}

export function getSettings() {
  return db.prepare(`SELECT price_kobo, currency, product_name, updated_at FROM settings WHERE id = 1`).get();
}
