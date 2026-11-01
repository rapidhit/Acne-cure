import axios from "axios";
import crypto from "node:crypto";

export const name = "bachs";

function apiKey() {
  return process.env.BACHS_API_KEY;
}

// sk_sandbox_... keys talk to the sandbox API, sk_live_... keys to production.
// BACHS_API_BASE can override this (used for local testing).
function baseUrl() {
  if (process.env.BACHS_API_BASE) return process.env.BACHS_API_BASE.replace(/\/$/, "");
  return (apiKey() || "").startsWith("sk_sandbox_") ? "https://sandbox-api.bachs.io" : "https://api.bachs.io";
}

function authHeaders() {
  return { Authorization: `Bearer ${apiKey()}` };
}

// Bachs uses a hosted checkout page, so there is no browser-side public key.
export function isConfigured() {
  return Boolean(apiKey());
}

export function getPublicKey() {
  return null;
}

/**
 * Creates a hosted checkout session and returns where to send the buyer.
 * `amount` is in the smallest currency unit (e.g. 499 = 4.99) like everywhere
 * else in this app; Bachs wants a decimal string, so convert here.
 */
export async function createCheckout({ reference, email, amount, currency, successUrl, cancelUrl, productName }) {
  const { data } = await axios.post(
    `${baseUrl()}/v1/checkout-sessions`,
    {
      customer: { email, name: email.split("@")[0] || "Customer" },
      pricing: { currency, amount: (amount / 100).toFixed(2), price_type: "fixed" },
      reference,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { product: productName || "", reference },
      idempotency_key: reference,
    },
    { headers: authHeaders(), timeout: 15000 }
  );
  if (!data?.checkout_url || !data?.checkout_id) {
    throw new Error("Bachs did not return a checkout URL");
  }
  return { checkoutUrl: data.checkout_url, providerRef: data.checkout_id };
}

export async function verifyTransaction({ reference, providerRef }) {
  if (!providerRef) return { success: false };
  const { data } = await axios.get(`${baseUrl()}/v1/checkout-sessions/${encodeURIComponent(providerRef)}`, {
    headers: authHeaders(),
    timeout: 15000,
  });
  const charge = data?.charge || null;
  const lc = (v) => String(v || "").toLowerCase();
  const PAID = ["succeeded", "success", "successful", "completed", "paid"];
  const PENDING_STATUS = ["open"];
  const PENDING_PAYMENT = ["processing", "requires_action", "requires_confirmation", "pending"];
  const paid =
    lc(data?.status) === "completed" ||
    lc(data?.payment_status) === "succeeded" ||
    PAID.includes(lc(charge?.status));
  const failed = ["expired", "cancelled", "canceled"].includes(lc(data?.status)) || lc(data?.payment_status) === "failed";
  const pending =
    !paid &&
    !failed &&
    (PENDING_STATUS.includes(lc(data?.status)) ||
      PENDING_PAYMENT.includes(lc(data?.payment_status)) ||
      PENDING_PAYMENT.includes(lc(charge?.status)));

  // Bachs reports decimal strings (e.g. "4.99"); we compare in smallest units.
  const rawAmount = charge?.amount_paid ?? charge?.amount ?? data?.amount;
  const amountPaid = rawAmount != null ? Math.round(parseFloat(rawAmount) * 100) : undefined;

  if (!paid) {
    console.error(
      `bachs verify not paid: ref=${reference} checkout=${providerRef} status=${data?.status} payment_status=${data?.payment_status} charge_status=${charge?.status} reference_on_bachs=${data?.reference}`
    );
  } else if (lc(data?.reference) && data.reference !== reference) {
    console.error(`bachs verify: reference differs (ours=${reference}, bachs=${data.reference}) — accepted, matched by checkout id`);
  }

  return {
    success: paid,
    pending,
    amountPaid,
    currency: data?.currency ? String(data.currency).toUpperCase() : undefined,
    providerRef,
    raw: data,
  };
}

// Bachs signs "{timestamp}.{raw_body}" with HMAC-SHA256 using the webhook
// endpoint's signing secret (whsec_...), and rejects anything older than 5 min.
export function verifyWebhookSignature(rawBody, signatureHeader, headers = {}) {
  const secret = process.env.BACHS_WEBHOOK_SECRET;
  const timestamp = headers["x-bachs-timestamp"];
  if (!secret || !signatureHeader || !timestamp) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");
  const given = String(signatureHeader).trim();
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

const SUCCESS_EVENTS = new Set(["checkout.completed", "collection.succeeded"]);

function collectStrings(value, out = [], depth = 0) {
  if (depth > 4 || value == null) return out;
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out, depth + 1));
  else if (typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out, depth + 1));
  return out;
}

/**
 * The webhook only tells us *that* something succeeded. We don't trust the
 * payload for amounts: we pull every identifier out of it so the route can
 * match it to one of our transactions, then re-check with Bachs directly.
 */
export function parseWebhookEvent(bodyJson) {
  const type = bodyJson.event_type || bodyJson.type;
  if (!SUCCESS_EVENTS.has(type)) return null;
  return {
    success: true,
    verifyWithProvider: true,
    candidates: collectStrings(bodyJson),
  };
}
