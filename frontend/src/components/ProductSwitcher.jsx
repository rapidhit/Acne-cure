import { useEffect, useRef, useState } from "react";

export default function ProductSwitcher({ products, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = products.find((p) => p.id === selectedId);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-left hover:bg-white/[0.08] transition-colors"
      >
        <span className="min-w-0">
          <span className="block font-console font-semibold text-[13px] text-white truncate">
            {current?.name || "Select product"}
          </span>
          <span className="block font-console text-[11px] text-white/40 truncate">/{current?.slug}</span>
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className={`shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 1L5 5L9 1" stroke="#ffffff88" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-lg border border-white/10 bg-[#161D2E] shadow-[0_16px_40px_rgba(0,0,0,0.4)] overflow-hidden max-h-64 overflow-y-auto">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 font-console text-[13px] hover:bg-white/[0.06] ${
                p.id === selectedId ? "text-accent font-semibold" : "text-white/80"
              }`}
            >
              <span className="block truncate">{p.name}</span>
              <span className="block text-[11px] text-white/40 truncate">/{p.slug}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
