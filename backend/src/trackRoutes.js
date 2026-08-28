import express from "express";
import db from "./db.js";

const router = express.Router();

/**
 * POST /api/track/visit
 * Body: { sessionId, path, referrer }
 * Fire-and-forget beacon called once per page load on the frontend.
 * sessionId is a random ID generated client-side and stored in sessionStorage
 * (not a cookie, not tied to identity) so repeat views in one visit aren't double counted.
 */
router.post("/visit", (req, res) => {
  const { sessionId, path: pagePath, referrer } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });

  db.prepare(
    `INSERT INTO visits (session_id, path, referrer, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    String(sessionId).slice(0, 64),
    String(pagePath || "/").slice(0, 255),
    String(referrer || "").slice(0, 255),
    String(req.headers["user-agent"] || "").slice(0, 255),
    Date.now()
  );

  res.sendStatus(204);
});

export default router;
