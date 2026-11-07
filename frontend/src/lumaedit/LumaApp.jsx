import { useEffect, useMemo, useState } from 'react';
import { BASE_EDIT_PRICE_USD, BUSINESS_NAME, WHATSAPP_NUMBER } from './config.js';
import { detectLocalPricing, FALLBACK_PRICING, formatCurrency, roundCurrencyAmount } from './pricing.js';

const styles = [
  {
    id: 'birthday-poster',
    name: 'Birthday Poster',
    description: 'A personalized birthday poster featuring your photo and greeting.',
    image: '/lumaedit/images/birthday-poster.jpg',
    alt: 'Birthday poster featuring a portrait, red rose, and birthday greeting',
    poster: true,
  },
];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i className="brand-mark__yellow" />
      <i className="brand-mark__pink" />
      <i className="brand-mark__cyan" />
    </span>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2a9.87 9.87 0 0 0-8.43 15.01L2.3 22l5.14-1.35A9.97 9.97 0 0 0 12.03 22h.01A10 10 0 0 0 22 12.01 9.96 9.96 0 0 0 12.04 2Zm-.01 18.3h-.01a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.05.8.82-2.97-.2-.31a8.3 8.3 0 1 1 6.97 3.82Zm4.56-6.22c-.25-.12-1.48-.73-1.71-.81-.23-.09-.4-.13-.57.12-.17.25-.65.81-.8.98-.15.17-.3.19-.55.06-.26-.12-1.08-.4-2.06-1.27-.76-.67-1.27-1.5-1.42-1.75-.15-.25-.02-.39.11-.52.11-.11.26-.3.38-.44.13-.15.17-.25.26-.42.08-.17.04-.32-.02-.44-.07-.12-.57-1.37-.78-1.88-.2-.49-.41-.42-.57-.43l-.49-.01c-.17 0-.45.06-.68.32-.23.25-.89.87-.89 2.12 0 1.26.91 2.48 1.03 2.65.13.17 1.79 2.73 4.34 3.83.61.27 1.08.42 1.45.54.61.19 1.16.16 1.6.1.49-.07 1.48-.61 1.69-1.2.21-.59.21-1.1.15-1.2-.07-.11-.23-.17-.49-.3Z" />
    </svg>
  );
}

