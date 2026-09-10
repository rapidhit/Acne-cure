import express from "express";
import db, { getProductBySlug } from "./db.js";

const router = express.Router();

/**
 * POST /api/track/visit
 * Body: { sessionId, path, referrer, productSlug }
 * Fire-and-forget beacon called once per page load on the frontend.
 * sessionId is a random ID generated client-side and stored in sessionStorage
 * (not a cookie, not tied to identity) so repeat views in one visit aren't double counted.
 */
router.post("/visit", (req, res) => {
  const { sessionId, path: pagePath, referrer, productSlug } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });

  const product = productSlug ? getProductBySlug(productSlug) : null;

  db.prepare(
    `INSERT INTO visits (product_id, session_id, path, referrer, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    product ? product.id : null,
    String(sessionId).slice(0, 64),
    String(pagePath || "/").slice(0, 255),
    String(referrer || "").slice(0, 255),
    String(req.headers["user-agent"] || "").slice(0, 255),
    Date.now()
  );

  res.sendStatus(204);
});

/**
 * POST /api/track/email-capture
 * Body: { email, productSlug, sessionId }
 * Fired only when someone typed an email and closed checkout WITHOUT ever
 * clicking "Continue to Payment" — i.e. they changed their mind before even
 * attempting a purchase. (If they did click through, that's already captured
 * as a 'pending' transaction, so this stays specific to true drop-offs.)
 */
router.post("/email-capture", (req, res) => {
  const { email, productSlug, sessionId } = req.body || {};
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const product = productSlug ? getProductBySlug(productSlug) : null;
  if (!product) return res.status(404).json({ error: "Product not found" });

  db.prepare(
    `INSERT INTO email_captures (product_id, email, session_id, created_at) VALUES (?, ?, ?, ?)`
  ).run(product.id, cleanEmail.slice(0, 255), sessionId ? String(sessionId).slice(0, 64) : null, Date.now());

  res.sendStatus(204);
});

export default router;
