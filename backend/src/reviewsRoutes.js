import express from "express";
import db, { getProductBySlug, getProductById } from "./db.js";
import { requireAdmin } from "./adminRoutes.js";

export const publicReviewsRouter = express.Router();
export const adminReviewsRouter = express.Router();

const MAX_NAME_LEN = 60;
const MAX_BODY_LEN = 1000;

/**
 * POST /api/reviews
 * Body: { reference, name, rating, body }
 * Only accepted for a transaction that actually completed successfully —
 * this ties every review to a real, verified purchase.
 */
publicReviewsRouter.post("/", (req, res) => {
  const { reference, name, rating, body } = req.body || {};

  if (!reference) return res.status(400).json({ error: "reference is required" });
  const tx = db.prepare(`SELECT * FROM transactions WHERE reference = ?`).get(reference);
  if (!tx || tx.status !== "success") {
    return res.status(403).json({ error: "Reviews can only be left for a completed purchase" });
  }
  if (!tx.product_id) {
    return res.status(400).json({ error: "This order has no associated product" });
  }

  const cleanName = String(name || "").trim().slice(0, MAX_NAME_LEN);
  if (!cleanName) return res.status(400).json({ error: "Name is required" });

  const cleanRating = Number(rating);
  if (!Number.isInteger(cleanRating) || cleanRating < 1 || cleanRating > 5) {
    return res.status(400).json({ error: "Rating must be a whole number from 1 to 5" });
  }

  const cleanBody = String(body || "").trim().slice(0, MAX_BODY_LEN);
  if (!cleanBody) return res.status(400).json({ error: "Review text is required" });

  // One review per completed order.
  const existing = db.prepare(`SELECT id FROM reviews WHERE reference = ?`).get(reference);
  if (existing) {
    return res.status(409).json({ error: "You've already submitted a review for this order" });
  }

  db.prepare(
    `INSERT INTO reviews (product_id, reference, name, rating, body, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  ).run(tx.product_id, reference, cleanName, cleanRating, cleanBody, Date.now());

  res.json({ ok: true, message: "Thanks! Your review will appear after it's approved." });
});

/**
 * POST /api/reviews/:id/like
 * Body: { sessionId }
 * One like per browser session per review — tracked server-side so it
 * can't just be reset by clearing sessionStorage and clicking again... well,
 * it can, but this stops trivial double-click spam without requiring accounts.
 */
publicReviewsRouter.post("/:id/like", (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

  const review = db.prepare(`SELECT * FROM reviews WHERE id = ? AND status = 'approved'`).get(req.params.id);
  if (!review) return res.status(404).json({ error: "Review not found" });

  const likedSessions = JSON.parse(review.liked_sessions_json || "[]");
  if (likedSessions.includes(sessionId)) {
    return res.json({ likes: review.likes, alreadyLiked: true });
  }

  likedSessions.push(sessionId);
  const newLikes = review.likes + 1;
  db.prepare(`UPDATE reviews SET likes = ?, liked_sessions_json = ? WHERE id = ?`).run(
    newLikes,
    JSON.stringify(likedSessions),
    review.id
  );

  res.json({ likes: newLikes, alreadyLiked: false });
});

/**
 * GET /api/admin/reviews?productId=123
 * All reviews (any status) for a product, newest first.
 */
adminReviewsRouter.get("/", requireAdmin, (req, res) => {
  const productId = Number(req.query.productId);
  if (!productId) return res.status(400).json({ error: "productId query param is required" });

  const reviews = db
    .prepare(`SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC`)
    .all(productId);
  res.json(reviews);
});

adminReviewsRouter.post("/:id/approve", requireAdmin, (req, res) => {
  const result = db.prepare(`UPDATE reviews SET status = 'approved' WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Review not found" });
  res.json({ ok: true });
});

adminReviewsRouter.post("/:id/reject", requireAdmin, (req, res) => {
  const result = db.prepare(`UPDATE reviews SET status = 'rejected' WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Review not found" });
  res.json({ ok: true });
});

adminReviewsRouter.delete("/:id", requireAdmin, (req, res) => {
  const result = db.prepare(`DELETE FROM reviews WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Review not found" });
  res.json({ ok: true });
});
