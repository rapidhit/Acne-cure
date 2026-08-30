import axios from "axios";

/**
 * Low-level send — used by both the sale notification and the
 * "hi" health-check auto-reply. Never throws; logs and swallows errors
 * so a Telegram hiccup never breaks the payment flow or webhook response.
 */
export async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
    });
  } catch (err) {
    console.error("Telegram send failed:", err?.response?.data || err.message);
  }
}

/**
 * Sends a Telegram message when a sale is confirmed. Silently no-ops if
 * TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID aren't set.
 */
export async function notifySale({ email, amount, currency, reference, productName }) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;

  const value = (amount / 100).toFixed(2);
  const timestamp = new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Accra",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const text =
    `🎉 New sale!\n\n` +
    (productName ? `📦 ${productName}\n` : "") +
    `💰 ${value} ${currency}\n` +
    `📧 ${email}\n` +
    `🔖 ${reference}\n` +
    `🕐 ${timestamp} (GMT)`;

  await sendTelegramMessage(chatId, text);
}
