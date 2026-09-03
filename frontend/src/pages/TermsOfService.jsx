import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#fffef9] text-[#0f3d1f]">
      <div className="max-w-[640px] mx-auto px-5 py-10">
        <Link to="/acnepurge" className="text-[13px] font-semibold underline">← Back</Link>

        <h1 className="mt-4 text-[26px] font-black">Terms of Service</h1>
        <p className="mt-1 text-[13px] text-[#0f3d1f]/50">Last updated: September 2026</p>

        <p className="mt-6 text-[14.5px] leading-[1.7]">
          Welcome to Flawless Natural Remedies. These terms explain what you're agreeing to when
          you buy something from us, so please take a minute to read them.
        </p>

        <h2 className="mt-8 text-[17px] font-bold">1. Who we are</h2>
        <p className="mt-2 text-[14.5px] leading-[1.7]">
          Flawless Natural Remedies is a small, Ghana-based digital shop. We create and sell
          simple, practical guides on things like skincare and natural wellness. Our main product
          right now is "Flawless Natural Remedies – 8 Steps PDF," a guide covering an 8-step
          natural approach to clearer skin. We also sell other digital products and course access
          from time to time — all of them work the same way described below.
        </p>

        <h2 className="mt-8 text-[17px] font-bold">2. What you're buying</h2>
        <p className="mt-2 text-[14.5px] leading-[1.7]">
          Everything we sell is digital. When you pay, you either get a download link for a PDF
          guide, or you get access to a private Telegram group or channel for a course. There's no
          physical product, nothing gets shipped, and access is generally available right after
          your payment is confirmed.
        </p>

        <h2 className="mt-8 text-[17px] font-bold">3. Payment</h2>
        <p className="mt-2 text-[14.5px] leading-[1.7]">
          All payments are processed securely through Paystack. We never see or store your card
          details — that's handled entirely by Paystack. Prices are shown in your local currency
          where possible for convenience, but your payment is processed in the currency your card
          and Paystack support.
        </p>

        <h2 className="mt-8 text-[17px] font-bold">4. Refunds</h2>
        <p className="mt-2 text-[14.5px] leading-[1.7]">
          Because our products are digital and access is instant, we don't offer refunds once a
          download link has been used or Telegram access has been granted. If something goes
          wrong on our end — the file is broken, the link doesn't work, you were charged twice, or
          you didn't receive access at all — contact us and we'll sort it out, including a refund
          if that's the right outcome. We just ask that you reach out before opening a dispute
          with your bank or Paystack, since it's usually faster to fix things directly with us.
        </p>

        <h2 className="mt-8 text-[17px] font-bold">5. Using what you buy</h2>
        <p className="mt-2 text-[14.5px] leading-[1.7]">
          The guides and course materials are for your own personal use. Please don't resell,
          redistribute, or share the PDF or Telegram access with people who haven't paid for it.
          We put real time into creating this content, and respecting that keeps us able to keep
          making it.
        </p>

        <h2 className="mt-8 text-[17px] font-bold">6. Not medical advice</h2>
        <p className="mt-2 text-[14.5px] leading-[1.7]">
          This is the important one. Our acne guide shares natural approaches that have worked for
          real people, but it isn't a substitute for advice from a dermatologist or doctor. Skin
          is different for everyone, and results vary. If you have severe, painful, or persistent
          acne, or any other skin condition, please see a medical professional. We're not
          promising specific results, and nothing in our guides should be treated as a medical
          diagnosis or treatment plan.
        </p>

        <h2 className="mt-8 text-[17px] font-bold">7. Changes to price or content</h2>
        <p className="mt-2 text-[14.5px] leading-[1.7]">
          We sometimes update pricing, add content, or run limited-time offers. We won't change
          the price of something you've already paid for, but future pricing can change at any
          time.
        </p>

        <h2 className="mt-8 text-[17px] font-bold">8. Contact</h2>
        <p className="mt-2 text-[14.5px] leading-[1.7]">
          Questions, problems, or anything else — reach us directly through the Contact Support
          button on the site, or message our support bot on Telegram. We read everything and try
          to respond quickly.
        </p>

        <h2 className="mt-8 text-[17px] font-bold">9. Governing law</h2>
        <p className="mt-2 text-[14.5px] leading-[1.7]">
          These terms are governed by the laws of Ghana.
        </p>

        <div className="mt-10 pt-6 border-t border-black/10">
          <Link to="/privacy-policy" className="text-[13px] font-semibold underline">Privacy Policy →</Link>
        </div>
      </div>
    </div>
  );
}
