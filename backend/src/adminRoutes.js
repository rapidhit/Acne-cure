import express from "express";
import crypto from "node:crypto";
import db from "./db.js";

const router = express.Router();

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

export default router;
