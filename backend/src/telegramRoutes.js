import express from "express";
import { sendTelegramMessage } from "./notify.js";

const router = express.Router();

/**
 * POST /api/telegram/webhook
 * Telegram calls this every time someone messages the bot.
 * We only reply to the owner's configured chat ID, and only so you have a
 * quick way to confirm the bot is alive: message it "hi" and it replies.
 */
router.post("/webhook", (req, res) => {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.sendStatus(401);
  }

  const message = req.body?.message;
  const ownerChatId = process.env.TELEGRAM_CHAT_ID;

  if (message?.chat?.id && String(message.chat.id) === String(ownerChatId)) {
    sendTelegramMessage(
      message.chat.id,
      "Hey CEO Longdon 👋 I'm watching every purchase on Flawless Natural Remedies — I'll ping you the moment one comes in, even if a pin drops. 📌💰"
    );
  }

  // Always 200 quickly — Telegram disables the webhook if it sees repeated failures/timeouts
  res.sendStatus(200);
});

export default router;
