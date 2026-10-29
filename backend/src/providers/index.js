import * as paystack from "./paystack.js";
import * as flutterwave from "./flutterwave.js";
import * as korapay from "./korapay.js";
import * as bachs from "./bachs.js";

const PROVIDERS = { paystack, flutterwave, korapay, bachs };

export const PROVIDER_NAMES = Object.keys(PROVIDERS);

export function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown payment provider: ${name}`);
  return provider;
}
