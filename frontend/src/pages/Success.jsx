import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api.js";

export default function Success() {
  const [params] = useSearchParams();
  const reference = params.get("reference");
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      setMessage("Missing payment reference.");
      return;
    }
    api
      .verifyPayment(reference)
      .then((data) => {
        setStatus("success");
        setDownloadUrl(data.downloadUrl);
      })
      .catch((e) => {
        setStatus("error");
        setMessage(e.message || "We could not confirm this payment.");
      });
  }, [reference]);

  return (
    <div className="min-h-screen bg-[#fffef9] text-[#0f3d1f] flex items-center justify-center px-5">
      <div className="max-w-[440px] w-full rounded-[24px] border border-black/10 p-8 text-center">
        {status === "verifying" && (
          <>
            <div className="w-10 h-10 mx-auto rounded-full border-4 border-[#a3d65c] border-t-transparent animate-spin" />
            <p className="mt-4 text-[15px]">Confirming your payment with Paystack…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-[48px]">✅</div>
            <h1 className="mt-2 text-[22px] font-black">You're all set!</h1>
            <p className="mt-2 text-[14px] text-[#0f3d1f]/70">
              Your payment was confirmed. Your download link is ready below and also expires after
              a while for security — grab it now.
            </p>
            <a
              href={downloadUrl}
              className="mt-6 inline-block w-full rounded-full bg-[#dc2626] text-white font-bold text-[16px] py-4"
            >
              📘 Download Your PDF
            </a>
            <p className="mt-3 text-[11px] text-[#0f3d1f]/50">
              Reference: {reference}
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-[48px]">⚠️</div>
            <h1 className="mt-2 text-[20px] font-black">We couldn't confirm this payment</h1>
            <p className="mt-2 text-[14px] text-[#0f3d1f]/70">{message}</p>
            <Link to="/" className="mt-6 inline-block text-[14px] font-semibold underline">
              Back to the guide
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
