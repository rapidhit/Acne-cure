import axios from "axios";
import crypto from "node:crypto";

const BASE = "https://api.paystack.co";

function secretKey() {
  return process.env.PAYSTACK_SECRET_KEY;
}

export const name = "paystack";

export function getPublicKey() {
  return process.env.PAYSTACK_PUBLIC_KEY;
}

export async function verifyTransaction({ reference }) {
  const { data } = await axios.get(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const success = data?.data?.status === "success";
  return {
    success,
    amountPaid: data?.data?.amount,
    currency: data?.data?.currency,
    raw: data?.data,
  };
}

export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  const hash = crypto.createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  return hash === signatureHeader;
}

export function parseWebhookEvent(bodyJson) {
  if (bodyJson.event !== "charge.success") return null;
  return {
    reference: bodyJson.data?.reference,
    success: true,
    amountPaid: bodyJson.data?.amount,
    currency: bodyJson.data?.currency,
    raw: bodyJson.data,
  };
}
