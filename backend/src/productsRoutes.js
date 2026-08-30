import express from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { requireAdmin } from "./adminRoutes.js";
import db, { getProductById, listProducts } from "./db.js";

const router = express.Router();

const SLUG_RE = /^[a-z0-9-]{2,50}$/;
const VALID_CURRENCY = /^[A-Z]{3}$/;
const VALID_MODE = new Set(["template", "custom_code"]);
const VALID_FLOATING_POSITION = new Set(["top", "bottom", "scroll_trigger"]);
const VALID_STICK_TO = new Set(["top", "bottom"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") return cb(new Error("Only PDF files are allowed"));
    cb(null, true);
  },
});

function pdfPathFor(slug) {
  return path.resolve(`./data/products/${slug}.pdf`);
}

// --- List / read ---

router.get("/", requireAdmin, (req, res) => {
  res.json(listProducts());
});

router.get("/:id", requireAdmin, (req, res) => {
  const product = getProductById(Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// --- Create ---

router.post("/", requireAdmin, (req, res) => {
  const { slug, name, priceKobo, currency, mode } = req.body || {};

  const cleanSlug = String(slug || "").trim().toLowerCase();
  if (!SLUG_RE.test(cleanSlug)) {
    return res.status(400).json({ error: "Slug must be 2-50 characters: lowercase letters, numbers, and hyphens only" });
  }
  if (db.prepare(`SELECT id FROM products WHERE slug = ?`).get(cleanSlug)) {
    return res.status(409).json({ error: "That URL path is already taken by another product" });
  }
  const cleanName = String(name || "").trim();
  if (!cleanName) return res.status(400).json({ error: "Product name is required" });

  const price = Number(priceKobo);
  if (!Number.isInteger(price) || price <= 0) {
    return res.status(400).json({ error: "priceKobo must be a positive whole number" });
  }
  const cur = String(currency || "").toUpperCase();
  if (!VALID_CURRENCY.test(cur)) {
    return res.status(400).json({ error: "currency must be a 3-letter code, e.g. USD, GHS, NGN" });
  }
  const cleanMode = VALID_MODE.has(mode) ? mode : "template";

  const now = Date.now();
  const result = db
    .prepare(
      `INSERT INTO products (slug, name, price_kobo, currency, mode, pdf_file_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(cleanSlug, cleanName, price, cur, cleanMode, pdfPathFor(cleanSlug), now, now);

  res.json(getProductById(result.lastInsertRowid));
});

// --- Update (settings, template content, custom code, floating button) ---

router.put("/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const product = getProductById(id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const body = req.body || {};
  const updates = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return res.status(400).json({ error: "Product name cannot be empty" });
    updates.name = name;
  }
  if (body.priceKobo !== undefined) {
    const price = Number(body.priceKobo);
    if (!Number.isInteger(price) || price <= 0) {
      return res.status(400).json({ error: "priceKobo must be a positive whole number" });
    }
    updates.price_kobo = price;
  }
  if (body.currency !== undefined) {
    const cur = String(body.currency).toUpperCase();
    if (!VALID_CURRENCY.test(cur)) {
      return res.status(400).json({ error: "currency must be a 3-letter code" });
    }
    updates.currency = cur;
  }
  if (body.mode !== undefined) {
    if (!VALID_MODE.has(body.mode)) return res.status(400).json({ error: "Invalid mode" });
    updates.mode = body.mode;
  }
  if (body.headline !== undefined) updates.headline = String(body.headline);
  if (body.subheadline !== undefined) updates.subheadline = String(body.subheadline);
  if (body.testimonials !== undefined) updates.testimonials_json = JSON.stringify(body.testimonials);
  if (body.faqs !== undefined) updates.faqs_json = JSON.stringify(body.faqs);
  if (body.customHtml !== undefined) updates.custom_html = String(body.customHtml);

  if (body.floatingEnabled !== undefined) updates.floating_enabled = body.floatingEnabled ? 1 : 0;
  if (body.floatingLabel !== undefined) {
    const label = String(body.floatingLabel).trim();
    if (!label) return res.status(400).json({ error: "Floating button label cannot be empty" });
    updates.floating_label = label;
  }
  if (body.floatingPosition !== undefined) {
    if (!VALID_FLOATING_POSITION.has(body.floatingPosition)) {
      return res.status(400).json({ error: "Invalid floating button position" });
    }
    updates.floating_position = body.floatingPosition;
  }
  if (body.floatingScrollPercent !== undefined) {
    const pct = Number(body.floatingScrollPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ error: "floatingScrollPercent must be between 0 and 100" });
    }
    updates.floating_scroll_percent = Math.round(pct);
  }
  if (body.floatingStickTo !== undefined) {
    if (!VALID_STICK_TO.has(body.floatingStickTo)) {
      return res.status(400).json({ error: "floatingStickTo must be 'top' or 'bottom'" });
    }
    updates.floating_stick_to = body.floatingStickTo;
  }
  if (body.inlineButtons !== undefined) {
    if (!Array.isArray(body.inlineButtons)) {
      return res.status(400).json({ error: "inlineButtons must be an array" });
    }
    for (const btn of body.inlineButtons) {
      if (
        typeof btn.label !== "string" ||
        !btn.label.trim() ||
        typeof btn.xPercent !== "number" ||
        typeof btn.yPercent !== "number" ||
        btn.xPercent < 0 || btn.xPercent > 100 ||
        btn.yPercent < 0 || btn.yPercent > 100
      ) {
        return res.status(400).json({ error: "Each inline button needs a label, xPercent (0-100), and yPercent (0-100)" });
      }
    }
    updates.inline_buttons_json = JSON.stringify(body.inlineButtons);
  }

  const keys = Object.keys(updates);
  if (keys.length === 0) return res.json(product);

  updates.updated_at = Date.now();
  const setClause = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(updates);
  db.prepare(`UPDATE products SET ${setClause} WHERE id = ?`).run(...values, id);

  res.json(getProductById(id));
});

// --- Set as default (served at bare domain root) ---

router.post("/:id/set-default", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!getProductById(id)) return res.status(404).json({ error: "Product not found" });

  const now = Date.now();
  db.prepare(`UPDATE products SET is_default = 0, updated_at = ? WHERE is_default = 1`).run(now);
  db.prepare(`UPDATE products SET is_default = 1, updated_at = ? WHERE id = ?`).run(now, id);

  res.json(getProductById(id));
});

// --- Per-product PDF status/upload ---

router.get("/:id/pdf-status", requireAdmin, (req, res) => {
  const product = getProductById(Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });

  const filePath = path.resolve(product.pdf_file_path || pdfPathFor(product.slug));
  if (!fs.existsSync(filePath)) return res.json({ exists: false });

  const stat = fs.statSync(filePath);
  res.json({ exists: true, sizeBytes: stat.size, updatedAt: stat.mtimeMs, fileName: path.basename(filePath) });
});

router.post("/:id/upload-pdf", requireAdmin, upload.single("file"), (req, res) => {
  const product = getProductById(Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (!req.file) return res.status(400).json({ error: "No file received (or it wasn't a PDF)" });

  const filePath = path.resolve(product.pdf_file_path || pdfPathFor(product.slug));
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, req.file.buffer);

  if (!product.pdf_file_path) {
    db.prepare(`UPDATE products SET pdf_file_path = ? WHERE id = ?`).run(filePath, product.id);
  }

  const stat = fs.statSync(filePath);
  res.json({ ok: true, sizeBytes: stat.size, updatedAt: stat.mtimeMs, fileName: path.basename(filePath) });
});

// Clean JSON error responses for multer failures (wrong type, too large)
router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || "Upload failed" });
  next();
});

// --- Per-product stats ---

router.get("/:id/stats", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const product = getProductById(id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const totals = db
    .prepare(
      `SELECT COUNT(*) as salesCount, COALESCE(SUM(amount),0) as revenue
       FROM transactions WHERE status = 'success' AND product_id = ?`
    )
    .get(id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const today = db
    .prepare(
      `SELECT COUNT(*) as salesCount, COALESCE(SUM(amount),0) as revenue
       FROM transactions WHERE status = 'success' AND product_id = ? AND created_at >= ?`
    )
    .get(id, todayStart.getTime());

  const visitsTotal = db
    .prepare(`SELECT COUNT(DISTINCT session_id) as n FROM visits WHERE product_id = ?`)
    .get(id);

  const conversionRate =
    visitsTotal.n > 0 ? Number(((totals.salesCount / visitsTotal.n) * 100).toFixed(2)) : 0;

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const series = days.map((d) => {
    const start = d.getTime();
    const end = start + 24 * 60 * 60 * 1000;
    const sales = db
      .prepare(
        `SELECT COUNT(*) as n, COALESCE(SUM(amount),0) as revenue FROM transactions
         WHERE status = 'success' AND product_id = ? AND created_at >= ? AND created_at < ?`
      )
      .get(id, start, end);
    const visits = db
      .prepare(
        `SELECT COUNT(DISTINCT session_id) as n FROM visits WHERE product_id = ? AND created_at >= ? AND created_at < ?`
      )
      .get(id, start, end);
    return { date: d.toISOString().slice(0, 10), sales: sales.n, revenue: sales.revenue, visits: visits.n };
  });

  const recentTransactions = db
    .prepare(
      `SELECT reference, email, amount, currency, status, download_count, created_at, verified_at
       FROM transactions WHERE product_id = ? ORDER BY created_at DESC LIMIT 25`
    )
    .all(id);

  res.json({
    totals: {
      salesCount: totals.salesCount,
      revenue: totals.revenue,
      todaySalesCount: today.salesCount,
      todayRevenue: today.revenue,
      totalVisits: visitsTotal.n,
      conversionRate,
    },
    series,
    recentTransactions,
  });
});

router.delete("/:id/transactions/pending", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!getProductById(id)) return res.status(404).json({ error: "Product not found" });
  const result = db.prepare(`DELETE FROM transactions WHERE status = 'pending' AND product_id = ?`).run(id);
  res.json({ ok: true, deletedCount: result.changes });
});

export default router;
