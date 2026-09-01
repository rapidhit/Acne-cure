import axios from "axios";

// Free, no-API-key exchange rate service, base USD, refreshed daily upstream.
const FX_SOURCE = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — rates don't need per-request freshness

let cache = { rates: null, fetchedAt: 0 };

export async function getRates() {
  const isFresh = cache.rates && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
  if (isFresh) return cache;

  const { data } = await axios.get(FX_SOURCE, { timeout: 8000 });
  if (data?.result !== "success" || !data.rates) {
    throw new Error("Exchange rate provider returned an unexpected response");
  }
  cache = { rates: data.rates, fetchedAt: Date.now() };
  return cache;
}

/** Returns { rate, fetchedAt } — units of `to` per 1 USD — or null if unsupported. */
export async function getRateTo(to) {
  const { rates, fetchedAt } = await getRates();
  if (to === "USD") return { rate: 1, fetchedAt };
  const rate = rates[to];
  if (!rate) return null;
  return { rate, fetchedAt };
}
