import { useEffect, useState } from "react";

/**
 * config: { enabled, label, position: 'top'|'bottom'|'scroll_trigger', scrollPercent, stickTo: 'top'|'bottom' }
 */
export default function FloatingButton({ config, onClick }) {
  const [visible, setVisible] = useState(config.position !== "scroll_trigger");

  useEffect(() => {
    if (config.position !== "scroll_trigger") {
      setVisible(true);
      return;
    }
    setVisible(false);

    function handleScroll() {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setVisible(pct >= (config.scrollPercent ?? 50));
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [config.position, config.scrollPercent]);

  if (!config.enabled || !visible) return null;

  const stickTo = config.position === "scroll_trigger" ? config.stickTo : config.position;
  const edgeClass = stickTo === "top" ? "top-0 border-b" : "bottom-0 border-t";

  return (
    <div className={`fixed inset-x-0 ${edgeClass} z-50 bg-white/95 backdrop-blur border-black/10 p-3 animate-[in_0.25s_ease]`}>
      <button
        onClick={onClick}
        className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black text-[15px] py-4 rounded-full shadow-[0_8px_20px_rgba(220,38,38,0.5)] active:scale-[0.98] transition"
      >
        {config.label}
      </button>
    </div>
  );
}
