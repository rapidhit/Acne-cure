import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.resolve("./data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "app.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price_kobo INTEGER NOT NULL,
  currency TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'template', -- 'template' | 'custom_code'
  is_default INTEGER NOT NULL DEFAULT 0, -- served at the bare domain root "/"
  pdf_file_path TEXT,
  delivery_type TEXT NOT NULL DEFAULT 'pdf', -- 'pdf' | 'telegram'
  telegram_link TEXT,

  -- template mode fields
  headline TEXT,
  subheadline TEXT,
  hero_image_path TEXT,
  testimonials_json TEXT,   -- JSON array
  faqs_json TEXT,           -- JSON array

  -- custom_code mode field
  custom_html TEXT,

  -- floating (sticky) action button — at most one per product
  floating_enabled INTEGER NOT NULL DEFAULT 0,
  floating_label TEXT NOT NULL DEFAULT 'Get Access',
  floating_position TEXT NOT NULL DEFAULT 'bottom', -- 'top' | 'bottom' | 'scroll_trigger'
  floating_scroll_percent INTEGER NOT NULL DEFAULT 50,
  floating_stick_to TEXT NOT NULL DEFAULT 'bottom', -- 'top' | 'bottom' (used when position = scroll_trigger)

  -- inline (in-page) action buttons — unlimited, stored as one JSON array
  -- each item: { id, label, xPercent, yPercent }
  inline_buttons_json TEXT NOT NULL DEFAULT '[]',

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

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

-- Old single-product table, kept only so we can migrate its data once.
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  price_kobo INTEGER NOT NULL,
  currency TEXT NOT NULL,
  product_name TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`);

// --- Add product_id to transactions/visits if this is an existing database
// from before multi-product support. CREATE TABLE IF NOT EXISTS above is a
// no-op on tables that already exist, so this ALTER step is what actually
// upgrades a live production database without losing any rows. ---
function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}
if (!columnExists("transactions", "product_id")) {
  db.exec(`ALTER TABLE transactions ADD COLUMN product_id INTEGER`);
}
if (!columnExists("visits", "product_id")) {
  db.exec(`ALTER TABLE visits ADD COLUMN product_id INTEGER`);
}
if (!columnExists("products", "delivery_type")) {
  db.exec(`ALTER TABLE products ADD COLUMN delivery_type TEXT NOT NULL DEFAULT 'pdf'`);
}
if (!columnExists("products", "telegram_link")) {
  db.exec(`ALTER TABLE products ADD COLUMN telegram_link TEXT`);
}

db.exec(`
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  reference TEXT,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  likes INTEGER NOT NULL DEFAULT 0,
  liked_sessions_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_session ON visits(session_id);
CREATE INDEX IF NOT EXISTS idx_visits_product ON visits(product_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
`);

export default db;

// --- One-time migration: old single-product `settings` row becomes the
// first product (slug "acnepurge", flagged as the default served at "/"). ---
const productCount = db.prepare(`SELECT COUNT(*) as n FROM products`).get().n;
if (productCount === 0) {
  const oldSettings = db.prepare(`SELECT * FROM settings WHERE id = 1`).get();
  const now = Date.now();

  const name = oldSettings?.product_name || process.env.PRODUCT_NAME || "Flawless Natural Remedies - 8 Steps PDF";
  const priceKobo = oldSettings?.price_kobo || Number(process.env.PRODUCT_PRICE_KOBO) || 499;
  const currency = oldSettings?.currency || process.env.PRODUCT_CURRENCY || "USD";
  const oldPdfPath = process.env.PDF_FILE_PATH || "./data/flawless-natural-remedies.pdf";

  db.prepare(
    `INSERT INTO products
      (slug, name, price_kobo, currency, mode, is_default, pdf_file_path,
       floating_label, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'template', 1, ?, 'Get Access', ?, ?)`
  ).run("acnepurge", name, priceKobo, currency, oldPdfPath, now, now);

  const newProductId = db.prepare(`SELECT id FROM products WHERE slug = 'acnepurge'`).get().id;

  // Carry old transactions/visits forward onto this product so history isn't lost.
  db.prepare(`UPDATE transactions SET product_id = ? WHERE product_id IS NULL`).run(newProductId);
  db.prepare(`UPDATE visits SET product_id = ? WHERE product_id IS NULL`).run(newProductId);
}

export function getDefaultProduct() {
  return db.prepare(`SELECT * FROM products WHERE is_default = 1 LIMIT 1`).get();
}

export function getProductBySlug(slug) {
  return db.prepare(`SELECT * FROM products WHERE slug = ?`).get(slug);
}

export function getProductById(id) {
  return db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
}

export function listProducts() {
  return db
    .prepare(`SELECT id, slug, name, price_kobo, currency, mode, is_default, updated_at FROM products ORDER BY created_at ASC`)
    .all();
}
