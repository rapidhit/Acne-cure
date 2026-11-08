import db from "./db.js";

// A visitor's welcome discount: for the first `discount_window_minutes` after
// they first see the page, they really are charged the discounted price. After
// that the normal price applies until 24 hours have passed since their offer
// started, when a fresh window begins on their next visit.
const CYCLE_MS = 24 * 60 * 60 * 1000;

export const VISITOR_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function discountedPrice(priceKobo, percent) {
  return Math.max(1, Math.round((priceKobo * (100 - percent)) / 100));
}

/**
 * @param create  true on page load (starts a window if the visitor is due one);
 *                false at checkout (only honours a window that already exists).
 */
export function getOffer(product, visitorId, { create }) {
  const percent = Number(product?.discount_percent) || 0;
  if (!percent || !VISITOR_ID_RE.test(String(visitorId || ""))) return { active: false };

  const windowMs = (Number(product.discount_window_minutes) || 30) * 60 * 1000;
  const now = Date.now();
  const row = db
    .prepare(`SELECT started_at FROM visitor_offers WHERE visitor_id = ? AND product_id = ?`)
    .get(visitorId, product.id);

  let startedAt = row?.started_at;
  if (startedAt == null || now - startedAt >= CYCLE_MS) {
    if (!create) return { active: false };
    startedAt = now;
    db.prepare(
      `INSERT INTO visitor_offers (visitor_id, product_id, started_at) VALUES (?, ?, ?)
       ON CONFLICT(visitor_id, product_id) DO UPDATE SET started_at = excluded.started_at`
    ).run(visitorId, product.id, startedAt);
  }

  const expiresAt = startedAt + windowMs;
  if (now < expiresAt) return { active: true, percent, expiresAt, now };
  return { active: false, now };
}
