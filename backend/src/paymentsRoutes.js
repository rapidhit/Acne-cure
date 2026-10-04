import express from "express";
import { nanoid } from "nanoid";
import path from "node:path";
import fs from "node:fs";
import db, { getProductBySlug, getProductById } from "./db.js";
import { notifySale } from "./notify.js";
import { getProvider, PROVIDER_NAMES } from "./providers/index.js";

const router = express.Router();

const TOKEN_TTL_MS = (Number(process.env.DOWNLOAD_TOKEN_TTL_MINUTES) || 60) * 60 * 1000;

function issueDownloadToken(txId) {
  const token = nanoid(32);
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  db.prepare(
    `UPDATE transactions SET download_token = ?, download_token_expires_at = ? WHERE id = ?`
  ).run(token, expiresAt, txId);
  return { token, expiresAt };
}

function markSuccess(tx, verifyResult) {
  const { token } = issueDownloadToken(tx.id);
  db.prepare(
    `UPDATE transactions
     SET status = 'success', paystack_response = ?, verified_at = ?, download_token = ?, provider_ref = ?
     WHERE id = ?`
  ).run(
    JSON.stringify(verifyResult.raw || {}),
    Date.now(),
    token,
    verifyResult.providerRef || tx.provider_ref || null,
    tx.id
  );

  const product = tx.product_id ? getProductById(tx.product_id) : null;
  notifySale({
    email: tx.email,
    amount: tx.amount,
    currency: tx.currency,
    reference: tx.reference,
    productName: product?.name,
  });

  return { token, product };
}

/**
 * POST /api/payments/init
 * Body: { email, productSlug }
 * Creates a pending transaction tied to a product, using whichever payment
 * provider that product is currently configured to use.
 */
router.post("/init", (req, res) => {
  const { email, productSlug } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  if (!productSlug) return res.status(400).json({ error: "productSlug is required" });

  const product = getProductBySlug(productSlug);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const providerName = PROVIDER_NAMES.includes(product.payment_provider) ? product.payment_provider : "paystack";
  const provider = getProvider(providerName);
  const publicKey = provider.getPublicKey();
  if (!publicKey) {
    return res.status(500).json({ error: `${providerName} is not configured on this server yet.` });
  }

  const reference = `fnr_${nanoid(20)}`;

  db.prepare(
    `INSERT INTO transactions (product_id, reference, email, amount, currency, status, provider, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(product.id, reference, email, product.price_kobo, product.currency, providerName, Date.now());

  res.json({
    reference,
    amount: product.price_kobo,
    currency: product.currency,
    publicKey,
    provider: providerName,
  });
});

/**
 * POST /api/payments/verify
 * Body: { reference, providerRef? }
 * Called by the frontend right after the checkout popup reports success.
 * Re-verifies directly with whichever gateway this transaction used —
 * never trusts the frontend's claim.
 */
router.post("/verify", async (req, res) => {
  const { reference, providerRef } = req.body || {};
  if (!reference) return res.status(400).json({ error: "reference is required" });

  const tx = db.prepare(`SELECT * FROM transactions WHERE reference = ?`).get(reference);
  if (!tx) return res.status(404).json({ error: "Unknown transaction" });

  if (tx.status === "success") {
    const product = tx.product_id ? getProductById(tx.product_id) : null;
    return res.json({
      status: "success",
      downloadUrl: `/api/payments/download/${tx.download_token}`,
      deliveryType: product?.delivery_type || "pdf",
    });
  }

  try {
    const provider = getProvider(tx.provider || "paystack");
    const result = await provider.verifyTransaction({ reference, providerRef });

    if (result.success && result.amountPaid >= tx.amount) {
      const { token, product } = markSuccess(tx, { ...result, providerRef });
      return res.json({
        status: "success",
        downloadUrl: `/api/payments/download/${token}`,
        deliveryType: product?.delivery_type || "pdf",
      });
    }

    db.prepare(`UPDATE transactions SET status = 'failed', paystack_response = ? WHERE id = ?`).run(
      JSON.stringify(result.raw || {}),
      tx.id
    );
    return res.status(402).json({ status: "failed", error: "Payment not confirmed by the payment provider" });
  } catch (err) {
    console.error(`${tx.provider} verify error:`, err?.response?.data || err.message);
    return res.status(502).json({ error: "Could not verify payment right now. Try again shortly." });
  }
});

/**
 * GET /api/payments/download/:token
 * Serves the correct product's PDF, or redirects to its Telegram invite
 * link, only if the token is valid, unexpired, and tied to a successful
 * transaction. Gateway-agnostic — works the same regardless of which
 * provider was used to pay.
 */
router.get("/download/:token", (req, res) => {
  const { token } = req.params;
  const tx = db.prepare(`SELECT * FROM transactions WHERE download_token = ?`).get(token);

  if (!tx || tx.status !== "success") {
    return res.status(403).send("Invalid or unauthorized download link.");
  }
  if (Date.now() > tx.download_token_expires_at) {
    return res.status(410).send("This download link has expired. Contact support with your payment reference.");
  }

  const product = tx.product_id ? getProductById(tx.product_id) : null;
  if (!product) {
    return res.status(500).send("Product record missing for this order. Contact support.");
  }

  if (product.delivery_type === "telegram") {
    if (!product.telegram_link) {
      console.error("Telegram link missing for product", product.slug);
      return res.status(500).send("Access link not configured yet. Contact support with your payment reference.");
    }
    db.prepare(`UPDATE transactions SET download_count = download_count + 1 WHERE id = ?`).run(tx.id);
    return res.redirect(302, product.telegram_link);
  }

  const filePath = path.resolve(product.pdf_file_path || `./data/products/${product.slug}.pdf`);
  if (!fs.existsSync(filePath)) {
    console.error("PDF file missing at", filePath, "for product", product.slug);
    return res.status(500).send("File temporarily unavailable. Contact support.");
  }

  db.prepare(`UPDATE transactions SET download_count = download_count + 1 WHERE id = ?`).run(tx.id);
  res.download(filePath, `${product.slug}.pdf`);
});

/**
 * POST /api/payments/webhook/:provider
 * One parameterized webhook endpoint per gateway. Mounted with
 * express.raw() in server.js, BEFORE the global express.json() parser,
 * so the raw bytes are available for signature verification.
 *
 * Signature verification differs per gateway:
 *  - Paystack: HMAC-SHA512 over the raw body, header x-paystack-signature
 *  - Flutterwave: plain shared-secret string match, header verif-hash
 *  - Korapay: HMAC-SHA256 over JUST the `data` sub-object, a custom header
 */
export async function handleWebhook(req, res) {
  const providerName = req.params.provider;
  if (!PROVIDER_NAMES.includes(providerName)) return res.sendStatus(404);

  const provider = getProvider(providerName);

  let bodyJson;
  try {
    bodyJson = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).send("Invalid JSON body");
  }

  const signatureHeader =
    req.headers["x-paystack-signature"] || req.headers["verif-hash"] || req.headers["x-korapay-signature"];

  const validSignature =
    providerName === "korapay"
      ? provider.verifyWebhookSignature(bodyJson, signatureHeader)
      : provider.verifyWebhookSignature(req.body, signatureHeader);

  if (!validSignature) return res.status(401).send("Invalid signature");

  const event = provider.parseWebhookEvent(bodyJson);
  if (event?.success && event.reference) {
    const tx = db.prepare(`SELECT * FROM transactions WHERE reference = ?`).get(event.reference);
    if (tx && tx.status !== "success" && event.amountPaid >= tx.amount) {
      markSuccess(tx, event);
    }
  }

  res.sendStatus(200);
}

export default router;
