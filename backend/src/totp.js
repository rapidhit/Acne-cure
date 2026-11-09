import crypto from "node:crypto";

// Minimal RFC 6238 TOTP (SHA-1, 6 digits, 30s) — compatible with Google Authenticator,
// Microsoft Authenticator, Authy, 1Password, etc.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

export function generateSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function decodeBase32(str) {
  let bits = "";
  for (const ch of String(str).replace(/=+$/, "").toUpperCase()) {
    const v = ALPHABET.indexOf(ch);
    if (v === -1) throw new Error("Invalid base32");
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function hotp(key, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = h[h.length - 1] & 0xf;
  const code = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

/**
 * Returns the matched time-step number if `code` is valid (±1 step for clock drift),
 * otherwise null. Callers should reject steps <= the last accepted one (replay).
 */
export function verifyTotp(secret, code, now = Date.now()) {
  const clean = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const key = decodeBase32(secret);
  const current = Math.floor(now / 1000 / STEP_SECONDS);
  for (const w of [0, -1, 1]) {
    const step = current + w;
    const expected = hotp(key, step);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return step;
  }
  return null;
}

export function otpauthUrl(secret, account = "admin", issuer = "Flawless Console") {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
