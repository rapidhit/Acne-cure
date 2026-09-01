import express from "express";
import { requireAdmin } from "./adminRoutes.js";
import { getRateTo } from "./fxCache.js";

const router = express.Router();

/**
 * GET /api/admin/fx-rate?to=GHS
 * Returns how many units of `to` currency equal 1 USD right now.
 */
router.get("/", requireAdmin, async (req, res) => {
  const to = String(req.query.to || "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(to)) {
    return res.status(400).json({ error: "Query param 'to' must be a 3-letter currency code" });
  }

  try {
    const result = await getRateTo(to);
    if (!result) return res.status(404).json({ error: `No exchange rate available for ${to}` });
    res.json({ rate: result.rate, base: "USD", to, fetchedAt: result.fetchedAt });
  } catch (err) {
    console.error("FX rate fetch failed:", err.message);
    res.status(502).json({ error: "Could not fetch a live exchange rate right now. Try again shortly." });
  }
});

export default router;
