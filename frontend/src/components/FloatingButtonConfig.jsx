const PRESET_LABELS = ["Get Offer", "Buy Now", "Get Access", "Claim Discount", "Get Started"];

export default function FloatingButtonConfig({ config, onChange }) {
  function set(patch) {
    onChange({ ...config, ...patch });
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-[13.5px] font-medium text-[#12131A]">
        <input
          type="checkbox"
          className="accent-accent"
          checked={config.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
        Show a floating action button
      </label>

      {config.enabled && (
        <div className="pl-6 space-y-4">
          <div>
            <label className="block text-[12.5px] font-medium text-[#5B6472]">Label</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {PRESET_LABELS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => set({ label: preset })}
                  className={`text-[12px] rounded-full border px-3 py-1 ${
                    config.label === preset ? "bg-accent text-white border-accent" : "border-hairline"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              value={config.label}
              onChange={(e) => set({ label: e.target.value })}
              placeholder="Or type a custom label…"
              className="mt-2 w-full text-[13px] rounded-md border border-hairline px-3 py-2 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-[#5B6472]">Position</label>
            <div className="mt-1 space-y-2">
              <label className="flex items-center gap-2 text-[13px] text-[#12131A]">
                <input
                  type="radio"
                  className="accent-accent"
                  checked={config.position === "top"}
                  onChange={() => set({ position: "top" })}
                />
                Always at the top
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[#12131A]">
                <input
                  type="radio"
                  className="accent-accent"
                  checked={config.position === "bottom"}
                  onChange={() => set({ position: "bottom" })}
                />
                Always at the bottom
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[#12131A]">
                <input
                  type="radio"
                  className="accent-accent"
                  checked={config.position === "scroll_trigger"}
                  onChange={() => set({ position: "scroll_trigger" })}
                />
                Appears after scrolling
              </label>
            </div>
          </div>

          {config.position === "scroll_trigger" && (
            <div className="pl-6 space-y-3">
              <div>
                <label className="block text-[12.5px] font-medium text-[#5B6472]">
                  Appears after scrolling {config.scrollPercent}% of the page
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.scrollPercent}
                  onChange={(e) => set({ scrollPercent: Number(e.target.value) })}
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-[#5B6472]">Then sticks to</label>
                <div className="mt-1 flex gap-4">
                  <label className="flex items-center gap-2 text-[13px] text-[#12131A]">
                    <input
                      type="radio"
                  className="accent-accent"
                      checked={config.stickTo === "top"}
                      onChange={() => set({ stickTo: "top" })}
                    />
                    Top
                  </label>
                  <label className="flex items-center gap-2 text-[13px] text-[#12131A]">
                    <input
                      type="radio"
                  className="accent-accent"
                      checked={config.stickTo === "bottom"}
                      onChange={() => set({ stickTo: "bottom" })}
                    />
                    Bottom
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
