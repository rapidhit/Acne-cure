import { useEffect, useMemo, useState } from "react";
import CheckoutModal, { formatPrice } from "../components/CheckoutModal.jsx";
import { api, getOrCreateSessionId } from "../lib/api.js";

// Kept as sensible defaults for the legacy "8 Steps" design — a product using
// template mode can override headline/subheadline/testimonials/faqs from the
// dashboard; anything else falls back to these.
const DEFAULT_STEPS = [
  { n: "01", title: "Understanding Your Acne Type", sub: "Identify what's really causing your breakouts", tag: "Know your trigger" },
  { n: "02", title: "The Natural Cleanse Protocol", sub: "Gentle cleanse that clears pores without harsh chemicals", tag: "Clear pores gently" },
  { n: "03", title: "The Main Recipe", sub: "The exact mix, dosage & how to apply", tag: "Core formula" },
  { n: "04", title: "Reducing Redness & Inflammation", sub: "Calm redness and swelling in days, naturally", tag: "Calm skin fast" },
  { n: "05", title: "Detox & Diet Tweaks", sub: "Foods that trigger acne and simple swaps that help", tag: "Food swaps" },
  { n: "06", title: "Daily Skincare Routine", sub: "Morning & night routine for lasting clear skin", tag: "" },
  { n: "07", title: "Mistakes That Make Acne Worse", sub: "Common habits that keep pimples coming back", tag: "Avoid setbacks" },
  { n: "08", title: "Maintaining Clear, Healthy Skin", sub: "How to stay clear long-term without products", tag: "Stay clear" },
];

const DEFAULT_TESTIMONIALS = [
  {
    name: "Maya J.",
    meta: "24 · Texas",
    stars: 5,
    text: "ok so i was skeptical cause its only $5 lol but wow. I've been following the routine for about a week and a half now and my cheeks are actually clearing. not 100% gone but way less red and painful. definitely worth it",
  },
  {
    name: "Jenna",
    meta: "Sensitive skin",
    stars: 4,
    text: "I've tried so many expensive creams from Sephora and this little pdf helped more than all of them. I have sensitive skin so i was scared to try but its all natural stuff i already had in kitchen. The part about what foods trigger breakouts was eye opening for me.",
  },
  {
    name: "Priya K.",
    meta: "Toronto",
    stars: 5,
    text: "Got this last night and read it in one sitting. Started this morning. Simple to follow, not complicated like other guides. Will update after a week but so far i like it",
  },
  {
    name: "D.",
    meta: "Verified reader",
    stars: 5,
    text: "Before I wouldn't go out without makeup. After 2 weeks following this my friend asked if I got a facial lol. Still get a pimple here and there but nothing like before.",
  },
];

const DEFAULT_FAQS = [
  {
    q: "How do I get the ebook after purchase?",
    a: "Instant access. Right after payment you'll get a download link on the confirmation page + email with your PDF. No waiting.",
  },
  {
    q: "What format is the ebook?",
    a: "PDF. Simple, natural, actionable. Works on any device – phone, tablet, computer, Kindle. Read it anywhere, even offline.",
  },
  {
    q: "How quick is it to read?",
    a: "It's designed to be read in one sitting – about 25-35 minutes.",
  },
];

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

