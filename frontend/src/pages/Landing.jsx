import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getOrCreateSessionId } from "../lib/api.js";

const STEPS = [
  { n: "01", title: "Understanding Your Acne Type", sub: "Identify what's really causing your breakouts", tag: "Know your trigger" },
  { n: "02", title: "The Natural Cleanse Protocol", sub: "Gentle cleanse that clears pores without harsh chemicals", tag: "Clear pores gently" },
  { n: "03", title: "The Neem Remedy (Main Recipe)", sub: "The main recipe - exact mix, dosage & how to apply", tag: "Core formula" },
  { n: "04", title: "Reducing Redness & Inflammation", sub: "Calm redness and swelling in days, naturally", tag: "Calm skin fast" },
  { n: "05", title: "Detox & Diet Tweaks", sub: "Foods that trigger acne and simple swaps that help", tag: "Food swaps" },
  { n: "06", title: "Daily Skincare Routine", sub: "Morning & night routine for lasting clear skin", tag: "" },
  { n: "07", title: "Mistakes That Make Acne Worse", sub: "Common habits that keep pimples coming back", tag: "Avoid setbacks" },
  { n: "08", title: "Maintaining Clear, Healthy Skin", sub: "How to stay clear long-term without products", tag: "Stay clear" },
];

const TESTIMONIALS = [
  {
    name: "Maya J.",
    meta: "24 · Texas",
    stars: 5,
    text: "ok so i was skeptical cause its only $5 lol but wow. I've been doing the neem thing for about a week and a half now and my cheeks are actually clearing. way less red and painful now, my skin feels so much smoother and i finally feel confident again. definitely worth it!!",
    likes: 24,
  },
  {
    name: "Jenna",
    meta: "Sensitive skin",
    stars: 4,
    text: "I've tried so many expensive creams from Sephora and this little pdf helped more than all of them. I have sensitive skin so i was scared to try but its all natural stuff i already had in kitchen. The part about what foods trigger breakouts was eye opening for me.",
    likes: 18,
  },
  {
    name: "Priya K.",
    meta: "Toronto",
    stars: 5,
    text: "Got this last night and read it in one sitting. Started this morning. Simple to follow, not complicated like other guides. Will update after a week but so far i like it",
    likes: 0,
  },
];

