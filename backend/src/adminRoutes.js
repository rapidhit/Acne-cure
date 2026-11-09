import express from "express";
import crypto from "node:crypto";
import QRCode from "qrcode";
import db from "./db.js";
import { generateSecret, verifyTotp, otpauthUrl } from "./totp.js";

const router = express.Router();

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

// Set ADMIN_DISABLE_2FA=true in the environment to get back in if you lose your
// authenticator (then turn 2FA off/on again from the Security tab).
function twoFactorRequired() {
  if (process.env.ADMIN_DISABLE_2FA === "true") return false;
  return Boolean(db.prepare(`SELECT 1 FROM admin_security WHERE id = 1`).get());
}

router.post("/login", (req, res) => {
  const { password, code } = req.body || {};
  if (!password || !timingSafeEqual(password, process.env.ADMIN_PASSWORD || "")) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  if (twoFactorRequired()) {
    // Password was right but we still need the authenticator code.
    if (!code) return res.json({ needsCode: true });
    const row = db.prepare(`SELECT totp_secret, last_step FROM admin_security WHERE id = 1`).get();
    const step = verifyTotp(row.totp_secret, code);
    if (!step || step <= row.last_step) {
      return res.status(401).json({ error: "Incorrect or expired code" });
    }
    db.prepare(`UPDATE admin_security SET last_step = ? WHERE id = 1`).run(step);
  }

  req.session.isAdmin = true;
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/session", (req, res) => {
  res.json({ isAdmin: !!req.session?.isAdmin });
});

router.get("/2fa/status", requireAdmin, (req, res) => {
  res.json({
    enabled: Boolean(db.prepare(`SELECT 1 FROM admin_security WHERE id = 1`).get()),
    bypassed: process.env.ADMIN_DISABLE_2FA === "true",
  });
});

// Step 1: make a secret + QR code. Nothing is saved until the user proves their
// authenticator works by entering a valid code (step 2).
router.post("/2fa/setup", requireAdmin, async (req, res) => {
  const secret = generateSecret();
  req.session.pendingTotpSecret = secret;
  const url = otpauthUrl(secret);
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 220 });
  res.json({ secret, qr });
});

router.post("/2fa/enable", requireAdmin, (req, res) => {
  const secret = req.session.pendingTotpSecret;
  if (!secret) return res.status(400).json({ error: "Start setup first" });
  const step = verifyTotp(secret, req.body?.code);
  if (!step) return res.status(400).json({ error: "That code didn't match. Check the time on your phone and try again." });
  db.prepare(
    `INSERT INTO admin_security (id, totp_secret, last_step, enabled_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET totp_secret = excluded.totp_secret, last_step = excluded.last_step, enabled_at = excluded.enabled_at`
  ).run(secret, step, Date.now());
  delete req.session.pendingTotpSecret;
  res.json({ ok: true });
});

router.post("/2fa/disable", requireAdmin, (req, res) => {
  const row = db.prepare(`SELECT totp_secret, last_step FROM admin_security WHERE id = 1`).get();
  if (!row) return res.json({ ok: true });
  const step = verifyTotp(row.totp_secret, req.body?.code);
  if (!step || step <= row.last_step) return res.status(400).json({ error: "Incorrect or expired code" });
  db.prepare(`DELETE FROM admin_security WHERE id = 1`).run();
  res.json({ ok: true });
});

export default router;
