import { useState } from "react";
import { api } from "../lib/api.js";

export default function NewProductModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ slug: "", name: "", priceDollars: "", currency: "USD", mode: "custom_code" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const cleanSlug = form.slug.trim().toLowerCase();
    if (!cleanSlug) {
      setError("A URL path (slug) is required.");
      return;
    }

    setSaving(true);
    try {
      const product = await api.adminCreateProduct({
        slug: cleanSlug,
        name: form.name.trim(),
        priceKobo: Math.round(parseFloat(form.priceDollars) * 100),
        currency: form.currency.toUpperCase(),
        mode: form.mode,
      });
      onCreated(product);
    } catch (err) {
      setError(err.message || "Could not create product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-console">
      <div className="absolute inset-0 bg-black/50" onClick={() => !saving && onClose()} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-lg p-7 max-w-[440px] w-full border border-hairline shadow-[0_24px_64px_rgba(0,0,0,0.25)]"
      >
        <h3 className="font-display font-semibold text-[18px] text-[#12131A]">New product</h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-[12.5px] font-medium text-[#5B6472]">URL path (slug) *</label>
            <div className="mt-1.5 flex items-center rounded-md border border-hairline overflow-hidden">
              <span className="px-3 py-2 text-[13px] text-[#5B6472] bg-surface shrink-0">yourdomain.com/</span>
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                placeholder="hairgrowth"
                className="flex-1 min-w-0 px-2 py-2 text-[13px] outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-[#5B6472]">Product name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1.5 w-full rounded-md border border-hairline px-3 py-2 text-[13px] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12.5px] font-medium text-[#5B6472]">Price</label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                value={form.priceDollars}
                onChange={(e) => setForm((f) => ({ ...f, priceDollars: e.target.value }))}
                className="mt-1.5 w-full rounded-md border border-hairline px-3 py-2 text-[13px] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                required
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-medium text-[#5B6472]">Currency</label>
              <input
                maxLength={3}
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                className="mt-1.5 w-full rounded-md border border-hairline px-3 py-2 text-[13px] uppercase outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-[#5B6472]">Page type</label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-[13px] text-[#12131A]">
                <input
                  type="radio"
                  checked={form.mode === "custom_code"}
                  onChange={() => setForm((f) => ({ ...f, mode: "custom_code" }))}
                  className="accent-accent"
                />
                Paste my own custom page design
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[#12131A]">
                <input
                  type="radio"
                  checked={form.mode === "template"}
                  onChange={() => setForm((f) => ({ ...f, mode: "template" }))}
                  className="accent-accent"
                />
                Use the built-in template design
              </label>
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-[13px] text-[#DC2626]">{error}</p>}

        <div className="mt-6 flex items-center gap-3 pt-4 border-t border-hairline">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent text-white font-semibold text-[13px] px-4 py-2 hover:bg-accent/90 disabled:opacity-60 transition-colors"
          >
            {saving ? "Creating…" : "Create product"}
          </button>
          <button type="button" onClick={onClose} className="text-[13px] text-[#5B6472] hover:text-[#12131A]">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