function formatPrice(amountInSmallestUnit, currency) {
  const value = (amountInSmallestUnit || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(2)}`;
  }
}

// Marketing "was" price shown struck-through — cosmetic only, not tied to the real checkout amount.
const ORIGINAL_PRICE_DISPLAY = "$27.00";

function useCountdown(initialSeconds) {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : initialSeconds)), 1000);
    return () => clearInterval(id);
  }, [initialSeconds]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function Stars({ count }) {
  return (
    <span className="text-[#a3d65c]">
      {"★".repeat(count)}
      {"☆".repeat(5 - count)}
    </span>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const timer = useCountdown(15 * 60);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState({ priceKobo: 499, currency: "USD" });
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const priceDisplay = formatPrice(product.priceKobo, product.currency);

  useEffect(() => {
    api.getProduct().then(setProduct).catch(() => {}); // falls back to default if it fails
  }, []);

  useEffect(() => {
    api.trackVisit(sessionId, "/", document.referrer);
  }, [sessionId]);

  useEffect(() => {
    if (document.getElementById("paystack-inline-js")) return;
    const script = document.createElement("script");
    script.id = "paystack-inline-js";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  async function handleBuy() {
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
      const { reference, amount, currency, publicKey } = await api.initPayment(email);

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email,
        amount,
        currency,
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
    <div className="min-h-screen bg-[#fffef9] text-[#0f3d1f] pb-28">
      {/* Top strip */}
      <div className="bg-gradient-to-br from-[#0f3d1f] via-[#164a26] to-[#0f3d1f] text-[#e8f0d8] text-[11px] py-2 px-4 text-center flex flex-wrap items-center justify-center gap-2">
        <span>📘 Instant Digital Download</span>
        <span className="opacity-60">|</span>
        <span>8-Step Natural System</span>
        <span className="opacity-60">|</span>
        <span className="font-semibold">Over 12,000+ Readers Worldwide</span>
      </div>

      <div className="max-w-[640px] mx-auto px-5 pt-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#0f3d1f]/10 px-3 py-1.5 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a3d65c]" />
          FLAWLESS NATURAL REMEDIES · 8 STEPS PDF
          <span className="ml-2 rounded-full bg-[#0f3d1f] text-[#e8f0d8] px-2 py-0.5 text-[10px]">8 STEPS</span>
        </div>

        <h1 className="mt-5 text-[36px] leading-[1.05] font-black tracking-[-0.02em]">
          Are you Battling with{" "}
          <span className="bg-[#a3d65c]/30 px-1 rounded">Acne or Pimples?</span>
        </h1>

        <p className="mt-4 rounded-2xl bg-[#0f3d1f]/[0.06] p-4 text-[15px] leading-[1.5]">
          Discover the simple 8-step natural system to clear your skin and boost your confidence —{" "}
          <strong>just {priceDisplay}</strong>
        </p>

        {/* Before/after placeholder — drop your real image at /public/before-after.jpg */}
        <div className="mt-6 rounded-[24px] overflow-hidden border border-black/10">
          <img
            src="/before-after.jpg"
            alt="Before and after using the natural acne remedy"
            className="w-full h-auto"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>

        <button
          onClick={handleBuy}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-[#dc2626] text-white font-bold text-[17px] py-4 flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 disabled:opacity-60"
        >
          {loading ? "Opening secure checkout…" : `Get The 8 Steps PDF – ${priceDisplay} →`}
        </button>

        {/* Email + inline checkout entry */}
        <div className="mt-4 rounded-2xl border border-[#0f3d1f]/10 p-4">
          <label className="text-[12px] font-semibold uppercase tracking-wide text-[#0f3d1f]/70">
            Email for your receipt & download link
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-[15px] outline-none focus:border-[#0f3d1f]"
          />
          {error && <p className="mt-2 text-[13px] text-[#dc2626]">{error}</p>}
        </div>

        {/* Pricing block */}
        <div className="mt-8 rounded-[24px] bg-[#0f3d1f] text-[#e8f0d8] p-6">
          <div className="text-[13px] uppercase tracking-widest text-[#a3d65c] mb-1">Today Only</div>
          <div className="flex items-baseline gap-3">
            <span className="line-through opacity-50 text-[20px]">{ORIGINAL_PRICE_DISPLAY}</span>
            <span className="text-[42px] font-black">{priceDisplay}</span>
            <span className="rounded-full bg-[#a3d65c] text-[#0f3d1f] text-[11px] font-bold px-2.5 py-1">
              SAVE $22
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
            <span className="text-[12px] uppercase tracking-wide">Price goes back to $27 soon</span>
            <span className="font-mono font-bold text-[18px]">{timer}</span>
          </div>
        </div>

        {/* Steps */}
        <h2 className="mt-10 text-[26px] font-black">
          Your Complete <span className="text-[#a3d65c]">Clear Skin System</span>
        </h2>
        <p className="mt-2 text-[15px] leading-[1.5] text-[#0f3d1f]/70">
          No guessing, no 200-page theory. Just 8 clear steps — from understanding your acne type to
          the neem remedy and daily routine. Read it once, start tonight.
        </p>

        <div className="mt-5 space-y-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-[#0f3d1f]/[0.08] p-4 flex items-center gap-4">
              <div className="w-9 h-9 shrink-0 rounded-full bg-[#a3d65c]/20 text-[#0f3d1f] font-bold text-[13px] flex items-center justify-center">
                {s.n}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[15px]">{s.title}</div>
                <div className="text-[13px] text-[#0f3d1f]/60">{s.sub}</div>
              </div>
              {s.tag && (
                <span className="ml-auto shrink-0 text-[11px] text-[#0f3d1f]/60">{s.tag}</span>
              )}
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <h2 className="mt-10 text-[26px] font-black">Real people, real results</h2>
        <p className="mt-1 text-[13px] text-[#0f3d1f]/60">No filters — real reader reviews</p>

        <div className="mt-5 space-y-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl bg-[#f9fafb] border border-black/[0.06] p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#e0e7ff] flex items-center justify-center text-[12px] font-bold text-[#4338ca]">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-[14px]">{t.name}</div>
                  <div className="text-[11px] text-[#0f3d1f]/60">{t.meta}</div>
                </div>
                <div className="ml-auto"><Stars count={t.stars} /></div>
              </div>
              <p className="mt-3 text-[14px] leading-[1.55]">{t.text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleBuy}
          disabled={loading}
          className="mt-8 w-full rounded-full bg-[#dc2626] text-white font-bold text-[17px] py-4 disabled:opacity-60"
        >
          {loading ? "Opening secure checkout…" : `📘 Download Now – ${priceDisplay}`}
        </button>
        <p className="mt-2 text-center text-[12px] text-[#0f3d1f]/60">
          Instant Download · Any Device · Price goes back to $27 soon
        </p>
      </div>
    </div>
  );
}
