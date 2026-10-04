import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export default function SupportFloatingButton() {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    api.getSupportLink().then((r) => setUrl(r.url)).catch(() => {});
  }, []);

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full bg-[#229ED9] text-white text-[13px] font-semibold pl-3.5 pr-4 py-3 shadow-[0_8px_24px_rgba(34,158,217,0.45)]"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.03 2 11c0 2.4 1.06 4.57 2.8 6.19L4 22l5.05-1.65C10.06 20.77 11.01 21 12 21c5.52 0 10-4.03 10-9s-4.48-10-10-10z" />
      </svg>
      Contact Support
    </a>
  );
}
