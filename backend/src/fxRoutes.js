import express from "express";
import axios from "axios";
import { requireAdmin } from "./adminRoutes.js";

const router = express.Router();

// Free, no-API-key exchange rate service, base USD, refreshed daily upstream.
const FX_SOURCE = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — rates don't need per-request freshness

let cache = { rates: null, fetchedAt: 0 };

async function getRates() {
  const isFresh = cache.rates && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
  if (isFresh) return cache;

  const { data } = await axios.get(FX_SOURCE, { timeout: 8000 });
  if (data?.result !== "success" || !data.rates) {
    throw new Error("Exchange rate provider returned an unexpected response");
  }
  cache = { rates: data.rates, fetchedAt: Date.now() };
  return cache;
}

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
    const { rates, fetchedAt } = await getRates();
    if (to === "USD") {
      return res.json({ rate: 1, base: "USD", to, fetchedAt });
    }
    const rate = rates[to];
    if (!rate) {
      return res.status(404).json({ error: `No exchange rate available for ${to}` });
    }
    res.json({ rate, base: "USD", to, fetchedAt });
  } catch (err) {
    console.error("FX rate fetch failed:", err.message);
    res.status(502).json({ error: "Could not fetch a live exchange rate right now. Try again shortly." });
  }
});

export default router;
