import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white text-[#0b2a3a]" style={{ fontFamily: "'Figtree', system-ui, sans-serif" }}>
      <header className="border-b border-[#e4e9ee]">
        <div className="max-w-[720px] mx-auto px-6 h-[60px] flex items-center justify-between">
          <span className="text-[19px] font-bold">Flawless Natural Remedies</span>
          <Link to="/acnepurge" className="shrink-0 ml-3 text-[14px] font-semibold text-[#1f4d3a]">← Back</Link>
        </div>
      </header>
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <h1 className="text-[32px] leading-tight tracking-[-0.015em] font-bold">Privacy Policy</h1>
        <p className="mt-1 text-[14px] text-[#4a5b66]">Last updated: September 2026</p>

        <p className="mt-6 text-[16px] leading-[1.75] text-[#4a5b66]">
          Your privacy matters to us, and this page explains simply what we collect and why.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">1. What we collect</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">When you buy something from us, we collect:</p>
        <ul className="mt-2 space-y-1.5 text-[16px] leading-[1.7] text-[#4a5b66] list-disc pl-5">
          <li>Your email address, so we can send your receipt and, where relevant, your download link</li>
          <li>Basic payment information handled entirely by Paystack — we don't see or store your card details</li>
          <li>If you contact support, whatever you tell us (like your country and a description of your issue) so we can help you properly</li>
        </ul>
        <p className="mt-3 text-[16px] leading-[1.75] text-[#4a5b66]">
          We also collect some general, non-identifying information automatically when you visit
          the site, like which page you visited and roughly where you're visiting from — used only
          to show prices in your local currency.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">2. What we don't collect</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          We don't ask for your home address, phone number, or any government ID. We don't
          collect more than we need to deliver what you paid for and support you afterward.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">3. How we use it</h2>
        <ul className="mt-2 space-y-1.5 text-[16px] leading-[1.7] text-[#4a5b66] list-disc pl-5">
          <li>To deliver your purchase (send your download link or Telegram access)</li>
          <li>To respond if you contact support</li>
          <li>To understand, in a general way, how the site is performing — not for tracking individuals</li>
          <li>To show you prices in a currency that makes sense for your location</li>
        </ul>

        <h2 className="mt-10 text-[19px] font-bold">4. Who we share it with</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          We share payment details with Paystack, since they process every transaction — that's
          the only way payment can happen. If you reach out through our Telegram support bot, your
          message is naturally visible in Telegram same as any conversation on that platform.
          Outside of that, we don't sell, rent, or hand your information to advertisers or other
          third parties.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">5. How long we keep it</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          We keep purchase records for as long as reasonably needed for accounting, support, and
          legal purposes. If you want your data removed and there's no legal reason we need to
          keep it, message us and we'll take care of it.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">6. Your rights</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          You can ask us what information we have about you, ask us to correct it, or ask us to
          delete it. Just get in touch through support and we'll respond.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">7. Security</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          We take reasonable steps to keep your information secure, including relying on
          Paystack's own security for anything payment-related, since they're a licensed,
          regulated payment processor.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">8. Changes to this policy</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          If anything meaningful changes about how we handle your data, we'll update this page.
        </p>

        <h2 className="mt-10 text-[19px] font-bold">9. Contact</h2>
        <p className="mt-2 text-[16px] leading-[1.75] text-[#4a5b66]">
          Reach out anytime through the Contact Support button on the site or our Telegram support bot.
        </p>

        <div className="mt-10 pt-6 border-t border-[#e4e9ee]">
          <Link to="/terms-of-service" className="text-[14px] font-semibold text-[#1f4d3a]">Terms of Service →</Link>
        </div>
      </div>
    </div>
  );
}
