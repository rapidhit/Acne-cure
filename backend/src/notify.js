import axios from "axios";

/**
 * Sends a Telegram message when a sale is confirmed. Silently no-ops if
 * TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID aren't set, and never throws —
 * a notification failure must never break the payment flow itself.
 */
export async function notifySale({ email, amount, currency, reference }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const value = (amount / 100).toFixed(2);
  const text =
    `🎉 New sale!\n\n` +
    `💰 ${value} ${currency}\n` +
    `📧 ${email}\n` +
    `🔖 ${reference}`;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
    });
  } catch (err) {
    console.error("Telegram notification failed:", err?.response?.data || err.message);
  }
}
