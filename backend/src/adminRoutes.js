import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import db, { getSettings } from "./db.js";

const router = express.Router();

const VALID_CURRENCY = /^[A-Z]{3}$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB ceiling — plenty for a PDF guide
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

router.post("/login", (req, res) => {
  const { password } = req.body || {};
  if (!password || !timingSafeEqual(password, process.env.ADMIN_PASSWORD || "")) {
    return res.status(401).json({ error: "Incorrect password" });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/session", (req, res) => {
  res.json({ isAdmin: !!req.session?.isAdmin });
});

/**
 * GET /api/admin/stats
 * Returns headline numbers + a daily sales/revenue/visits series for charting.
 */
router.get("/stats", requireAdmin, (req, res) => {
  const totals = db
    .prepare(
      `SELECT COUNT(*) as salesCount, COALESCE(SUM(amount),0) as revenue
       FROM transactions WHERE status = 'success'`
    )
    .get();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const today = db
    .prepare(
      `SELECT COUNT(*) as salesCount, COALESCE(SUM(amount),0) as revenue
       FROM transactions WHERE status = 'success' AND created_at >= ?`
    )
    .get(todayStart.getTime());

  const visitsTotal = db.prepare(`SELECT COUNT(DISTINCT session_id) as n FROM visits`).get();

  const conversionRate =
    visitsTotal.n > 0 ? Number(((totals.salesCount / visitsTotal.n) * 100).toFixed(2)) : 0;

  // Last 14 days, grouped by day (UTC-ish, using local server date)
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
         WHERE status = 'success' AND created_at >= ? AND created_at < ?`
      )
      .get(start, end);
    const visits = db
      .prepare(
        `SELECT COUNT(DISTINCT session_id) as n FROM visits WHERE created_at >= ? AND created_at < ?`
      )
      .get(start, end);
    return {
      date: d.toISOString().slice(0, 10),
      sales: sales.n,
      revenue: sales.revenue,
      visits: visits.n,
    };
  });

  const recentTransactions = db
    .prepare(
      `SELECT reference, email, amount, currency, status, download_count, created_at, verified_at
       FROM transactions ORDER BY created_at DESC LIMIT 25`
    )
    .all();

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

/**
 * GET /api/admin/settings
 * Returns the current editable product price/currency/name.
 */
router.get("/settings", requireAdmin, (req, res) => {
  res.json(getSettings());
});

/**
 * PUT /api/admin/settings
 * Body: { priceKobo, currency, productName }
 * Updates the live checkout price. Takes effect immediately —
 * no redeploy or env var change needed.
 */
router.put("/settings", requireAdmin, (req, res) => {
  const { priceKobo, currency, productName } = req.body || {};

  const price = Number(priceKobo);
  if (!Number.isInteger(price) || price <= 0) {
    return res.status(400).json({ error: "priceKobo must be a positive whole number (smallest currency unit)" });
  }
  const cur = String(currency || "").toUpperCase();
  if (!VALID_CURRENCY.test(cur)) {
    return res.status(400).json({ error: "currency must be a 3-letter code, e.g. USD, GHS, NGN" });
  }
  const name = String(productName || "").trim();
  if (!name) {
    return res.status(400).json({ error: "productName is required" });
  }

  db.prepare(
    `UPDATE settings SET price_kobo = ?, currency = ?, product_name = ?, updated_at = ? WHERE id = 1`
  ).run(price, cur, name, Date.now());

  res.json(getSettings());
});

/**
 * GET /api/admin/pdf-status
 * Reports whether the deliverable file is currently in place, and its size/date.
 */
router.get("/pdf-status", requireAdmin, (req, res) => {
  const filePath = path.resolve(process.env.PDF_FILE_PATH || "./data/flawless-natural-remedies.pdf");
  if (!fs.existsSync(filePath)) {
    return res.json({ exists: false });
  }
  const stat = fs.statSync(filePath);
  res.json({
    exists: true,
    sizeBytes: stat.size,
    updatedAt: stat.mtimeMs,
    fileName: path.basename(filePath),
  });
});

/**
 * POST /api/admin/upload-pdf
 * multipart/form-data, field name "file". Replaces the file customers receive
 * after a verified payment — takes effect immediately, no redeploy needed.
 */
router.post("/upload-pdf", requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file received (or it wasn't a PDF)" });
  }

  const filePath = path.resolve(process.env.PDF_FILE_PATH || "./data/flawless-natural-remedies.pdf");
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(filePath, req.file.buffer);

  const stat = fs.statSync(filePath);
  res.json({
    ok: true,
    sizeBytes: stat.size,
    updatedAt: stat.mtimeMs,
    fileName: path.basename(filePath),
  });
});

// Handle multer errors (wrong file type, too large) with a clean JSON response
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message || "Upload failed" });
  }
  next();
});

/**
 * DELETE /api/admin/transactions/pending
 * Removes all transactions still stuck in "pending" — abandoned checkouts
 * where the buyer never completed payment. Successful and failed
 * transactions are untouched since those are real records worth keeping.
 */
router.delete("/transactions/pending", requireAdmin, (req, res) => {
  const result = db.prepare(`DELETE FROM transactions WHERE status = 'pending'`).run();
  res.json({ ok: true, deletedCount: result.changes });
});

export default router;
