import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white text-[#0b2a3a]" style={{ fontFamily: "'Figtree', system-ui, sans-serif" }}>
      <header className="border-b border-[#e4e9ee]">
        <div className="max-w-[720px] mx-auto px-6 h-[60px] flex items-center justify-between">
          <span className="text-[19px] font-bold">Flawless Natural Remedies</span>
          <Link to="/acnepurge" className="shrink-0 ml-3 text-[14px] font-semibold text-[#1f4d3a]">← Back</Link>
        </div>
      </header>
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <h1 className="text-[32px] leading-tight tracking-[-0.015em] font-bold">Terms of Service</h1>
        <p className="mt-1 text-[14px] text-[#4a5b66]">Last updated: September 2026</p>

        <p className="mt-6 text-[16px] leading-[1.75] text-[#4a5b66]">
          Welcome to Flawless Natural Remedies. These terms explain what you're agreeing to when
          you buy something from us, so please take a minute to read them.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">1. Who we are</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          Flawless Natural Remedies is a small, Ghana-based digital shop. We create and sell
          simple, practical guides on things like skincare and natural wellness. Our main product
          right now is "Flawless Natural Remedies," a short guide covering a simple natural
          approach to clearer skin. We also sell other digital products and course access
          from time to time — all of them work the same way described below.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">2. What you're buying</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          Everything we sell is digital. When you pay, you either get a download link for a PDF
          guide, or you get access to a private Telegram group or channel for a course. There's no
          physical product, nothing gets shipped, and access is generally available right after
          your payment is confirmed.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">3. Payment</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          All payments are processed securely through Paystack. We never see or store your card
          details — that's handled entirely by Paystack. Prices are shown in your local currency
          where possible for convenience, but your payment is processed in the currency your card
          and Paystack support.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">4. Refunds</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          Because our products are digital and access is instant, we don't offer refunds once a
          download link has been used or Telegram access has been granted. If something goes
          wrong on our end — the file is broken, the link doesn't work, you were charged twice, or
          you didn't receive access at all — contact us and we'll sort it out, including a refund
          if that's the right outcome. We just ask that you reach out before opening a dispute
          with your bank or Paystack, since it's usually faster to fix things directly with us.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">5. Using what you buy</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          The guides and course materials are for your own personal use. Please don't resell,
          redistribute, or share the PDF or Telegram access with people who haven't paid for it.
          We put real time into creating this content, and respecting that keeps us able to keep
          making it.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">6. Not medical advice</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          This is the important one. Our acne guide shares natural approaches that have worked for
          real people, but it isn't a substitute for advice from a dermatologist or doctor. Skin
          is different for everyone, and results vary. If you have severe, painful, or persistent
          acne, or any other skin condition, please see a medical professional. We're not
          promising specific results, and nothing in our guides should be treated as a medical
          diagnosis or treatment plan.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">7. Changes to price or content</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          We sometimes update pricing, add content, or run limited-time offers. We won't change
          the price of something you've already paid for, but future pricing can change at any
          time.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">8. Contact</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          Questions, problems, or anything else — reach us directly through the Contact Support
          button on the site, or message our support bot on Telegram. We read everything and try
          to respond quickly.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">9. Governing law</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          These terms are governed by the laws of Ghana.
        </p>

        <div className="mt-10 pt-6 border-t border-[#e4e9ee]">
          <Link to="/privacy-policy" className="text-[14px] font-semibold text-[#1f4d3a]">Privacy Policy →</Link>
        </div>
      </div>
    </div>
  );
}
