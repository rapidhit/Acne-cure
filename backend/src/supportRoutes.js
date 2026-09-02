import express from "express";
import axios from "axios";
import db from "./db.js";

const router = express.Router();

async function sendSupportMessage(chatId, text) {
  const token = process.env.SUPPORT_BOT_TOKEN;
  if (!token || !chatId) return null;
  try {
    const { data } = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
    });
    return data?.result || null;
  } catch (err) {
    console.error("Support bot send failed:", err?.response?.data || err.message);
    return null;
  }
}

/**
 * POST /api/support/webhook
 * Telegram calls this for every message sent to the support bot.
 *
 * - Message from a customer -> forwarded (as a fresh message, not a native
 *   Telegram forward, so it works even for users with forwarding privacy on)
 *   to the admin's chat, and the mapping is stored so a reply can be routed back.
 * - Message from the admin, replying to one of those forwarded messages ->
 *   relayed to the original customer, who only ever sees the bot.
 */
router.post("/webhook", async (req, res) => {
  const secret = process.env.SUPPORT_TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.sendStatus(401);
  }

  const message = req.body?.message;
  const adminChatId = process.env.TELEGRAM_CHAT_ID;

  if (message?.chat?.id && message.text) {
    const isFromAdmin = String(message.chat.id) === String(adminChatId);

    if (isFromAdmin && message.reply_to_message) {
      // Admin replying to a forwarded customer message — relay it back.
      const mapping = db
        .prepare(`SELECT * FROM support_messages WHERE admin_message_id = ?`)
        .get(message.reply_to_message.message_id);

      if (mapping) {
        await sendSupportMessage(mapping.customer_chat_id, message.text);
        await sendSupportMessage(adminChatId, "✅ Sent to customer.");
      } else {
        await sendSupportMessage(
          adminChatId,
          "⚠️ Couldn't find who to reply to — make sure you're replying directly to their forwarded message."
        );
      }
    } else if (!isFromAdmin) {
      // A real customer message — forward it to the admin.
      const from = message.from || {};
      const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || "Customer";
      const handle = from.username ? ` (@${from.username})` : "";

      const sent = await sendSupportMessage(
        adminChatId,
        `💬 New support message\nFrom: ${name}${handle}\n\n${message.text}`
      );

      if (sent?.message_id) {
        db.prepare(
          `INSERT INTO support_messages (admin_message_id, customer_chat_id, customer_name, created_at)
           VALUES (?, ?, ?, ?)`
        ).run(sent.message_id, message.chat.id, name, Date.now());
      }

      await sendSupportMessage(message.chat.id, "Thanks for reaching out! We'll get back to you shortly.");
    }
  }

  res.sendStatus(200);
});

export default router;
