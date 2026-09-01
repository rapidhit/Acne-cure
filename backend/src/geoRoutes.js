import express from "express";
import axios from "axios";
import { getRateTo } from "./fxCache.js";

const router = express.Router();

// Only countries we actually offer a currency for in the admin dropdown.
// Anything else falls back to null (meaning: show the product's real currency).
const COUNTRY_TO_CURRENCY = {
  GH: "GHS",
  NG: "NGN",
  KE: "KES",
  ZA: "ZAR",
  GB: "GBP",
  US: "USD",
  CA: "CAD",
  AU: "AUD",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", IE: "EUR",
  PT: "EUR", BE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR",
};

const GEO_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour per IP
const geoCache = new Map(); // ip -> { country, fetchedAt }

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip;
}

/**
 * GET /api/public/geo-currency
 * Detects the visitor's country from their IP and maps it to a currency
 * we support. Never breaks the page — any failure just returns currency: null,
 * meaning "show the product's own currency, no localization."
 */
router.get("/geo-currency", async (req, res) => {
  const ip = getClientIp(req);

  try {
    const cached = geoCache.get(ip);
    let country;
    if (cached && Date.now() - cached.fetchedAt < GEO_CACHE_TTL_MS) {
      country = cached.country;
    } else {
      const { data } = await axios.get(`https://ipwho.is/${encodeURIComponent(ip)}`, { timeout: 4000 });
      country = data?.success !== false ? data?.country_code : null;
      geoCache.set(ip, { country, fetchedAt: Date.now() });
    }

    const currency = country ? COUNTRY_TO_CURRENCY[country] || null : null;
    res.json({ country: country || null, currency });
  } catch (err) {
    console.error("Geo lookup failed:", err.message);
    res.json({ country: null, currency: null }); // fail soft — page still works
  }
});

/**
 * GET /api/public/fx-rate?to=GHS
 * Public read of the same cached exchange rates, used to compute a
 * localized display price. No auth — it's just cached, read-only data.
 */
router.get("/fx-rate", async (req, res) => {
  const to = String(req.query.to || "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(to)) {
    return res.status(400).json({ error: "Query param 'to' must be a 3-letter currency code" });
  }
  try {
    const result = await getRateTo(to);
    if (!result) return res.status(404).json({ error: `No exchange rate available for ${to}` });
    res.json({ rate: result.rate, base: "USD", to, fetchedAt: result.fetchedAt });
  } catch (err) {
    console.error("Public FX rate fetch failed:", err.message);
    res.status(502).json({ error: "Could not fetch a live exchange rate right now." });
  }
});

export default router;
