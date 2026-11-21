import express from "express";
import fs from "node:fs";
import path from "node:path";

// Public: serves uploaded landing-page videos. sendFile gives correct video
// content types and HTTP Range support, which phones need to play and seek.
export const VIDEO_DIR = path.resolve("./data/videos");

const router = express.Router();

router.get("/video/:file", (req, res) => {
  const name = req.params.file;
  if (!/^[a-z0-9][a-z0-9._-]{0,120}$/i.test(name) || name.includes("..")) {
    return res.status(404).end();
  }
  const filePath = path.join(VIDEO_DIR, name);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath, { maxAge: "7d", immutable: true });
});

export default router;
