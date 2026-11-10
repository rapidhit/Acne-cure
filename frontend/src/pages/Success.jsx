import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import ConfettiBurst from "../components/ConfettiBurst.jsx";
import ReviewForm from "../components/ReviewForm.jsx";
import SupportFloatingButton from "../components/SupportFloatingButton.jsx";

export default function Success() {
  const [params] = useSearchParams();
  const reference = params.get("reference");
  const providerRef = params.get("providerRef");
  const [status, setStatus] = useState("verifying"); // verifying | celebrating | success | error
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [deliveryType, setDeliveryType] = useState("pdf");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      setMessage("Missing payment reference.");
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 25; // ~75s: mobile money can take a moment to settle
    const attempt = () => {
      api
        .verifyPayment(reference, providerRef)
        .then((data) => {
          if (cancelled) return;
          if (data.status === "pending" && ++attempts < MAX_ATTEMPTS) {
            setTimeout(attempt, 3000);
            return;
          }
          if (data.status === "pending") {
            setStatus("error");
            setMessage("Your payment is still processing. Refresh this page in a minute, or contact support with your reference.");
            return;
          }
          setDownloadUrl(data.downloadUrl);
          setDeliveryType(data.deliveryType || "pdf");
          try { localStorage.removeItem("flw_pending_order"); } catch {}
          setStatus("celebrating");
        })
        .catch((e) => {
          if (cancelled) return;
          setStatus("error");
          setMessage(e.message || "We could not confirm this payment.");
        });
    };
    attempt();
    return () => {
      cancelled = true;
    };
  }, [reference, providerRef]);

  useEffect(() => {
    if (status !== "celebrating") return;
    const t = setTimeout(() => setStatus("success"), 1700);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e3effa_0%,#e9f3e4_45%,#ffffff_100%)] text-[#0b2a3a] flex items-center justify-center px-5 py-10" style={{ fontFamily: "'Figtree', system-ui, sans-serif" }}>
      <SupportFloatingButton />
      <div className="max-w-[440px] w-full">
        <div className="relative rounded-[24px] border border-[#e4e9ee] bg-white shadow-[0_2px_10px_rgba(11,42,58,0.05)] p-8 text-center overflow-hidden">
          {status === "verifying" && (
            <>
              <div className="w-10 h-10 mx-auto rounded-full border-4 border-[#1f4d3a] border-t-transparent animate-spin" />
              <p className="mt-4 text-[15px]">Confirming your payment…</p>
            </>
          )}

          {status === "celebrating" && (
            <>
              <ConfettiBurst />
              <div
                className="w-16 h-16 mx-auto rounded-full bg-[#e6f1e0] flex items-center justify-center"
                style={{ animation: "checkmark-pop 0.5s ease-out forwards" }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#1f4d3a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="mt-4 text-[16px] font-bold">Payment confirmed!</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-14 h-14 mx-auto rounded-full bg-[#e6f1e0] flex items-center justify-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#1f4d3a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="mt-3 text-[26px] font-bold">You're all set!</h1>
              <p className="mt-2 text-[15.5px] leading-[1.6] text-[#4a5b66]">
                {deliveryType === "telegram"
                  ? "Tap below to join the Telegram group — your access link expires after a while for security."
                  : "Your download link is ready below and expires after a while for security — grab it now."}
              </p>
              <a
                href={downloadUrl}
                target={deliveryType === "telegram" ? "_blank" : undefined}
                rel={deliveryType === "telegram" ? "noopener noreferrer" : undefined}
                className={`mt-6 inline-flex items-center justify-center gap-2 w-full rounded-2xl text-white font-bold text-[16px] py-4 ${
                  deliveryType === "telegram" ? "bg-[#229ED9]" : "bg-[#1f4d3a] hover:bg-[#173b2c]"
                }`}
              >
                {deliveryType === "telegram" ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.95 5.5l-3.15 14.85c-.24 1.05-.87 1.31-1.76.82l-4.86-3.58-2.35 2.26c-.26.26-.48.48-.98.48l.35-4.94 9-8.13c.39-.35-.09-.54-.6-.2L6.6 13.44l-4.83-1.51c-1.05-.33-1.07-1.05.22-1.55L20.7 4.14c.87-.33 1.63.2 1.25 1.36z" />
                    </svg>
                    Join Telegram Group
                  </>
                ) : (
                  "Download Now"
                )}
              </a>
              <p className="mt-3 text-[12px] text-[#4a5b66]/80">Reference: {reference}</p>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className=" text-[22px] font-bold">We couldn't confirm this payment</h1>
              <p className="mt-2 text-[15.5px] leading-[1.6] text-[#4a5b66]">{message}</p>
              <Link to="/" className="mt-6 inline-block text-[15px] font-semibold text-[#1f4d3a]">
                Back
              </Link>
            </>
          )}
        </div>

        {status === "success" && <ReviewForm reference={reference} />}
      </div>
    </div>
  );
}
