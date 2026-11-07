import countryToCurrency from 'country-to-currency';

const COUNTRY_CACHE_KEY = 'luma-edit-country-v1';
const COUNTRY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export const FALLBACK_PRICING = Object.freeze({
  status: 'fallback',
  currency: 'USD',
  rate: 1,
  countryCode: '',
  rateDate: '',
});

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    signal,
    credentials: 'omit',
    cache: 'default',
  });
  if (!response.ok) throw new Error(`Pricing request failed (${response.status}).`);
  return response.json();
}

function readCachedCountry() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(COUNTRY_CACHE_KEY) || 'null');
    const age = Date.now() - Number(saved?.savedAt);
    if (/^[A-Z]{2}$/.test(saved?.countryCode) && age >= 0 && age < COUNTRY_CACHE_MAX_AGE) {
      return saved.countryCode;
    }
  } catch {
    // Storage may be unavailable; perform a fresh country lookup instead.
  }
  return '';
}

function cacheCountry(countryCode) {
  try {
    window.localStorage.setItem(COUNTRY_CACHE_KEY, JSON.stringify({ countryCode, savedAt: Date.now() }));
  } catch {
    // Pricing still works when the browser blocks local storage.
  }
}

async function detectCountry(signal) {
  const cachedCountry = readCachedCountry();
  if (cachedCountry) return cachedCountry;

  const location = await fetchJson('https://ipwho.is/', signal);
  if (location?.success !== true) throw new Error('Could not detect visitor country.');
  const countryCode = String(location?.country_code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error('Country code was not available.');
  cacheCountry(countryCode);
  return countryCode;
}

export async function detectLocalPricing(signal) {
  try {
    const countryCode = await detectCountry(signal);
    const currency = countryToCurrency[countryCode];
    if (!currency || !/^[A-Z]{3}$/.test(currency)) return { ...FALLBACK_PRICING };
    if (currency === 'USD') {
      return { status: 'ready', currency, rate: 1, countryCode, rateDate: '' };
    }

    const quote = await fetchJson(
      `https://api.frankfurter.dev/v2/rate/usd/${currency.toLowerCase()}`,
      signal,
    );
    const rate = Number(quote?.rate);
    if (quote?.base !== 'USD' || quote?.quote !== currency || !Number.isFinite(rate) || rate <= 0) {
      return { ...FALLBACK_PRICING };
    }

    return {
      status: 'ready',
      currency,
      rate,
      countryCode,
      rateDate: typeof quote.date === 'string' ? quote.date : '',
    };
  } catch {
    return { ...FALLBACK_PRICING };
  }
}

export function formatCurrency(amount, currency, countryCode) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const locales = countryCode ? [`en-${countryCode}`, 'en-US'] : ['en-US'];

  for (const locale of locales) {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(safeAmount);
    } catch {
      // Try the next locale before falling back to an explicit currency code.
    }
  }

  return `${currency} ${safeAmount.toFixed(2)}`;
}

export function roundCurrencyAmount(amount, currency) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    const fractionDigits = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits;
    const scale = 10 ** fractionDigits;
    return Math.round((safeAmount + 1e-8) * scale) / scale;
  } catch {
    return Math.round((safeAmount + 1e-8) * 100) / 100;
  }
}
