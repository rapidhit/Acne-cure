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
      className="fixed top-4 right-4 z-40 flex items-center gap-1.5 rounded-full bg-[#0f3d1f] text-white text-[12.5px] font-semibold pl-3 pr-3.5 py-2.5 shadow-[0_8px_20px_rgba(15,61,31,0.35)]"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.03 2 11c0 2.4 1.06 4.57 2.8 6.19L4 22l5.05-1.65C10.06 20.77 11.01 21 12 21c5.52 0 10-4.03 10-9s-4.48-10-10-10z" />
      </svg>
      Support
    </a>
  );
}
