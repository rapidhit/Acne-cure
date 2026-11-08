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
export default function CheckoutModal({ open, onClose, productSlug, priceKobo, originalPriceKobo, currency }) {
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
      const { reference, amount, currency: cur, publicKey, provider, checkoutUrl } = await api.initPayment(email, productSlug);
      attemptedPayment.current = true;

      // Hosted-checkout gateways (Bachs) hand back a URL to send the buyer to.
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div
        className="absolute inset-0 bg-[#17251d]/50 backdrop-blur-sm"
        onClick={() => !loading && handleClose()}
      />
      <div className="relative w-full max-w-[440px] rounded-[32px] border border-[#2f7d5b]/10 bg-gradient-to-br from-[#eaf4ec] via-[#f4f9f5] to-white p-3 shadow-[0_30px_80px_rgba(23,37,29,0.25)] animate-[in_0.25s_ease]">
        <button
          onClick={() => !loading && handleClose()}
          className="absolute top-5 right-6 z-10 text-[#17251d]/40 hover:text-[#17251d] text-[22px] leading-none"
          aria-label="Close"
        >
          ×
        </button>
        <div className="rounded-[24px] bg-white border border-black/[0.05] p-7 sm:p-8">
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#2f7d5b]">Checkout</p>
          <h3 className="mt-3 text-[28px] leading-[1.1] font-extrabold tracking-[-0.03em] text-[#17251d]">Almost there.</h3>
          <p className="mt-3 text-[14.5px] leading-[1.6] text-[#17251d]/60">
            Enter your email — your receipt and download link go straight there right after payment.
          </p>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheckout()}
            placeholder="you@example.com"
            className="mt-6 w-full rounded-2xl border border-[#17251d]/10 bg-white px-4 py-3.5 text-[15px] text-[#17251d] outline-none focus:border-[#2f7d5b] focus:ring-4 focus:ring-[#2f7d5b]/10"
          />
          {error && <p className="mt-2 text-[13px] text-[#dc2626]">{error}</p>}
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-black/[0.06] px-4 py-3.5">
            <span className="text-[14px] font-semibold text-[#17251d]/60">Total</span>
            <span className="text-[18px] font-extrabold text-[#17251d]">
              {originalPriceKobo ? (
                <span className="mr-2 text-[14px] font-semibold line-through text-[#17251d]/40">
                  {formatPrice(originalPriceKobo, currency)}
                </span>
              ) : null}
              {priceDisplay}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="mt-4 w-full rounded-full bg-[#2f7d5b] hover:bg-[#276b4c] text-white font-bold py-4 text-[15px] shadow-[0_10px_28px_rgba(47,125,91,0.28)] transition disabled:opacity-60"
          >
            {loading ? "Opening secure checkout…" : `Continue to Payment – ${priceDisplay}`}
          </button>
          <p className="mt-4 text-[12px] text-center text-[#17251d]/50">🔒 Secured checkout</p>
        </div>
      </div>
    </div>
  );
}

export { formatPrice };
