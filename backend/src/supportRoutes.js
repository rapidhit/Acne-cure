import express from "express";
import axios from "axios";
import db from "./db.js";

const router = express.Router();

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const INSTRUCTIONS_TEXT =
  "Thanks for reaching out! To help you faster, please reply with these three things in ONE message:\n\n" +
  "Country: \nEmail (used for your purchase): \nProblem: \n\n" +
  "Sending it all together means we won't have to ask one by one.";
const DETAILS_RECEIVED_TEXT =
  "Thank you for providing the details! One of our support team will attend to it in a jiffy. 🙂";
const PLAIN_ACK_TEXT = "Thanks for reaching out! We'll get back to you shortly.";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function extractLabeled(text, label) {
  const match = text.match(new RegExp(`${label}\\s*:\\s*(.+)`, "i"));
  return match ? match[1].trim().replace(/\s+$/, "") : null;
}

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
      const chatId = String(message.chat.id);
      const today = todayString();
      const customer = db.prepare(`SELECT * FROM support_customers WHERE chat_id = ?`).get(chatId);

      const emailMatch = message.text.match(EMAIL_RE);
      const isProvidingDetailsNow = emailMatch && !customer?.details_provided;

      let email = customer?.email || null;
      let country = customer?.country || null;
      let ackText = null;

      if (isProvidingDetailsNow) {
        email = emailMatch[0];
        country = extractLabeled(message.text, "country") || country;
        db.prepare(
          `INSERT INTO support_customers (chat_id, email, country, details_provided, last_message_date, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?, ?)
           ON CONFLICT(chat_id) DO UPDATE SET
             email = excluded.email,
             country = excluded.country,
             details_provided = 1,
             last_message_date = excluded.last_message_date,
             updated_at = excluded.updated_at`
        ).run(chatId, email, country, today, Date.now(), Date.now());
        ackText = DETAILS_RECEIVED_TEXT;
      } else if (!customer) {
        db.prepare(
          `INSERT INTO support_customers (chat_id, details_provided, last_message_date, created_at, updated_at)
           VALUES (?, 0, ?, ?, ?)`
        ).run(chatId, today, Date.now(), Date.now());
        ackText = INSTRUCTIONS_TEXT;
      } else if (customer.last_message_date !== today) {
        db.prepare(`UPDATE support_customers SET last_message_date = ?, updated_at = ? WHERE chat_id = ?`).run(
          today,
          Date.now(),
          chatId
        );
        ackText = customer.details_provided ? PLAIN_ACK_TEXT : INSTRUCTIONS_TEXT;
      }
      // else: same customer, same day, details already known — no ack, just forward silently.

      const from = message.from || {};
      const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || "Customer";
      const handle = from.username ? ` (@${from.username})` : "";
      const contextLines = [email ? `📧 ${email}` : null, country ? `🌍 ${country}` : null]
        .filter(Boolean)
        .join("\n");

      const forwardText = `💬 New support message\nFrom: ${name}${handle}${
        contextLines ? "\n" + contextLines : ""
      }\n\n${message.text}`;

      const sent = await sendSupportMessage(adminChatId, forwardText);
      if (sent?.message_id) {
        db.prepare(
          `INSERT INTO support_messages (admin_message_id, customer_chat_id, customer_name, created_at)
           VALUES (?, ?, ?, ?)`
        ).run(sent.message_id, chatId, name, Date.now());
      }

      if (ackText) {
        await sendSupportMessage(chatId, ackText);
      }
    }
  }

  res.sendStatus(200);
});

export default router;
