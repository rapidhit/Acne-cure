import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export const PENDING_ORDER_KEY = "flw_pending_order";

// If a buyer paid on a hosted checkout page but never got sent back to us (the
// gateway page stuck, they pressed Back, closed the tab...), their paid order is
// still confirmed server-side. When they next open the product page, find it and
// offer the download instead of leaving them stranded.
export default function RecoverOrder() {
  const [reference, setReference] = useState(null);

  useEffect(() => {
    let pending;
    try {
      pending = JSON.parse(localStorage.getItem(PENDING_ORDER_KEY) || "null");
    } catch {
      pending = null;
    }
    if (!pending?.reference || Date.now() - pending.at > 48 * 60 * 60 * 1000) {
      try { localStorage.removeItem(PENDING_ORDER_KEY); } catch {}
      return;
    }

    let cancelled = false;
    let tries = 0;
    const check = () => {
      api
        .verifyPayment(pending.reference)
        .then((data) => {
          if (cancelled) return;
          if (data.status === "success") setReference(pending.reference);
          else if (data.status === "pending" && ++tries < 6) setTimeout(check, 5000);
        })
        .catch((e) => {
          // A definite "not paid" means this order is dead — stop checking it.
          if (/not confirmed/i.test(e.message)) {
            try { localStorage.removeItem(PENDING_ORDER_KEY); } catch {}
          }
        });
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!reference) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[90] bg-[#1f4d3a] text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
      <span className="text-[13.5px] font-semibold leading-snug">Your payment went through.</span>
      <a
        href={`/success?reference=${encodeURIComponent(reference)}`}
        className="shrink-0 rounded-full bg-white text-[#1f4d3a] text-[13px] font-bold px-4 py-2"
      >
        Get my download →
      </a>
    </div>
  );
}
