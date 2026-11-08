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
    <span className="text-[#e0a526] tracking-[0.12em] text-[13px]">
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

  const muted = "text-[#1c2b23]/65";
  const display = { fontFamily: "'Fraunces', Georgia, serif" };
  const eyebrow = "text-[12px] font-bold uppercase tracking-[0.22em] text-[#2f7d5b]";
  const h2 = "text-[34px] sm:text-[44px] leading-[1.06] tracking-[-0.02em] font-semibold";
  const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-full bg-[#1f4d3a] hover:bg-[#173b2c] text-white font-bold text-[16px] px-8 py-4 shadow-[0_14px_32px_rgba(31,77,58,0.28)] transition active:scale-[0.99]";

  return (
    <div
      className="min-h-screen bg-[#fbfaf5] text-[#1c2b23] pb-28 sm:pb-0 overflow-x-hidden"
      style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
    >
      <div className="max-w-[1040px] mx-auto px-6">
        {/* Header */}
        <header className="py-6 flex items-center justify-between">
          <span className="text-[19px] font-semibold tracking-[-0.01em]" style={display}>
            {product.name}
          </span>
          <button onClick={openModal} className="hidden sm:inline-flex rounded-full border border-[#1f4d3a]/20 px-5 py-2 text-[13px] font-bold hover:bg-[#1f4d3a] hover:text-white transition">
            Get the guide
          </button>
        </header>

        {/* Hero */}
        <section className="pt-6 pb-20 grid md:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div>
            <p className={eyebrow}>The natural acne guide</p>
            <h1 className="mt-5 text-[42px] sm:text-[58px] leading-[1.02] tracking-[-0.03em] font-semibold" style={display}>
              {headline}
            </h1>
            <p className={`mt-6 text-[18px] leading-[1.65] ${muted} max-w-[520px]`}>{subheadline}</p>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <button onClick={openModal} className={primaryBtn}>
                Get Access – {priceDisplay} <span aria-hidden="true">→</span>
              </button>
              <span className={`text-[13px] ${muted}`}>
                <span className="line-through mr-2">{originalPriceDisplay}</span>One-time payment
              </span>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-semibold">
              {["Instant PDF download", "Simple kitchen ingredients", "25–35 minute read"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#2f7d5b] text-white text-[11px] flex items-center justify-center">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[44px] bg-gradient-to-br from-[#dcebd9] via-[#eef5e6] to-transparent" />
            <div className="relative rounded-[32px] bg-white p-3 shadow-[0_30px_70px_rgba(31,77,58,0.16)] border border-black/[0.04]">
              <img
                src="/before-after.jpg"
                alt={`${product.name} — real results`}
                className="w-full h-auto rounded-[22px] object-cover"
                onError={(e) => (e.currentTarget.parentElement.style.display = "none")}
              />
            </div>
            <div className="absolute -bottom-6 -left-3 sm:-left-8 rounded-2xl bg-white px-5 py-4 shadow-[0_16px_40px_rgba(31,77,58,0.18)] border border-black/[0.04]">
              <div className="text-[28px] leading-none font-semibold" style={display}>8 steps</div>
              <div className={`mt-1 text-[12px] ${muted}`}>to clearer skin</div>
            </div>
            <div className="absolute -top-5 -right-2 sm:-right-6 rounded-2xl bg-[#1f4d3a] text-white px-5 py-3 shadow-[0_16px_40px_rgba(31,77,58,0.3)]">
              <div className="text-[12px] uppercase tracking-[0.16em] text-[#a3d65c] font-bold">Only</div>
              <div className="text-[22px] font-semibold leading-tight" style={display}>{priceDisplay}</div>
            </div>
          </div>
        </section>
      </div>

      {/* Steps */}
      <section className="bg-white border-y border-[#1c2b23]/[0.06]">
        <div className="max-w-[1040px] mx-auto px-6 py-20">
          <div className="max-w-[560px]">
            <p className={eyebrow}>What's inside</p>
            <h2 className={`mt-4 ${h2}`} style={display}>
              Your complete system, <em className="text-[#2f7d5b]">step by step.</em>
            </h2>
            <p className={`mt-4 text-[17px] leading-[1.65] ${muted}`}>
              No guessing, no 200-page theory. Read it once, start tonight.
            </p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            {DEFAULT_STEPS.map((s) => (
              <div key={s.n} className="group rounded-[24px] border border-[#1c2b23]/[0.08] bg-[#fbfaf5] p-6 flex gap-5 hover:border-[#2f7d5b]/40 hover:shadow-[0_16px_40px_rgba(31,77,58,0.08)] transition">
                <div className="text-[40px] leading-none font-semibold text-[#2f7d5b]/35 group-hover:text-[#2f7d5b] transition" style={display}>
                  {s.n}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-[17px] leading-snug">{s.title}</div>
                  <div className={`mt-1.5 text-[14.5px] leading-[1.6] ${muted}`}>{s.sub}</div>
                  {s.tag && (
                    <span className="mt-3 inline-block rounded-full bg-[#2f7d5b]/10 text-[#1f4d3a] text-[11.5px] font-bold px-3 py-1">
                      {s.tag}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="max-w-[1040px] mx-auto px-6 py-20">
        <div className="max-w-[560px]">
          <p className={eyebrow}>Reader stories</p>
          <h2 className={`mt-4 ${h2}`} style={display}>
            Real people, <em className="text-[#2f7d5b]">real skin.</em>
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 gap-5">
          {testimonials.map((t) => {
            const isReal = usingRealReviews;
            const key = isReal ? t.id : t.name;
            const displayName = t.name;
            const stars = isReal ? t.rating : t.stars || 5;
            const bodyText = isReal ? t.body : t.text;
            const alreadyLiked = isReal && likedIds.includes(t.id);
            return (
              <figure key={key} className="relative rounded-[28px] bg-white border border-black/[0.06] p-7 shadow-[0_12px_36px_rgba(31,77,58,0.06)]">
                <div className="absolute top-3 right-6 text-[72px] leading-none text-[#2f7d5b]/10 select-none" style={display}>”</div>
                <Stars count={stars} />
                <blockquote className="mt-4 text-[16px] leading-[1.7]">{bodyText}</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1f4d3a] flex items-center justify-center text-[14px] font-bold text-white">
                    {displayName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-[14.5px]">{displayName}</div>
                    {!isReal && <div className={`text-[12.5px] ${muted}`}>{t.meta}</div>}
                  </div>
                  {isReal && (
                    <button
                      onClick={() => handleLike(t.id)}
                      disabled={alreadyLiked}
                      className={`ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                        alreadyLiked ? "text-[#2f7d5b]" : "text-[#1c2b23]/50 hover:text-[#2f7d5b]"
                      }`}
                    >
                      <span>{alreadyLiked ? "♥" : "♡"}</span>
                      {t.likes || 0}
                    </button>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-[#1c2b23]/[0.06]">
        <div className="max-w-[760px] mx-auto px-6 py-20">
          <div className="text-center">
            <p className={eyebrow}>Questions</p>
            <h2 className={`mt-4 ${h2}`} style={display}>Good to know.</h2>
          </div>
          <div className="mt-10 space-y-3">
            {faqs.map((f, i) => (
              <div key={f.q} className="rounded-[22px] border border-[#1c2b23]/[0.08] bg-[#fbfaf5] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between text-left px-6 py-5"
                >
                  <span className="font-extrabold text-[16px] pr-6">{f.q}</span>
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#2f7d5b]/10 text-[#1f4d3a] flex items-center justify-center text-[18px] leading-none">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className={`px-6 pb-6 text-[15px] leading-[1.7] ${muted}`}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-[1040px] mx-auto px-6 py-20">
        <div className="relative overflow-hidden rounded-[40px] bg-[#1f4d3a] px-8 py-14 sm:py-16 text-center">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#a3d65c]/20 blur-2xl" />
          <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-[#2f7d5b]/40 blur-2xl" />
          <div className="relative">
            <h2 className="text-[34px] sm:text-[46px] leading-[1.06] tracking-[-0.02em] font-semibold text-white" style={display}>
              Ready for clearer skin?
            </h2>
            <p className="mt-4 text-[16px] leading-[1.6] text-white/70 max-w-[440px] mx-auto">
              Instant download. Read it tonight on any device and start tomorrow morning.
            </p>
            <button onClick={openModal} className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#a3d65c] hover:bg-[#b4e06f] text-[#17331f] font-extrabold text-[16px] px-9 py-4 shadow-[0_14px_32px_rgba(0,0,0,0.25)] transition active:scale-[0.99]">
              Get Access – {priceDisplay} <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-[1040px] mx-auto px-6 pb-12 text-center">
        <div className="text-[18px] font-semibold" style={display}>{product.name}</div>
        <p className={`mt-3 text-[12px] leading-[1.6] ${muted} max-w-[520px] mx-auto`}>
          Disclaimer: This is a digital PDF guide. Individual results may vary. For informational
          purposes only.
        </p>
      </footer>

      {/* Sticky mobile buy bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-black/[0.08] p-3">
        <button
          onClick={openModal}
          className="w-full bg-[#1f4d3a] text-white font-bold text-[15px] py-4 rounded-full shadow-[0_8px_22px_rgba(31,77,58,0.3)] active:scale-[0.99] transition"
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
