import axios from "axios";
import crypto from "node:crypto";

const BASE = "https://api.korapay.com/merchant/api/v1";

function secretKey() {
  return process.env.KORAPAY_SECRET_KEY;
}

export const name = "korapay";

export function getPublicKey() {
  return process.env.KORAPAY_PUBLIC_KEY;
}

export async function verifyTransaction({ reference }) {
  const { data } = await axios.get(`${BASE}/charges/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const tx = data?.data;
  const success = data?.status === true && tx?.status === "success";
  return {
    success,
    // Korapay reports amount as a decimal currency value (e.g. 4.99), while
    // we store/compare everything in the smallest unit (e.g. 499) — convert
    // here so paymentsRoutes.js stays provider-agnostic.
    amountPaid: tx?.amount != null ? Math.round(tx.amount * 100) : undefined,
    currency: tx?.currency,
    raw: tx,
  };
}

export function verifyWebhookSignature(bodyJson, signatureHeader) {
  // Korapay signs only the `data` sub-object, not the full webhook body.
  if (!signatureHeader || !bodyJson?.data) return false;
  const hash = crypto.createHmac("sha256", secretKey()).update(JSON.stringify(bodyJson.data)).digest("hex");
  return hash === signatureHeader;
}

export function parseWebhookEvent(bodyJson) {
  if (bodyJson.event !== "charge.success") return null;
  const data = bodyJson.data;
  return {
    reference: data?.reference,
    success: true,
    amountPaid: data?.amount != null ? Math.round(data.amount * 100) : undefined,
    currency: data?.currency,
    raw: data,
  };
}
