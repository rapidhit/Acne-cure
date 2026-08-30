import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

function formatPrice(amountInSmallestUnit, currency) {
  const value = (amountInSmallestUnit || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(2)}`;
  }
}

/**
 * Renders nothing until `open` is true. Handles the email capture +
 * Paystack Inline JS flow for whichever product slug/price is passed in.
 */
export default function CheckoutModal({ open, onClose, productSlug, priceKobo, currency }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (document.getElementById("paystack-inline-js")) return;
    const script = document.createElement("script");
    script.id = "paystack-inline-js";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (!open) return null;

  const priceDisplay = formatPrice(priceKobo, currency);

  async function handleCheckout() {
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email so we can send your receipt.");
      return;
    }
    if (!window.PaystackPop) {
      setError("Payment is still loading — try again in a moment.");
      return;
    }

    setLoading(true);
    try {
      const { reference, amount, currency: cur, publicKey } = await api.initPayment(email, productSlug);

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email,
        amount,
        currency: cur,
        ref: reference,
        callback: (response) => {
          navigate(`/success?reference=${response.reference}`);
        },
        onClose: () => setLoading(false),
      });
      handler.openIframe();
    } catch (e) {
      setError(e.message || "Something went wrong starting checkout.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0f3d1f]/70 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />
      <div className="relative bg-white rounded-[28px] p-7 sm:p-8 max-w-[440px] w-full shadow-[0_24px_64px_rgba(0,0,0,0.3)] animate-[in_0.25s_ease]">
        <button
          onClick={() => !loading && onClose()}
          className="absolute top-4 right-4 text-[#0f3d1f]/40 hover:text-[#0f3d1f] text-[20px] leading-none"
          aria-label="Close"
        >
          ×
        </button>
        <div className="w-14 h-14 rounded-full bg-[#a3d65c] grid place-items-center text-[24px]">📘</div>
        <h3 className="mt-4 font-black text-[22px] tracking-[-0.02em] text-[#0f3d1f]">Almost there!</h3>
        <p className="mt-2 text-[13.5px] leading-[1.5] text-[#0f3d1f]/70">
          Enter your email — your receipt and download link go straight there right after payment.
        </p>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheckout()}
          placeholder="you@example.com"
          className="mt-5 w-full rounded-xl border border-black/10 px-4 py-3 text-[15px] outline-none focus:border-[#0f3d1f]"
        />
        {error && <p className="mt-2 text-[13px] text-[#dc2626]">{error}</p>}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="mt-5 w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black py-3.5 rounded-full text-[14px] disabled:opacity-60"
        >
          {loading ? "Opening secure checkout…" : `Continue to Payment – ${priceDisplay}`}
        </button>
        <p className="mt-3 text-[11px] text-center text-[#0f3d1f]/50">🔒 Secured by Paystack</p>
      </div>
    </div>
  );
}

export { formatPrice };