function App() {
  const [selectedIds, setSelectedIds] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const [floatingError, setFloatingError] = useState('');
  const [pricing, setPricing] = useState({ ...FALLBACK_PRICING, status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    detectLocalPricing(controller.signal).then((result) => {
      if (!cancelled) setPricing(result);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const selectedStyles = useMemo(
    () => styles.filter((style) => selectedIds.includes(style.id)),
    [selectedIds],
  );
  const formattedNumber = WHATSAPP_NUMBER.replace(/\D/g, '');
  const localCurrencyInUse = pricing.status === 'ready' && pricing.currency !== 'USD';
  const unitPriceAmount = roundCurrencyAmount(BASE_EDIT_PRICE_USD * pricing.rate, pricing.currency);
  const totalPriceAmount = unitPriceAmount * selectedStyles.length;
  const usdUnitPriceLabel = `${formatCurrency(BASE_EDIT_PRICE_USD, 'USD', 'US')} USD`;
  const unitPriceLabel = localCurrencyInUse
    ? formatCurrency(unitPriceAmount, pricing.currency, pricing.countryCode)
    : usdUnitPriceLabel;
  const totalPriceLabel = selectedStyles.length === 0
    ? '—'
    : localCurrencyInUse
      ? formatCurrency(totalPriceAmount, pricing.currency, pricing.countryCode)
      : `${formatCurrency(BASE_EDIT_PRICE_USD * selectedStyles.length, 'USD', 'US')} USD`;

  function toggleStyle(id) {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
    setNotice('');
    setFloatingError('');
  }

  function removeStyle(id) {
    setSelectedIds((current) => current.filter((item) => item !== id));
    setNotice('');
    setFloatingError('');
  }

  function sendRequest() {
    if (selectedStyles.length === 0) {
      const message = 'Please pick a style to continue.';
      setNotice(message);
      setFloatingError(message);
      return;
    }

    if (pricing.status === 'loading') {
      const message = 'Please wait while we check your local price.';
      setNotice(message);
      setFloatingError(message);
      return;
    }

    setFloatingError('');
    if (formattedNumber.length < 8) {
      const message = 'The WhatsApp contact is not available yet. Please try again later.';
      setNotice(message);
      setFloatingError(message);
      return;
    }

    const lines = [
      `Hi ${BUSINESS_NAME}! I’d like to order an AI photo edit.`,
      '',
      `Style${selectedStyles.length > 1 ? 's' : ''}:`,
      ...selectedStyles.map((style) => `• ${style.name}`),
    ];
    if (customerName.trim()) lines.push('', `My name: ${customerName.trim()}`);
    if (note.trim()) lines.push('', `Extra details: ${note.trim()}`);

    lines.push('', `Total edit cost to pay: ${totalPriceLabel}`);

    const message = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/${formattedNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
    setNotice('Your WhatsApp message is ready to review.');
  }

  const floatingPrompt = floatingError || (selectedStyles.length === 0
    ? 'Pick a style to continue'
    : pricing.status === 'loading'
      ? 'Checking local price…'
      : `Total for ${selectedStyles.length} ${selectedStyles.length === 1 ? 'edit' : 'edits'}: ${totalPriceLabel}`);

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner page-wrap">
          <a className="brand" href="#top" aria-label={`${BUSINESS_NAME} home`}>
            <BrandMark />
            <span>Luma <strong>Edit</strong></span>
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            <a href="#styles">Styles</a>
          </nav>
          <a className="button button--yellow header-cta" href="#styles">Choose a style</a>
        </div>
      </header>

      <main id="top">
        <section className="hero page-wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">A little refresh for your photo</p>
            <h1 id="hero-title">A fresh look for<br /><span>your favourite photo.</span></h1>
            <p className="hero-lede">Pick a style you like. We’ll confirm the price on WhatsApp.</p>
            <a className="button button--yellow" href="#styles">Choose your Style <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-photo">
            <img
              src="/lumaedit/images/hero-portrait.jpg"
              alt="Portrait example for Luma Edit’s photo editing service"
              fetchpriority="high"
            />
          </div>
        </section>

        <section className="styles-section" id="styles" aria-labelledby="styles-title">
          <div className="page-wrap">
            <div className="section-heading">
              <div>
                <h2 id="styles-title">Pick a look you like</h2>
              </div>
              <p>Choose one or more. We’ll add your picks to the request.</p>
            </div>

            <div className="order-layout">
              <div className="style-grid" aria-label="Choose one or more photo editing styles">
                {styles.map((style) => {
                  const isSelected = selectedIds.includes(style.id);
                  return (
                    <button
                      className={`style-card${style.poster ? ' style-card--poster' : ''}${isSelected ? ' is-selected' : ''}`}
                      type="button"
                      key={style.id}
                      aria-pressed={isSelected}
                      onClick={() => toggleStyle(style.id)}
                    >
                      <span className="style-image-wrap">
                        <img src={style.image} alt={style.alt} loading="lazy" />
                        <span className={`select-indicator${isSelected ? ' is-checked' : ''}`} aria-hidden="true">
                          {isSelected ? '✓' : '+'}
                        </span>
                      </span>
                      <span className="style-card-copy">
                        <span className="style-card-title">{style.name}</span>
                        <span className="style-card-description">{style.description}</span>
                        <span className="style-card-price">{unitPriceLabel} / edit</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <aside className="order-card" aria-labelledby="order-title">
                <div className="order-card-heading">
                  <div>
                    <h3 id="order-title">Your picks</h3>
                  </div>
                  <span className="order-count" aria-label={`${selectedStyles.length} styles selected`}>
                    {selectedStyles.length}
                  </span>
                </div>
                <div className="selected-list" aria-live="polite">
                  {selectedStyles.length > 0 ? selectedStyles.map((style) => (
                    <div className="selected-item" key={style.id}>
                      <span>{style.name}</span>
                      <button type="button" onClick={() => removeStyle(style.id)} aria-label={`Remove ${style.name}`}>Remove</button>
                    </div>
                  )) : (
                    <p className="empty-selection">Choose a style and it’ll show up here.</p>
                  )}
                </div>

                <div className="price-summary" aria-live="polite">
                  <div className="price-summary-row">
                    <span>Price per edit</span>
                    <strong>{unitPriceLabel}</strong>
                  </div>
                  <div className="price-summary-row price-summary-row--total">
                    <span>Total ({selectedStyles.length} {selectedStyles.length === 1 ? 'edit' : 'edits'})</span>
                    <strong>{totalPriceLabel}</strong>
                  </div>
                </div>
                {pricing.status === 'fallback' && (
                  <p className="order-hint">Local currency is unavailable; prices are shown in USD.</p>
                )}

                <div className="order-fields">
                  <label htmlFor="customer-name">Your name <span>Optional</span></label>
                  <input
                    id="customer-name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Name"
                    autoComplete="name"
                  />
                  <label htmlFor="order-note">Anything else? <span>Optional</span></label>
                  <textarea
                    id="order-note"
                    rows="2"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Tell us what you have in mind"
                  />
                </div>
                {notice && <p className="form-notice" role="status">{notice}</p>}
              </aside>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer page-wrap">
        <a className="brand" href="#top"><BrandMark /><span>Luma <strong>Edit</strong></span></a>
        <p>Here to help you find a new favourite photo.</p>
      </footer>

      <div className="floating-order-bar" role="region" aria-label="Continue order on WhatsApp">
        <p
          className={`floating-order-prompt${floatingError ? ' is-error' : ''}`}
          role={floatingError ? 'alert' : undefined}
          aria-live={floatingError ? 'assertive' : 'polite'}
        >
          {floatingPrompt}
        </p>
        <button
          className="button button--whatsapp"
          type="button"
          onClick={sendRequest}
          disabled={selectedStyles.length > 0 && pricing.status === 'loading'}
        >
          <WhatsAppIcon />
          <span>Continue on WhatsApp</span>
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </div>
  );
}

export default App;
