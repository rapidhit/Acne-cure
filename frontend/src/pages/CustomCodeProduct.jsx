import { useEffect, useRef, useState } from "react";
import CheckoutModal from "../components/CheckoutModal.jsx";
import FloatingButton from "../components/FloatingButton.jsx";

export default function CustomCodeProduct({ product }) {
  const iframeRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(800);
  const [showModal, setShowModal] = useState(false);

  function handleIframeLoad() {
    const doc = iframeRef.current?.contentDocument;
    if (doc?.body) {
      // Measure the actual rendered height of the pasted page so our button
      // overlay lines up correctly with where the admin placed each button.
      const height = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
      setContentHeight(height || 800);
    }
  }

  return (
    <div className="relative w-full" style={{ minHeight: contentHeight }}>
      <iframe
        ref={iframeRef}
        title={product.name}
        srcDoc={product.customHtml || "<p style='padding:2rem;font-family:sans-serif'>This product's page hasn't been set up yet.</p>"}
        onLoad={handleIframeLoad}
        className="w-full border-0 block"
        style={{ height: contentHeight }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />

      {/* Button overlay — positioned as percentages of the measured content height so it holds up across screen sizes */}
      <div className="absolute inset-0 pointer-events-none" style={{ height: contentHeight }}>
        {(product.inlineButtons || []).map((btn) => (
          <button
            key={btn.id ?? `${btn.xPercent}-${btn.yPercent}`}
            onClick={() => setShowModal(true)}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black text-[14px] px-6 py-3.5 rounded-full shadow-[0_10px_24px_rgba(220,38,38,0.45)] whitespace-nowrap"
            style={{ left: `${btn.xPercent}%`, top: `${btn.yPercent}%` }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <FloatingButton config={product.floating} onClick={() => setShowModal(true)} />

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
