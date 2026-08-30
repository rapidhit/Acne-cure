import { useCallback, useEffect, useRef, useState } from "react";

const NUDGE_PERCENT = 0.5;

/**
 * Live preview of `customHtml` with draggable button markers overlaid.
 * Drag with the mouse/touch to position roughly, then use arrow keys on a
 * selected button to nudge it precisely. Positions are percentages of the
 * full rendered page height/width, so they hold up across screen sizes.
 */
export default function ButtonPlacementEditor({ customHtml, buttons, onChange }) {
  const iframeRef = useRef(null);
  const overlayRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(600);
  const [selectedId, setSelectedId] = useState(null);
  const draggingId = useRef(null);

  function handleIframeLoad() {
    const doc = iframeRef.current?.contentDocument;
    if (doc?.body) {
      const height = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
      setContentHeight(height || 600);
    }
  }

  function updateButton(id, patch) {
    onChange(buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function addButton(label) {
    const id = `btn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const next = [...buttons, { id, label, xPercent: 50, yPercent: 50 }];
    onChange(next);
    setSelectedId(id);
  }

  function removeButton(id) {
    onChange(buttons.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingId.current || !overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const xPercent = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
      updateButton(draggingId.current, { xPercent, yPercent });
    },
    [buttons]
  );

  const handlePointerUp = useCallback(() => {
    draggingId.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  function handleKeyDown(e, id) {
    const deltas = {
      ArrowUp: { yPercent: -NUDGE_PERCENT },
      ArrowDown: { yPercent: NUDGE_PERCENT },
      ArrowLeft: { xPercent: -NUDGE_PERCENT },
      ArrowRight: { xPercent: NUDGE_PERCENT },
    };
    const delta = deltas[e.key];
    if (!delta) return;
    e.preventDefault();
    const btn = buttons.find((b) => b.id === id);
    if (!btn) return;
    updateButton(id, {
      xPercent: Math.min(100, Math.max(0, btn.xPercent + (delta.xPercent || 0))),
      yPercent: Math.min(100, Math.max(0, btn.yPercent + (delta.yPercent || 0))),
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[12px] font-semibold text-[#0f3d1f]/70">Quick add:</span>
        {["Get Offer", "Buy Now", "Get Access", "Claim Discount"].map((preset) => (
          <button
            key={preset}
            onClick={() => addButton(preset)}
            className="text-[12px] rounded-full border border-[#0f3d1f]/20 px-3 py-1 hover:bg-[#0f3d1f]/5"
          >
            + {preset}
          </button>
        ))}
        <CustomAddButton onAdd={addButton} />
      </div>

      <p className="text-[11px] text-[#0f3d1f]/50 mb-2">
        Drag a button to position it. Click to select, then use arrow keys to nudge precisely.
      </p>

      <div className="relative w-full border border-black/10 rounded-xl overflow-hidden bg-white" style={{ height: Math.min(contentHeight, 600), overflowY: "auto" }}>
        <div className="relative" style={{ height: contentHeight }}>
          <iframe
            ref={iframeRef}
            title="Preview"
            srcDoc={customHtml || "<p style='padding:2rem;font-family:sans-serif;color:#888'>Paste your HTML in the editor above to see a live preview here.</p>"}
            onLoad={handleIframeLoad}
            className="w-full border-0 block pointer-events-none"
            style={{ height: contentHeight }}
          />
          <div ref={overlayRef} className="absolute inset-0" style={{ height: contentHeight }}>
            {buttons.map((btn) => (
              <div
                key={btn.id}
                tabIndex={0}
                onPointerDown={() => {
                  draggingId.current = btn.id;
                  setSelectedId(btn.id);
                }}
                onKeyDown={(e) => handleKeyDown(e, btn.id)}
                onFocus={() => setSelectedId(btn.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none bg-[#dc2626] text-white font-black text-[13px] px-4 py-2.5 rounded-full whitespace-nowrap outline-none ${
                  selectedId === btn.id ? "ring-4 ring-[#a3d65c]" : ""
                }`}
                style={{ left: `${btn.xPercent}%`, top: `${btn.yPercent}%` }}
              >
                {btn.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {buttons.length > 0 && (
        <div className="mt-3 space-y-2">
          {buttons.map((btn) => (
            <div key={btn.id} className="flex items-center gap-2">
              <input
                value={btn.label}
                onChange={(e) => updateButton(btn.id, { label: e.target.value })}
                className="flex-1 text-[13px] rounded-lg border border-black/10 px-3 py-1.5"
              />
              <span className="text-[11px] text-[#0f3d1f]/40 w-20 shrink-0">
                {btn.xPercent.toFixed(0)}%, {btn.yPercent.toFixed(0)}%
              </span>
              <button
                onClick={() => removeButton(btn.id)}
                className="text-[#dc2626] text-[12px] font-semibold shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomAddButton({ onAdd }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onAdd(value.trim());
        setValue("");
      }}
      className="flex items-center gap-1"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Custom label…"
        className="text-[12px] rounded-full border border-[#0f3d1f]/20 px-3 py-1 w-32"
      />
      <button type="submit" className="text-[12px] font-semibold text-[#0f3d1f]">+ Add</button>
    </form>
  );
}
