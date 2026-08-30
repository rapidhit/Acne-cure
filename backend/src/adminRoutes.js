import express from "express";
import crypto from "node:crypto";

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

router.post("/login", (req, res) => {
  const { password } = req.body || {};
  if (!password || !timingSafeEqual(password, process.env.ADMIN_PASSWORD || "")) {
    return res.status(401).json({ error: "Incorrect password" });
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

export default router;