export default function TemplateProduct({ product }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [realReviews, setRealReviews] = useState(null);
  const [likedIds, setLikedIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("flw_liked_reviews") || "[]");
    } catch {
      return [];
    }
  });
  const timer = useCountdown(15 * 60);
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  useEffect(() => {
    api.getProductReviews(product.slug).then(setRealReviews).catch(() => setRealReviews([]));
  }, [product.slug]);

  async function handleLike(reviewId) {
    if (likedIds.includes(reviewId)) return;
    try {
      const { likes } = await api.likeReview(reviewId, sessionId);
      setRealReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, likes } : r)));
      const next = [...likedIds, reviewId];
      setLikedIds(next);
      sessionStorage.setItem("flw_liked_reviews", JSON.stringify(next));
    } catch {
      // silently ignore — liking is a nice-to-have, not critical
    }
  }

  const priceDisplay = formatPrice(product.priceKobo, product.currency);
  const headline = product.headline || "Are you Battling with Acne or Pimples?";
  const subheadline =
    product.subheadline ||
    `Discover the simple 8-step natural system to clear your skin and boost your confidence — just ${priceDisplay}`;
  const usingRealReviews = realReviews && realReviews.length > 0;
  const testimonials = usingRealReviews ? realReviews : product.testimonials?.length ? product.testimonials : DEFAULT_TESTIMONIALS;
  const faqs = product.faqs?.length ? product.faqs : DEFAULT_FAQS;

  function openModal() {
    setShowModal(true);
  }

  return (
    <div className="min-h-screen bg-[#fffef9] text-[#0f3d1f] pb-28">
      {/* Top strip */}
      <div className="bg-gradient-to-br from-[#0f3d1f] via-[#164a26] to-[#0f3d1f] text-[#e8f0d8] text-[11px] py-2 px-4 text-center flex flex-wrap items-center justify-center gap-2">
        <span>Instant Digital Download</span>
        <span className="opacity-60">|</span>
        <span>Simple, Actionable System</span>
        <span className="opacity-60">|</span>
        <span className="font-semibold">Over 12,000+ Readers Worldwide</span>
      </div>

      <div className="max-w-[640px] mx-auto px-5 pt-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#0f3d1f]/10 px-3 py-1.5 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a3d65c]" />
          {product.name?.toUpperCase()}
        </div>

        <h1 className="mt-5 text-[36px] leading-[1.05] font-black tracking-[-0.02em]">
          {headline}
        </h1>

        <p className="mt-4 rounded-2xl bg-[#0f3d1f]/[0.06] p-4 text-[15px] leading-[1.5]">
          {subheadline}
        </p>

        {/* Before/after — real photo (only meaningful for the acne product; other
            template-mode products should probably move to custom_code mode) */}
        <div className="mt-6 rounded-[24px] overflow-hidden border border-black/10 bg-white p-2">
          <img
            src="/before-after.jpg"
            alt={`${product.name} — real results`}
            className="w-full h-auto rounded-[18px] object-cover"
            onError={(e) => (e.currentTarget.parentElement.style.display = "none")}
          />
        </div>

        <button
          onClick={openModal}
          className="mt-6 w-full rounded-full bg-[#dc2626] text-white font-bold text-[17px] py-4 flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
        >
          Get Access – {priceDisplay} →
        </button>

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
          Your Complete <span className="text-[#a3d65c]">System</span>
        </h2>
        <p className="mt-2 text-[15px] leading-[1.5] text-[#0f3d1f]/70">
          No guessing, no 200-page theory. Read it once, start tonight.
        </p>

        <div className="mt-5 space-y-3">
          {DEFAULT_STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-[#0f3d1f]/[0.08] p-4 flex items-center gap-4">
              <div className="w-9 h-9 shrink-0 rounded-full bg-[#a3d65c]/20 text-[#0f3d1f] font-bold text-[13px] flex items-center justify-center">
                {s.n}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[15px]">{s.title}</div>
                <div className="text-[13px] text-[#0f3d1f]/60">{s.sub}</div>
              </div>
              {s.tag && <span className="ml-auto shrink-0 text-[11px] text-[#0f3d1f]/60">{s.tag}</span>}
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <h2 className="mt-10 text-[26px] font-black">Real people, real results</h2>
        <p className="mt-1 text-[13px] text-[#0f3d1f]/60">No filters — real reader reviews</p>

        <div className="mt-5 space-y-3">
          {testimonials.map((t) => {
            const isReal = usingRealReviews;
            const key = isReal ? t.id : t.name;
            const displayName = isReal ? t.name : t.name;
            const stars = isReal ? t.rating : t.stars || 5;
            const bodyText = isReal ? t.body : t.text;
            const alreadyLiked = isReal && likedIds.includes(t.id);
            return (
              <div key={key} className="rounded-2xl bg-[#f9fafb] border border-black/[0.06] p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#e0e7ff] flex items-center justify-center text-[12px] font-bold text-[#4338ca]">
                    {displayName?.[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-[14px]">{displayName}</div>
                    {!isReal && <div className="text-[11px] text-[#0f3d1f]/60">{t.meta}</div>}
                  </div>
                  <div className="ml-auto"><Stars count={stars} /></div>
                </div>
                <p className="mt-3 text-[14px] leading-[1.55]">{bodyText}</p>
                {isReal && (
                  <button
                    onClick={() => handleLike(t.id)}
                    disabled={alreadyLiked}
                    className={`mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold ${
                      alreadyLiked ? "text-[#dc2626]" : "text-[#0f3d1f]/60 hover:text-[#dc2626]"
                    }`}
                  >
                    <span>{alreadyLiked ? "♥" : "♡"}</span>
                    {t.likes || 0}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <h2 className="mt-12 text-[26px] font-black text-center">Frequently Asked Questions</h2>
        <div className="mt-5 rounded-[20px] border border-[#0f3d1f]/[0.08] bg-white overflow-hidden divide-y divide-[#0f3d1f]/[0.06]">
          {faqs.map((f, i) => (
            <div key={f.q}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between text-left px-6 py-5"
              >
                <span className="font-bold text-[15px] pr-6">{f.q}</span>
                <span className="shrink-0 text-[#0f3d1f]/50">{openFaq === i ? "−" : "+"}</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 text-[13.5px] leading-[1.6] text-[#0f3d1f]/80">{f.a}</div>
              )}
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="mt-12 rounded-[32px] bg-[#0f3d1f] p-8 text-center relative overflow-hidden">
          <div className="relative">
            <h2 className="text-[#e8f0d8] text-[32px] font-black leading-[0.95] tracking-[-0.02em]">
              Ready to get started?
            </h2>
            <p className="mt-3 text-[#e8f0d8]/70 text-[14px] max-w-[420px] mx-auto">
              12,000+ readers already got results. Instant download, read on any device.
            </p>
            <button
              onClick={openModal}
              className="mt-7 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black text-[17px] px-10 py-[18px] shadow-[0_14px_32px_rgba(220,38,38,0.5)]"
            >
              Get Access – {priceDisplay}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 border-t border-[#0f3d1f]/10 pt-6 pb-4 text-center">
          <div className="font-black text-[14px] tracking-[-0.01em]">{product.name}</div>
          <p className="mt-3 text-[11px] leading-[1.5] text-[#0f3d1f]/50 max-w-[520px] mx-auto">
            Disclaimer: This is a digital PDF guide. Individual results may vary. For informational
            purposes only.
          </p>
        </div>
      </div>

      {/* Sticky mobile buy bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-black/10 p-3">
        <button
          onClick={openModal}
          className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black text-[15px] py-4 rounded-full shadow-[0_8px_20px_rgba(220,38,38,0.5)] flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          Get Access – {priceDisplay}
        </button>
        <p className="mt-1.5 text-center text-[10px] font-semibold opacity-60">
          Instant Download · Any Device
        </p>
      </div>

      <CheckoutModal
        open={showModal}
        onClose={() => setShowModal(false)}
        productSlug={product.slug}
        priceKobo={product.priceKobo}
        currency={product.currency}
      />
    </div>
  );
}
