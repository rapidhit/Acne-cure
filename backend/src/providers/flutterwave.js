import axios from "axios";

const BASE = "https://api.flutterwave.com/v3";

function secretKey() {
  return process.env.FLUTTERWAVE_SECRET_KEY;
}

export const name = "flutterwave";

export function getPublicKey() {
  return process.env.FLUTTERWAVE_PUBLIC_KEY;
}

export async function verifyTransaction({ reference, providerRef }) {
  let id = providerRef;

  if (!id) {
    // Buyer verification call doesn't have the numeric id yet (frontend
    // only knows the tx_ref it generated), so look it up first.
    const { data } = await axios.get(`${BASE}/transactions`, {
      headers: { Authorization: `Bearer ${secretKey()}` },
      params: { tx_ref: reference },
    });
    id = data?.data?.[0]?.id;
    if (!id) return { success: false };
  }

  const { data } = await axios.get(`${BASE}/transactions/${id}/verify`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const tx = data?.data;
  const success = data?.status === "success" && tx?.status === "successful" && tx?.tx_ref === reference;
  return {
    success,
    amountPaid: tx?.amount,
    currency: tx?.currency,
    providerRef: tx?.id,
    raw: tx,
  };
}

export function verifyWebhookSignature(rawBody, signatureHeader) {
  // Flutterwave does NOT use HMAC — it's a plain shared-secret string
  // match against the 'verif-hash' header, set in your dashboard.
  const expected = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  return Boolean(expected) && signatureHeader === expected;
}

export function parseWebhookEvent(bodyJson) {
  if (bodyJson.event !== "charge.completed") return null;
  const data = bodyJson.data;
  if (data?.status !== "successful") return null;
  return {
    reference: data?.tx_ref,
    providerRef: data?.id,
    success: true,
    amountPaid: data?.amount,
    currency: data?.currency,
    raw: data,
  };
}
