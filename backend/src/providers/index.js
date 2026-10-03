import * as paystack from "./paystack.js";
import * as flutterwave from "./flutterwave.js";
import * as korapay from "./korapay.js";

const PROVIDERS = { paystack, flutterwave, korapay };

export const PROVIDER_NAMES = Object.keys(PROVIDERS);

export function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown payment provider: ${name}`);
  return provider;
}
