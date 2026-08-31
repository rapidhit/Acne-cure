import express from "express";
import { getProductBySlug } from "./db.js";
import db from "./db.js";

const router = express.Router();

function toPublicShape(product) {
  if (!product) return null;
  return {
    slug: product.slug,
    name: product.name,
    priceKobo: product.price_kobo,
    currency: product.currency,
    mode: product.mode,
    headline: product.headline,
    subheadline: product.subheadline,
    testimonials: product.testimonials_json ? JSON.parse(product.testimonials_json) : [],
    faqs: product.faqs_json ? JSON.parse(product.faqs_json) : [],
    customHtml: product.mode === "custom_code" ? product.custom_html : undefined,
    floating: {
      enabled: !!product.floating_enabled,
      label: product.floating_label,
      position: product.floating_position,
      scrollPercent: product.floating_scroll_percent,
      stickTo: product.floating_stick_to,
    },
    inlineButtons: product.inline_buttons_json ? JSON.parse(product.inline_buttons_json) : [],
  };
}

/**
 * GET /api/public/products/:slug/reviews
 * Approved reviews only, most-liked first.
 */
router.get("/:slug/reviews", (req, res) => {
  const product = getProductBySlug(req.params.slug);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const reviews = db
    .prepare(
      `SELECT id, name, rating, body, likes, created_at FROM reviews
       WHERE product_id = ? AND status = 'approved'
       ORDER BY likes DESC, created_at DESC`
    )
    .all(product.id);

  res.json(reviews);
});

/**
 * GET /api/public/products/:slug
 * Powers flawless.hryders.com/<slug>
 * Nothing is exposed at the bare domain root — every product lives at its own slug.
 */
router.get("/:slug", (req, res) => {
  const product = getProductBySlug(req.params.slug);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(toPublicShape(product));
});

export default router;
