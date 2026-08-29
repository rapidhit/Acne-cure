import express from "express";
import axios from "axios";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import path from "node:path";
import fs from "node:fs";
import db, { getSettings } from "./db.js";
import { notifySale } from "./notify.js";

const router = express.Router();

/**
 * GET /api/paystack/product
 * Public — lets the landing page always display the live price/currency
 * without hardcoding it in the frontend build.
 */
router.get("/product", (req, res) => {
  const { price_kobo, currency, product_name } = getSettings();
  res.json({ priceKobo: price_kobo, currency, productName: product_name });
});

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = "https://api.paystack.co";
const TOKEN_TTL_MS = (Number(process.env.DOWNLOAD_TOKEN_TTL_MINUTES) || 60) * 60 * 1000;

function issueDownloadToken(txId) {
  const token = nanoid(32);
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  db.prepare(
    `UPDATE transactions SET download_token = ?, download_token_expires_at = ? WHERE id = ?`
  ).run(token, expiresAt, txId);
  return { token, expiresAt };
}

/**
 * POST /api/paystack/init
 * Body: { email }
 * Creates a pending transaction row with a server-generated reference.
 * The frontend uses this reference + the PUBLIC key to open Paystack Inline JS.
 */
router.post("/init", (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const reference = `flw_${nanoid(20)}`;
  const { price_kobo: amount, currency } = getSettings();

  db.prepare(
    `INSERT INTO transactions (reference, email, amount, currency, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?)`
  ).run(reference, email, amount, currency, Date.now());

  res.json({
    reference,
    amount,
    currency,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  });
});

/**
 * POST /api/paystack/verify
 * Body: { reference }
 * Called by the frontend right after the Paystack popup reports success.
 * NEVER trusts the frontend's claim — re-verifies directly with Paystack's servers.
 */
router.post("/verify", async (req, res) => {
  const { reference } = req.body || {};
  if (!reference) return res.status(400).json({ error: "reference is required" });

  const tx = db.prepare(`SELECT * FROM transactions WHERE reference = ?`).get(reference);
  if (!tx) return res.status(404).json({ error: "Unknown transaction" });

  // Already verified — just return the existing token (idempotent)
  if (tx.status === "success") {
    return res.json({
      status: "success",
      downloadUrl: `/api/paystack/download/${tx.download_token}`,
    });
  }

  try {
    const { data } = await axios.get(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    const paystackStatus = data?.data?.status; // 'success' | 'failed' | 'abandoned'
    const paidAmount = data?.data?.amount;

    if (paystackStatus === "success" && paidAmount >= tx.amount) {
      const { token } = issueDownloadToken(tx.id);
      db.prepare(
        `UPDATE transactions SET status = 'success', paystack_response = ?, verified_at = ? WHERE id = ?`
      ).run(JSON.stringify(data.data), Date.now(), tx.id);

      notifySale({ email: tx.email, amount: tx.amount, currency: tx.currency, reference: tx.reference });

      return res.json({ status: "success", downloadUrl: `/api/paystack/download/${token}` });
    }

    db.prepare(
      `UPDATE transactions SET status = 'failed', paystack_response = ? WHERE id = ?`
    ).run(JSON.stringify(data.data || {}), tx.id);
    return res.status(402).json({ status: "failed", error: "Payment not confirmed by Paystack" });
  } catch (err) {
    console.error("Paystack verify error:", err?.response?.data || err.message);
    return res.status(502).json({ error: "Could not verify payment with Paystack" });
  }
});

/**
 * GET /api/paystack/download/:token
 * Serves the PDF only if the token is valid, unexpired, and tied to a successful transaction.
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

  const filePath = path.resolve(process.env.PDF_FILE_PATH || "./data/flawless-natural-remedies.pdf");
  if (!fs.existsSync(filePath)) {
    console.error("PDF file missing at", filePath);
    return res.status(500).send("File temporarily unavailable. Contact support.");
  }

  db.prepare(`UPDATE transactions SET download_count = download_count + 1 WHERE id = ?`).run(tx.id);
  res.download(filePath, "Flawless-Natural-Remedies-8-Steps.pdf");
});

/**
 * POST /api/paystack/webhook
 * Optional but recommended: catches successful payments even if the buyer
 * closes the tab before the frontend calls /verify. Mount this route with
 * express.raw() BEFORE express.json() in server.js so we can check the signature.
 */
router.post("/webhook", (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(req.body) // raw Buffer
    .digest("hex");

  if (hash !== signature) {
    return res.status(401).send("Invalid signature");
  }

  const event = JSON.parse(req.body.toString("utf8"));

  if (event.event === "charge.success") {
    const reference = event.data.reference;
    const tx = db.prepare(`SELECT * FROM transactions WHERE reference = ?`).get(reference);
    if (tx && tx.status !== "success") {
      const { token } = issueDownloadToken(tx.id);
      db.prepare(
        `UPDATE transactions SET status = 'success', paystack_response = ?, verified_at = ?, download_token = ? WHERE id = ?`
      ).run(JSON.stringify(event.data), Date.now(), token, tx.id);

      notifySale({ email: tx.email, amount: tx.amount, currency: tx.currency, reference: tx.reference });
    }
  }

  res.sendStatus(200);
});

export default router;
