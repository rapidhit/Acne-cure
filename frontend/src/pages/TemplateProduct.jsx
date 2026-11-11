import { useEffect, useMemo, useRef, useState } from "react";
import CheckoutModal, { formatPrice } from "../components/CheckoutModal.jsx";
import PageLoader from "../components/PageLoader.jsx";
import { api, getOrCreateSessionId } from "../lib/api.js";

// Kept as sensible defaults for the legacy "8 Steps" design — a product using
// template mode can override headline/subheadline/testimonials/faqs from the
// dashboard; anything else falls back to these.
const DEFAULT_STEPS = [
  { n: "01", title: "Why Acne and Pimples Appear", sub: "Learn the common causes, so you know what is behind your breakouts" },
  { n: "02", title: "Know Your Neem Leaf", sub: "Clear photos so you can be sure you are using the real neem leaf" },
  { n: "03", title: "The Neem Treatment", sub: "Simple steps: boil, cool, strain and apply, for 2 weeks" },
  { n: "04", title: "Illustrated Picture Guide", sub: "The whole remedy in pictures, easy to follow for everyone" },
  { n: "05", title: "Best Habits to Stay Clear", sub: "Everyday habits that help keep pimples away" },
  { n: "06", title: "Your 2-Week Challenge", sub: "Take before and after photos, compare, and send them to our support team" },
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
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-pl-6 pb-6 -mx-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
            className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-[#0b2a3a]" : "w-2 bg-[#0b2a3a]/20"}`}
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

  const ink = "text-[#0b2a3a]"; // deep navy-teal for headings
  const muted = "text-[#4a5b66]";
  const font = { fontFamily: "'Figtree', system-ui, sans-serif" };
  const h2 = `text-[28px] sm:text-[36px] leading-[1.2] tracking-[-0.015em] font-bold ${ink}`;
  const card = "rounded-[24px] border border-[#e4e9ee] bg-white shadow-[0_2px_10px_rgba(11,42,58,0.05)]";
  const limeBtn =
    "inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#1f4d3a] hover:bg-[#173b2c] text-white font-bold text-[16px] px-8 py-4 shadow-[0_8px_20px_rgba(31,77,58,0.25)] transition active:scale-[0.99]";
  const arrow = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-white text-[#0b2a3a] pb-28 sm:pb-0 overflow-x-hidden" style={font}>
      {/* Header */}
      <header className="bg-white border-b border-[#e4e9ee]">
        <div className="max-w-[1040px] mx-auto px-6 h-[68px] flex items-center justify-between gap-4">
          <span className={`text-[19px] font-bold tracking-[-0.01em] truncate ${ink}`}>
            {String(product.name || "").split(" - ")[0]}
          </span>
          <img src="/logo.png" alt="" className="shrink-0 h-10 w-auto rounded-lg bg-black p-1" />
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[linear-gradient(180deg,#e3effa_0%,#e9f3e4_45%,#ffffff_100%)]">
        <div className="max-w-[760px] mx-auto px-6 pt-14 sm:pt-20 pb-14 sm:pb-20 text-center">
          <Reveal>
            <h1 className={`text-[34px] sm:text-[52px] leading-[1.15] tracking-[-0.02em] font-bold ${ink} [text-wrap:balance]`}>
              {headline}
            </h1>
            <p className={`mt-5 text-[17px] sm:text-[19px] leading-[1.65] ${muted} max-w-[560px] mx-auto [text-wrap:pretty]`}>
              {subheadline}
            </p>

            <div className="mt-9 flex flex-col items-center">
              {offerActive && (
                <div className="mb-5 w-full max-w-[420px] flex items-center justify-between gap-3 rounded-2xl border border-[#dc2626]/25 bg-white px-4 py-3 text-left">
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#dc2626]">
                      Welcome offer · {offer.percent}% off
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-[22px] font-bold text-[#dc2626]">{priceDisplay}</span>
                      <span className={`text-[14px] line-through ${muted}`}>{originalPriceDisplay}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[11px] font-semibold text-[#dc2626]/80">Ends in</div>
                    <div className="font-mono text-[22px] font-bold tabular-nums text-[#dc2626]">{countdown}</div>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <button onClick={openModal} className={limeBtn}>
                  Get Access – {priceDisplay} {arrow}
                </button>
                <a
                  href="#inside"
                  className="inline-flex items-center justify-center rounded-2xl border border-[#d5dde4] bg-white/80 hover:bg-white text-[#0b2a3a] font-semibold text-[16px] px-8 py-4 transition"
                >
                  See what's inside
                </a>
              </div>
              <p className={`mt-4 text-[14px] ${muted}`}>
                {offerActive ? "Offer applies automatically at checkout" : "One-time payment · Instant access"}
              </p>
            </div>
          </Reveal>

          <Reveal delay={150} className="mt-12">
            <div className="mx-auto max-w-[460px] rounded-[28px] bg-white p-2.5 border border-[#e4e9ee] shadow-[0_12px_40px_rgba(11,42,58,0.10)]">
              <img
                src="/before-after.jpg"
                alt={`${product.name} — real results`}
                className="w-full h-auto rounded-[20px] object-cover"
                onError={(e) => (e.currentTarget.parentElement.style.display = "none")}
              />
            </div>
          </Reveal>

          <dl className="mt-12 grid grid-cols-3 gap-3 max-w-[560px] mx-auto">
            {[
              ["Instant", "PDF download"],
              ["Natural", "plant-based ingredients"],
              ["10 min", "to read"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className={`text-[17px] font-bold ${ink}`}>{k}</dt>
                <dd className={`mt-0.5 text-[13px] leading-snug ${muted}`}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Steps */}
      <section id="inside" className="bg-white">
        <div className="max-w-[1040px] mx-auto px-6 py-16 sm:py-24">
          <Reveal className="text-center max-w-[560px] mx-auto">
            <h2 className={h2}>What is inside the guide</h2>
            <p className={`mt-3 text-[17px] leading-[1.65] ${muted}`}>
              A short, simple guide you can read once and start tonight.
            </p>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            {DEFAULT_STEPS.map((s, i) => (
              <Reveal key={s.n} delay={(i % 2) * 100}>
                <div className={`h-full ${card} p-6 flex gap-5`}>
                  <div className="shrink-0 w-11 h-11 rounded-full bg-[#e6f1e0] text-[#2c6a3a] text-[16px] font-bold flex items-center justify-center">
                    {Number(s.n)}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold text-[18px] leading-snug ${ink}`}>{s.title}</div>
                    <div className={`mt-1.5 text-[15px] leading-[1.6] ${muted}`}>{s.sub}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      {testimonials.length > 0 && (
        <section className="bg-[#f6f8fa]">
          <div className="max-w-[1040px] mx-auto px-6 py-16 sm:py-24">
            <Reveal className="text-center">
              <h2 className={h2}>What buyers say</h2>
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
                    <figure key={key} className="h-full rounded-[24px] bg-white border-2 border-[#f5b301] p-7">
                      <Stars count={stars} />
                      <blockquote className={`mt-4 text-[16.5px] leading-[1.7] ${ink}`}>{bodyText}</blockquote>
                      <figcaption className="mt-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#e6f1e0] flex items-center justify-center text-[15px] font-bold text-[#2c6a3a]">
                          {displayName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-bold text-[15px] ${ink}`}>{displayName}</div>
                          {isReal ? (t.country && <div className={`text-[13px] ${muted}`}>{t.country}</div>) : <div className={`text-[13px] ${muted}`}>{t.meta}</div>}
                        </div>
                        {isReal && (
                          <button
                            onClick={() => handleLike(t.id)}
                            disabled={alreadyLiked}
                            className={`ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                              alreadyLiked ? "text-[#2c6a3a]" : "text-[#4a5b66]/70 hover:text-[#2c6a3a]"
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
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-white">
        <div className="max-w-[760px] mx-auto px-6 py-16 sm:py-24">
          <Reveal className="text-center">
            <h2 className={h2}>Good to know</h2>
          </Reveal>
          <Reveal delay={100} className="mt-10 space-y-3">
            {faqs.map((f, i) => (
              <div key={f.q} className={`${card} overflow-hidden`}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between text-left px-6 py-5"
                >
                  <span className={`font-semibold text-[17px] pr-6 ${ink}`}>{f.q}</span>
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#eef2f5] text-[#0b2a3a] flex items-center justify-center text-[18px] leading-none">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className={`px-6 pb-6 text-[15.5px] leading-[1.7] ${muted}`}>{f.a}</div>
                )}
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#e9f3e4_60%,#e3effa_100%)]">
        <div className="max-w-[680px] mx-auto px-6 py-16 sm:py-24 text-center">
          <Reveal>
            <h2 className={h2}>Ready for clearer skin?</h2>
            <p className={`mt-3 text-[17px] leading-[1.65] ${muted}`}>
              Instant download. Read it tonight on any device and start tomorrow morning.
            </p>
            <button onClick={openModal} className={`mt-8 ${limeBtn}`}>
              Get Access – {priceDisplay} {arrow}
            </button>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e4e9ee] bg-white">
        <div className="max-w-[1040px] mx-auto px-6 py-10 text-center">
          <div className={`text-[17px] font-bold ${ink}`}>{product.name}</div>
          <p className={`mt-3 text-[13px] leading-[1.6] ${muted} max-w-[520px] mx-auto`}>
            Disclaimer: This is a digital PDF guide. Individual results may vary. For informational
            purposes only.
          </p>
        </div>
      </footer>

      {/* Sticky mobile buy bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-[#e4e9ee] p-3">
        <button
          onClick={openModal}
          className="w-full bg-[#1f4d3a] text-white font-bold text-[16px] py-4 rounded-2xl active:scale-[0.99] transition"
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
        feePercent={product.processingFeePercent}
      />
    </div>
  );
}
