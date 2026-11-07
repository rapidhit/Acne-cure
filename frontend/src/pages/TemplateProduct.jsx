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

// Marketing "was" price is computed proportionally below, matching whatever currency is set.

function Stars({ count }) {
  return (
    <span className="text-[#2f7d5b] tracking-[0.1em] text-[13px]">
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
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const [localizedPriceKobo, setLocalizedPriceKobo] = useState(null);
  const [localizedCurrency, setLocalizedCurrency] = useState(null);

  useEffect(() => {
    api
      .getGeoCurrency()
      .then(async ({ currency }) => {
        if (!currency || currency === product.currency) return; // already showing the right one
        // Always convert from the product's actual, current price/currency —
        // never from a separately-maintained reference value, which can go
        // stale the moment the price is edited without updating it too.
        const { rate } = await api.getPublicFxRate(currency, product.currency);
        setLocalizedPriceKobo(Math.round(product.priceKobo * rate));
        setLocalizedCurrency(currency);
      })
      .catch(() => {}); // any failure just leaves the real price showing — never breaks the page
  }, [product.slug, product.priceKobo, product.currency]);

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

  const displayPriceKobo = localizedPriceKobo ?? product.priceKobo;
  const displayCurrency = localizedCurrency ?? product.currency;
  const priceDisplay = formatPrice(displayPriceKobo, displayCurrency);
  // "Was" price keeps the same ~5.4x markup illusion as the original design,
  // but scales with whatever the real (or localized) price/currency actually is.
  const originalPriceKobo = Math.round(displayPriceKobo * 5.41);
  const originalPriceDisplay = formatPrice(originalPriceKobo, displayCurrency);
  const savingsDisplay = formatPrice(originalPriceKobo - displayPriceKobo, displayCurrency);
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

  const ink = "text-[#17251d]";
  const muted = "text-[#17251d]/60";
  const eyebrow = "text-[12px] font-bold uppercase tracking-[0.22em] text-[#2f7d5b]";
  const primaryBtn =
    "rounded-full bg-[#2f7d5b] hover:bg-[#276b4c] text-white font-bold text-[16px] px-8 py-4 shadow-[0_10px_28px_rgba(47,125,91,0.28)] transition active:scale-[0.99]";

  return (
    <div
      className={`min-h-screen bg-white ${ink} pb-28 sm:pb-0`}
      style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
    >
      <div className="max-w-[680px] mx-auto px-6">
        {/* Header */}
        <header className="py-6 flex items-center justify-between">
          <span className="text-[13px] font-extrabold tracking-[0.18em] uppercase">{product.name}</span>
          <span className={`hidden sm:inline text-[12px] ${muted}`}>Instant download</span>
        </header>

        {/* Hero */}
        <section className="pt-8 pb-14">
          <p className={eyebrow}>Natural acne system</p>
          <h1 className="mt-5 text-[40px] sm:text-[52px] leading-[1.04] font-extrabold tracking-[-0.03em]">
            {headline}
          </h1>
          <p className={`mt-5 text-[17px] leading-[1.65] ${muted}`}>{subheadline}</p>
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
            <button onClick={openModal} className={primaryBtn}>
              Get Access – {priceDisplay}
            </button>
            <span className={`text-[13px] ${muted}`}>PDF · 25–35 min read · Any device</span>
          </div>
        </section>

        {/* Visual card */}
        <section className="relative rounded-[36px] border border-[#2f7d5b]/10 bg-gradient-to-br from-[#eaf4ec] via-[#f4f9f5] to-white p-6 sm:p-10 shadow-[0_30px_80px_rgba(23,37,29,0.06)]">
          <div className="mx-auto max-w-[460px] rounded-[28px] bg-white p-2.5 shadow-[0_10px_40px_rgba(23,37,29,0.08)] border border-black/[0.04]">
            <img
              src="/before-after.jpg"
              alt={`${product.name} — real results`}
              className="w-full h-auto rounded-[20px] object-cover"
              onError={(e) => (e.currentTarget.parentElement.style.display = "none")}
            />
          </div>
          <div className="mt-6 flex items-center justify-between gap-4 rounded-[22px] bg-white border border-black/[0.06] px-6 py-5">
            <div className="min-w-0">
              <div className="font-bold text-[17px] leading-tight">{product.name}</div>
              <div className={`mt-1 text-[14px] ${muted}`}>8-step guide · Instant PDF</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-extrabold text-[22px] leading-none">{priceDisplay}</div>
              <div className={`mt-1 text-[12px] line-through ${muted}`}>{originalPriceDisplay}</div>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="mt-20 pt-16 border-t border-[#17251d]/[0.08]">
          <p className={eyebrow}>The system</p>
          <h2 className="mt-4 text-[34px] sm:text-[40px] font-extrabold tracking-[-0.03em] leading-[1.08]">
            Eight small steps.
          </h2>
          <p className={`mt-4 text-[17px] leading-[1.65] ${muted}`}>
            No guessing, no 200-page theory. Read it once, start tonight.
          </p>
          <div className="mt-10 divide-y divide-[#17251d]/[0.08] border-y border-[#17251d]/[0.08]">
            {DEFAULT_STEPS.map((s) => (
              <div key={s.n} className="py-5 flex items-start gap-5">
                <div className="w-8 shrink-0 pt-0.5 text-[13px] font-bold tracking-[0.1em] text-[#2f7d5b]">{s.n}</div>
                <div className="min-w-0">
                  <div className="font-bold text-[16px] leading-snug">{s.title}</div>
                  <div className={`mt-1 text-[14px] leading-[1.55] ${muted}`}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section className="mt-20 pt-16 border-t border-[#17251d]/[0.08]">
          <p className={eyebrow}>Reader stories</p>
          <h2 className="mt-4 text-[34px] sm:text-[40px] font-extrabold tracking-[-0.03em] leading-[1.08]">
            Real people, real results.
          </h2>
          <p className={`mt-4 text-[17px] leading-[1.65] ${muted}`}>No filters — real reader reviews.</p>
          <div className="mt-8 space-y-4">
            {testimonials.map((t) => {
              const isReal = usingRealReviews;
              const key = isReal ? t.id : t.name;
              const displayName = t.name;
              const stars = isReal ? t.rating : t.stars || 5;
              const bodyText = isReal ? t.body : t.text;
              const alreadyLiked = isReal && likedIds.includes(t.id);
              return (
                <div key={key} className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-[0_8px_30px_rgba(23,37,29,0.04)]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#eaf4ec] flex items-center justify-center text-[13px] font-bold text-[#2f7d5b]">
                      {displayName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[14.5px]">{displayName}</div>
                      {!isReal && <div className={`text-[12px] ${muted}`}>{t.meta}</div>}
                    </div>
                    <div className="ml-auto"><Stars count={stars} /></div>
                  </div>
                  <p className="mt-4 text-[15px] leading-[1.65]">{bodyText}</p>
                  {isReal && (
                    <button
                      onClick={() => handleLike(t.id)}
                      disabled={alreadyLiked}
                      className={`mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                        alreadyLiked ? "text-[#2f7d5b]" : "text-[#17251d]/50 hover:text-[#2f7d5b]"
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
        </section>

        {/* FAQ */}
        <section className="mt-20 pt-16 border-t border-[#17251d]/[0.08]">
          <p className={eyebrow}>Questions</p>
          <h2 className="mt-4 text-[34px] sm:text-[40px] font-extrabold tracking-[-0.03em] leading-[1.08]">
            Good to know.
          </h2>
          <div className="mt-8 divide-y divide-[#17251d]/[0.08] border-y border-[#17251d]/[0.08]">
            {faqs.map((f, i) => (
              <div key={f.q}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between text-left py-5"
                >
                  <span className="font-bold text-[16px] pr-6">{f.q}</span>
                  <span className="shrink-0 text-[20px] leading-none text-[#2f7d5b]">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className={`pb-6 text-[15px] leading-[1.65] ${muted}`}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-20 rounded-[36px] border border-[#2f7d5b]/10 bg-gradient-to-br from-[#eaf4ec] via-[#f4f9f5] to-white p-8 sm:p-12 text-center">
          <h2 className="text-[32px] sm:text-[38px] font-extrabold tracking-[-0.03em] leading-[1.08]">
            Ready to get started?
          </h2>
          <p className={`mt-3 text-[16px] leading-[1.6] ${muted} max-w-[420px] mx-auto`}>
            12,000+ readers already have it. Instant download, read on any device.
          </p>
          <button onClick={openModal} className={`mt-8 ${primaryBtn}`}>
            Get Access – {priceDisplay}
          </button>
        </section>

        {/* Footer */}
        <footer className="mt-16 pb-10 text-center">
          <div className="font-extrabold text-[13px] tracking-[0.18em] uppercase">{product.name}</div>
          <p className={`mt-3 text-[12px] leading-[1.6] ${muted} max-w-[520px] mx-auto`}>
            Disclaimer: This is a digital PDF guide. Individual results may vary. For informational
            purposes only.
          </p>
        </footer>
      </div>

      {/* Sticky mobile buy bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-black/[0.08] p-3">
        <button
          onClick={openModal}
          className="w-full bg-[#2f7d5b] hover:bg-[#276b4c] text-white font-bold text-[15px] py-4 rounded-full shadow-[0_8px_22px_rgba(47,125,91,0.3)] active:scale-[0.99] transition"
        >
          Get Access – {priceDisplay}
        </button>
      </div>

      <CheckoutModal
        open={showModal}
        onClose={() => setShowModal(false)}
        productSlug={product.slug}
        priceKobo={displayPriceKobo}
        currency={displayCurrency}
      />
    </div>
  );
}
