import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getOrCreateSessionId } from "../lib/api.js";

function formatPrice(amountInSmallestUnit, currency) {
  const value = (amountInSmallestUnit || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(2)}`;
  }
}

// One entry per gateway: where to load its checkout script from, and how to
// tell once it's ready on `window`. Keeps the component below gateway-agnostic.
const GATEWAY_SCRIPTS = {
  paystack: { id: "paystack-inline-js", src: "https://js.paystack.co/v1/inline.js", isReady: () => !!window.PaystackPop },
  flutterwave: { id: "flutterwave-inline-js", src: "https://checkout.flutterwave.com/v3.js", isReady: () => !!window.FlutterwaveCheckout },
  korapay: { id: "korapay-checkout-js", src: "https://checkout.korapay.com/v1/korapay-collections.min.js", isReady: () => !!window.Korapay },
};

function loadGatewayScript(provider) {
  const cfg = GATEWAY_SCRIPTS[provider];
  if (!cfg) return;
  if (document.getElementById(cfg.id)) return;
  const script = document.createElement("script");
  script.id = cfg.id;
  script.src = cfg.src;
  script.async = true;
  document.body.appendChild(script);
}

/**
 * Renders nothing until `open` is true. Handles the email capture + checkout
 * flow for whichever product slug/price is passed in, loading and driving
 * whichever payment gateway (Paystack, Flutterwave, or Korapay) that
 * product is currently configured to use.
 */
export default function CheckoutModal({ open, onClose, productSlug, priceKobo, currency }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const attemptedPayment = useRef(false);

  useEffect(() => {
    if (open) attemptedPayment.current = false; // fresh open, no attempt yet
  }, [open]);

  // Preload all three gateway scripts up front — we don't know which one
  // this product uses until /payments/init responds, and loading on demand
  // would add a visible delay right when the buyer clicks "Pay".
  useEffect(() => {
    Object.keys(GATEWAY_SCRIPTS).forEach(loadGatewayScript);
  }, []);

  if (!open) return null;

  const priceDisplay = formatPrice(priceKobo, currency);

  function handleClose() {
    // If they typed a real-looking email but never actually attempted payment,
    // that's a genuine "changed their mind" signal worth keeping — attempted
    // payments are already captured as pending transactions, so skip those.
    if (!attemptedPayment.current && /^\S+@\S+\.\S+$/.test(email)) {
      api.trackEmailCapture(email, productSlug, getOrCreateSessionId());
    }
    onClose();
  }

  function openPaystack({ publicKey, email, amount, currency: cur, reference }) {
    if (!window.PaystackPop) {
      setError("Payment is still loading — try again in a moment.");
      setLoading(false);
      return;
    }
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount,
      currency: cur,
      ref: reference,
      callback: (response) => navigate(`/success?reference=${response.reference}`),
      onClose: () => setLoading(false),
    });
    handler.openIframe();
  }

  function openFlutterwave({ publicKey, email, amount, currency: cur, reference }) {
    if (!window.FlutterwaveCheckout) {
      setError("Payment is still loading — try again in a moment.");
      setLoading(false);
      return;
    }
    window.FlutterwaveCheckout({
      public_key: publicKey,
      tx_ref: reference,
      amount: amount / 100, // Flutterwave takes a decimal amount, not the smallest unit
      currency: cur,
      customer: { email },
      callback: (response) => {
        if (response.status === "successful" || response.status === "completed") {
          navigate(`/success?reference=${reference}&providerRef=${response.transaction_id}`);
        } else {
          setLoading(false);
        }
      },
      onclose: () => setLoading(false),
    });
  }

  function openKorapay({ publicKey, email, amount, currency: cur, reference }) {
    if (!window.Korapay) {
      setError("Payment is still loading — try again in a moment.");
      setLoading(false);
      return;
    }
    window.Korapay.initialize({
      key: publicKey,
      reference,
      amount: amount / 100, // Korapay also takes a decimal amount
      currency: cur,
      customer: { email },
      onSuccess: () => navigate(`/success?reference=${reference}`),
      onClose: () => setLoading(false),
    });
  }

  async function handleCheckout() {
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email so we can send your receipt.");
      return;
    }

    setLoading(true);
    try {
      const { reference, amount, currency: cur, publicKey, provider } = await api.initPayment(email, productSlug);
      attemptedPayment.current = true;

      const args = { publicKey, email, amount, currency: cur, reference };
      if (provider === "flutterwave") openFlutterwave(args);
      else if (provider === "korapay") openKorapay(args);
      else openPaystack(args);
    } catch (e) {
      setError(e.message || "Something went wrong starting checkout.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0f3d1f]/70 backdrop-blur-sm"
        onClick={() => !loading && handleClose()}
      />
      <div className="relative bg-white rounded-[28px] p-7 sm:p-8 max-w-[440px] w-full shadow-[0_24px_64px_rgba(0,0,0,0.3)] animate-[in_0.25s_ease]">
        <button
          onClick={() => !loading && handleClose()}
          className="absolute top-4 right-4 text-[#0f3d1f]/40 hover:text-[#0f3d1f] text-[20px] leading-none"
          aria-label="Close"
        >
          ×
        </button>
        <div className="w-14 h-14 rounded-full bg-[#a3d65c] grid place-items-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4" stroke="#0f3d1f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
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
        <p className="mt-3 text-[11px] text-center text-[#0f3d1f]/50">🔒 Secured checkout</p>
      </div>
    </div>
  );
}

export { formatPrice };
