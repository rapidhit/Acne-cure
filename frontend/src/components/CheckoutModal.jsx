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
export default function CheckoutModal({ open, onClose, productSlug, priceKobo, originalPriceKobo, currency, feePercent = 0 }) {
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

  // Product price stays as-is; the payment-system tax is its own line.
  const feeKobo = Math.round((priceKobo * (Number(feePercent) || 0)) / 100);
  const totalKobo = priceKobo + feeKobo;
  const priceDisplay = formatPrice(totalKobo, currency);

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
      const { reference, amount, currency: cur, publicKey, provider, checkoutUrl } = await api.initPayment(email, productSlug, currency);
      attemptedPayment.current = true;

      // Hosted-checkout gateways (Bachs) hand back a URL to send the buyer to.
      if (checkoutUrl) {
        try {
          // Remember the order so we can recover it if the buyer isn't sent back.
          localStorage.setItem("flw_pending_order", JSON.stringify({ reference, at: Date.now() }));
        } catch {}
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ fontFamily: "'Figtree', system-ui, sans-serif" }}>
      <div
        className="absolute inset-0 bg-[#0b2a3a]/50 backdrop-blur-sm"
        onClick={() => !loading && handleClose()}
      />
      <div className="relative w-full max-w-[440px] rounded-[24px] bg-white shadow-[0_24px_70px_rgba(11,42,58,0.25)] animate-[in_0.25s_ease]">
        <button
          onClick={() => !loading && handleClose()}
          className="absolute top-4 right-5 z-10 text-[#0b2a3a]/40 hover:text-[#0b2a3a] text-[22px] leading-none"
          aria-label="Close"
        >
          ×
        </button>
        <div className="p-7 sm:p-8">
          <h3 className="text-[26px] leading-[1.15] font-bold tracking-[-0.015em] text-[#0b2a3a]">Almost there</h3>
          <p className="mt-3 text-[15.5px] leading-[1.6] text-[#4a5b66]">
            Enter your email — your receipt and download link go straight there right after payment.
          </p>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheckout()}
            placeholder="you@example.com"
            className="mt-6 w-full rounded-xl border border-[#d5dde4] bg-white px-4 py-3.5 text-[16px] text-[#0b2a3a] outline-none focus:border-[#1f4d3a] focus:ring-4 focus:ring-[#1f4d3a]/10"
          />
          {error && <p className="mt-2 text-[13px] text-[#dc2626]">{error}</p>}
          <div className="mt-5 rounded-xl border border-[#e4e9ee] bg-[#f6f8fa] px-4 py-3.5">
          {feeKobo > 0 && (
            <div className="mb-2 pb-2 border-b border-[#e4e9ee] space-y-1 text-[13px] text-[#0b2a3a]/60">
              <div className="flex justify-between"><span>Price</span><span>{originalPriceKobo ? <s className="mr-2 text-[#0b2a3a]/40">{formatPrice(originalPriceKobo, currency)}</s> : null}{formatPrice(priceKobo, currency)}</span></div>
              <div className="flex justify-between"><span>Tax ({Number(feePercent)}%)</span><span>{formatPrice(feeKobo, currency)}</span></div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#0b2a3a]/60">Total</span>
            <span className="text-[18px] font-extrabold text-[#0b2a3a]">
              {originalPriceKobo && feeKobo === 0 ? (
                <span className="mr-2 text-[14px] font-semibold line-through text-[#0b2a3a]/40">
                  {formatPrice(originalPriceKobo, currency)}
                </span>
              ) : null}
              {priceDisplay}
            </span>
          </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-[#1f4d3a] hover:bg-[#173b2c] text-white font-bold py-4 text-[16px] transition disabled:opacity-60"
          >
            {loading ? "Opening secure checkout…" : `Continue to Payment – ${priceDisplay}`}
          </button>
          <p className="mt-4 text-[12px] text-center text-[#0b2a3a]/50">🔒 Secured checkout</p>
        </div>
      </div>
    </div>
  );
}

export { formatPrice };
