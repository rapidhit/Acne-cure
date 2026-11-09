import { useEffect, useMemo, useRef, useState } from "react";
import CheckoutModal, { formatPrice } from "../components/CheckoutModal.jsx";
import PageLoader from "../components/PageLoader.jsx";
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
    a: "It's designed to be read in one sitting – about 10 minutes.",
  },
];

// Marketing "was" price is computed proportionally below, matching whatever currency is set.

// Fades + slides content up the first time it scrolls into view.
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7"} ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

// Horizontal swipe carousel that advances by itself every 5s and pauses while touched.
function Carousel({ children, intervalMs = 5000 }) {
  const ref = useRef(null);
  const paused = useRef(false);
  const resumeTimer = useRef(null);
  const [active, setActive] = useState(0);
  const items = Array.isArray(children) ? children : [children];
  const count = items.length;

  function slideLeft(i) {
    const el = ref.current;
    const first = el.children[0];
    return el.children[i].offsetLeft - first.offsetLeft;
  }

  useEffect(() => {
    if (count < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      const el = ref.current;
      if (!el || paused.current) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
      let idx = 0;
      let best = Infinity;
      for (let i = 0; i < count; i++) {
        const d = Math.abs(slideLeft(i) - el.scrollLeft);
        if (d < best) { best = d; idx = i; }
      }
      const next = atEnd ? 0 : (idx + 1) % count;
      el.scrollTo({ left: slideLeft(next), behavior: "smooth" });
    }, intervalMs);
    return () => clearInterval(id);
  }, [count, intervalMs]);

  function onScroll() {
    const el = ref.current;
    let idx = 0;
    let best = Infinity;
    for (let i = 0; i < count; i++) {
      const d = Math.abs(slideLeft(i) - el.scrollLeft);
      if (d < best) { best = d; idx = i; }
    }
    setActive(idx);
  }

  function pause() {
    paused.current = true;
    clearTimeout(resumeTimer.current);
  }
  function resume() {
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => (paused.current = false), 4000);
  }

  return (
    <div>
      <div
        ref={ref}
        onScroll={onScroll}
        onTouchStart={pause}
        onTouchEnd={resume}
        onMouseEnter={pause}
        onMouseLeave={resume}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-pl-6 pb-6 -mx-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <div key={i} className="snap-start shrink-0 w-[86%] sm:w-[calc(50%-10px)]">
            {child}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to review ${i + 1}`}
            onClick={() => {
              pause();
              ref.current.scrollTo({ left: slideLeft(i), behavior: "smooth" });
              resume();
            }}
            className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-[#1f4d3a]" : "w-2 bg-[#1f4d3a]/25"}`}
          />
        ))}
      </div>
    </div>
  );
}

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
  // The page stays behind a loader until the visitor's currency conversion and
  // welcome offer are resolved (or 5s passes), so prices never visibly change.
  const [geoReady, setGeoReady] = useState(false);
  const [offerReady, setOfferReady] = useState(false);
  const [loaderTimedOut, setLoaderTimedOut] = useState(false);
  const [minTimeDone, setMinTimeDone] = useState(false);
  // Owner-set minimum time the loader stays up (dashboard → Settings).
  const minLoaderMs = Math.max(0, Number(product.loaderSeconds ?? 1)) * 1000;
  useEffect(() => {
    const t1 = setTimeout(() => setMinTimeDone(true), minLoaderMs);
    const t2 = setTimeout(() => setLoaderTimedOut(true), Math.max(5000, minLoaderMs + 3000));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [minLoaderMs]);

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
      .catch(() => {}) // any failure just leaves the real price showing — never breaks the page
      .finally(() => setGeoReady(true));
  }, [product.slug, product.priceKobo, product.currency]);

  // Welcome discount: the server owns the window; we just count down to it.
  const [offer, setOffer] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api
      .getOffer(product.slug)
      .then((o) => {
        if (cancelled || !o?.active) return;
        const offset = o.now ? o.now - Date.now() : 0; // server/client clock difference
        setOffer({ ...o, offset });
        setSecondsLeft(Math.max(0, Math.ceil((o.expiresAt - (Date.now() + offset)) / 1000)));
      })
      .catch(() => {}) // no offer, no problem — normal price shows
      .finally(() => setOfferReady(true));
    return () => {
      cancelled = true;
    };
  }, [product.slug]);
  useEffect(() => {
    if (!offer) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((offer.expiresAt - (Date.now() + offer.offset)) / 1000));
      setSecondsLeft(left);
      if (left <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [offer]);
  const countdown = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

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

  const regularPriceKobo = localizedPriceKobo ?? product.priceKobo;
  const offerActive = Boolean(offer?.active) && secondsLeft > 0;
  const displayPriceKobo = offerActive
    ? Math.max(1, Math.round((regularPriceKobo * (100 - offer.percent)) / 100))
    : regularPriceKobo;
  const displayCurrency = localizedCurrency ?? product.currency;
  const priceDisplay = formatPrice(displayPriceKobo, displayCurrency);
  // Only shown while a real welcome discount is active: the crossed-out figure is
  // the genuine regular price the visitor goes back to paying when the timer ends.
  const originalPriceDisplay = formatPrice(regularPriceKobo, displayCurrency);
  const headline = product.headline || "Are you Battling with Acne or Pimples?";
  const subheadline =
    product.subheadline ||
    `Discover the simple 8-step natural system to clear your skin and boost your confidence`;
  const usingRealReviews = realReviews && realReviews.length > 0;
  // Sample reviews are no longer shown: the section appears only with approved real reviews
  // (or testimonials the owner entered for this product).
  const testimonials = usingRealReviews ? realReviews : product.testimonials?.length ? product.testimonials : [];
  const faqs = product.faqs?.length ? product.faqs : DEFAULT_FAQS;

  if (!(minTimeDone && ((geoReady && offerReady) || loaderTimedOut))) return <PageLoader />;

  function openModal() {
    setShowModal(true);
  }

  const muted = "text-[#1c2b23]/65";
  const display = { fontFamily: "'Poppins', system-ui, sans-serif", fontWeight: 700 };
  const eyebrowFont = { fontFamily: "'Poppins', system-ui, sans-serif", fontWeight: 700 };
  const eyebrow = "text-[12px] font-bold uppercase tracking-[0.22em] text-[#2f7d5b]";
  const h2 = "text-[34px] sm:text-[44px] leading-[1.06] tracking-[-0.02em] font-semibold";
  const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-full bg-[#1f4d3a] hover:bg-[#173b2c] text-white font-bold text-[16px] px-8 py-4 shadow-[0_14px_32px_rgba(31,77,58,0.28)] transition active:scale-[0.99]";

  return (
    <div
      className="min-h-screen bg-white text-[#1c2b23] pb-28 sm:pb-0 overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="max-w-[1040px] mx-auto px-6">
        {/* Header */}
        <header className="py-4 sm:py-5 flex items-center justify-between gap-4 border-b border-[#1f4d3a]/[0.08] sm:border-0">
          <span className="text-[18px] sm:text-[19px] font-semibold tracking-[-0.01em] truncate" style={display}>
            {String(product.name || "").split(" - ")[0]}
          </span>
          <img
            src="/logo.png"
            alt=""
            className="shrink-0 h-[52px] w-auto rounded-xl bg-black p-1.5"
          />
        </header>

        {/* Hero */}
        <section className="pt-8 sm:pt-6 pb-16 sm:pb-20 grid md:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="h-[2px] w-8 bg-[#2f7d5b]" />
              <p className={eyebrow} style={eyebrowFont}>The natural acne guide</p>
            </div>
            <h1 className="mt-5 text-[33px] sm:text-[52px] leading-[1.2] sm:leading-[1.1] tracking-[-0.015em] text-[#0f2a1d] [text-wrap:balance]" style={display}>
              {headline}
            </h1>
            <p className="mt-5 text-[17px] sm:text-[18px] leading-[1.75] font-normal tracking-normal text-[#1c2b23]/70 max-w-[520px] [text-wrap:pretty]">{subheadline}</p>

            <div className="mt-8">
              {offerActive && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border-2 border-[#dc2626]/30 bg-[#fef2f2] px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#dc2626]">
                      Welcome offer · {offer.percent}% off
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-[22px] font-extrabold text-[#dc2626]">{priceDisplay}</span>
                      <span className={`text-[14px] line-through ${muted}`}>{originalPriceDisplay}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[11px] font-semibold text-[#dc2626]/80">Ends in</div>
                    <div className="font-mono text-[22px] font-bold tabular-nums text-[#dc2626]">{countdown}</div>
                  </div>
                </div>
              )}
              <button onClick={openModal} className={`${primaryBtn} w-full sm:w-auto`}>
                Get Access – {priceDisplay} <span aria-hidden="true">→</span>
              </button>
              <p className={`mt-3 text-[13px] ${muted} text-center sm:text-left`}>
                {offerActive ? "Offer applies automatically at checkout" : "One-time payment · Instant access"}
              </p>
            </div>

            <dl className="mt-10 grid grid-cols-3 border-t border-[#1f4d3a]/[0.12] pt-6">
              {[
                ["Instant", "PDF download"],
                ["Natural", "plant-based ingredients"],
                ["10 min", "to read"],
              ].map(([k, v], i) => (
                <div key={k} className={`pr-3 ${i > 0 ? "pl-4 border-l border-[#1f4d3a]/[0.12]" : ""}`}>
                  <dt className="text-[15px] sm:text-[16px] font-extrabold text-[#0f2a1d] leading-tight">{k}</dt>
                  <dd className={`mt-1 text-[12.5px] sm:text-[13px] leading-snug ${muted}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={150} className="relative">
            <div className="absolute -inset-4 rounded-[44px] bg-gradient-to-br from-[#d9eede] via-[#eaf5ee] to-transparent" />
            <div className="relative rounded-[32px] bg-white p-3 shadow-[0_30px_70px_rgba(31,77,58,0.16)] border border-black/[0.04]">
              <img
                src="/before-after.jpg"
                alt={`${product.name} — real results`}
                className="w-full h-auto rounded-[22px] object-cover"
                onError={(e) => (e.currentTarget.parentElement.style.display = "none")}
              />
            </div>
            <div className="hidden md:block absolute -bottom-6 -left-8 rounded-2xl bg-white px-5 py-4 shadow-[0_16px_40px_rgba(31,77,58,0.18)] border border-black/[0.04]">
              <div className="text-[28px] leading-none font-semibold" style={display}>8 steps</div>
              <div className={`mt-1 text-[12px] ${muted}`}>to clearer skin</div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* Steps */}
      <section className="bg-[#f1f8f3] border-y border-[#1f4d3a]/[0.07]">
        <div className="max-w-[1040px] mx-auto px-6 py-20">
          <Reveal className="max-w-[560px]">
            <p className={eyebrow} style={eyebrowFont}>What's inside</p>
            <h2 className={`mt-4 ${h2}`} style={display}>
              Your complete system, <em className="not-italic text-[#2f7d5b]">step by step.</em>
            </h2>
            <p className={`mt-4 text-[17px] leading-[1.65] ${muted}`}>
              No guessing, no 200-page theory. Read it once, start tonight.
            </p>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            {DEFAULT_STEPS.map((s, i) => (
              <Reveal key={s.n} delay={(i % 2) * 120}>
              <div className="h-full rounded-[24px] border-2 border-[#1f4d3a]/15 border-l-[6px] border-l-[#1f4d3a] bg-white p-6 flex gap-5 shadow-[0_18px_44px_rgba(31,77,58,0.14)] hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(31,77,58,0.22)] transition">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-[#1f4d3a] text-white text-[19px] font-semibold flex items-center justify-center" style={display}>
                  {s.n}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-[18px] leading-snug text-[#0f2a1d]">{s.title}</div>
                  <div className={`mt-1.5 text-[14.5px] leading-[1.6] ${muted}`}>{s.sub}</div>
                  {s.tag && (
                    <span className="mt-3 inline-block rounded-full bg-[#1f4d3a]/10 text-[#1f4d3a] text-[11.5px] font-bold px-3 py-1">
                      {s.tag}
                    </span>
                  )}
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      {testimonials.length > 0 && (
      <section className="max-w-[1040px] mx-auto px-6 py-20">
        <Reveal className="max-w-[560px]">
          <p className={eyebrow} style={eyebrowFont}>Reader stories</p>
          <h2 className={`mt-4 ${h2}`} style={display}>
            What <em className="not-italic text-[#2f7d5b]">buyers say.</em>
          </h2>
        </Reveal>
        <Reveal className="mt-12">
        <Carousel>
          {testimonials.map((t) => {
            const isReal = usingRealReviews;
            const key = isReal ? t.id : t.name;
            const displayName = t.name;
            const stars = isReal ? t.rating : t.stars || 5;
            const bodyText = isReal ? t.body : t.text;
            const alreadyLiked = isReal && likedIds.includes(t.id);
            return (
              <figure key={key} className="relative h-full rounded-[28px] bg-white border-[3px] border-[#f5b301] p-7 shadow-[0_18px_44px_rgba(245,179,1,0.22)]">
                <div className="absolute top-3 right-6 text-[72px] leading-none text-[#2f7d5b]/10 select-none" style={display}>”</div>
                <Stars count={stars} />
                <blockquote className="mt-4 text-[16.5px] leading-[1.7] font-medium text-[#0f2a1d]">{bodyText}</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1f4d3a] flex items-center justify-center text-[14px] font-bold text-white">
                    {displayName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-[14.5px]">{displayName}</div>
                    {isReal ? (t.country && <div className={`text-[12.5px] ${muted}`}>{t.country}</div>) : <div className={`text-[12.5px] ${muted}`}>{t.meta}</div>}
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
        </Carousel>
        </Reveal>
      </section>
      )}

      {/* FAQ */}
      <section className="bg-[#f1f8f3] border-y border-[#1f4d3a]/[0.07]">
        <div className="max-w-[760px] mx-auto px-6 py-20">
          <Reveal className="text-center">
            <p className={eyebrow} style={eyebrowFont}>Questions</p>
            <h2 className={`mt-4 ${h2}`} style={display}>Good to know.</h2>
          </Reveal>
          <Reveal delay={100} className="mt-10 space-y-3">
            {faqs.map((f, i) => (
              <div key={f.q} className="rounded-[22px] border-2 border-[#1f4d3a]/15 bg-white overflow-hidden shadow-[0_10px_30px_rgba(31,77,58,0.1)]">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between text-left px-6 py-5"
                >
                  <span className="font-extrabold text-[17px] pr-6 text-[#0f2a1d]">{f.q}</span>
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#1f4d3a] text-white flex items-center justify-center text-[18px] leading-none">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className={`px-6 pb-6 text-[15px] leading-[1.7] ${muted}`}>{f.a}</div>
                )}
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-[1040px] mx-auto px-6 py-20">
        <Reveal>
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
        </Reveal>
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
        originalPriceKobo={offerActive ? regularPriceKobo : null}
        currency={displayCurrency}
      />
    </div>
  );
}
