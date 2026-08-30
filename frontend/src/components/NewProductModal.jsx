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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-[24px] p-7 max-w-[440px] w-full shadow-2xl"
      >
        <h3 className="font-black text-[20px] text-[#0f3d1f]">New Product</h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">URL path (slug) *</label>
            <div className="mt-1 flex items-center rounded-lg border border-black/10 overflow-hidden">
              <span className="px-3 py-2 text-[13px] text-[#0f3d1f]/50 bg-[#f9fafb] shrink-0">yourdomain.com/</span>
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
            <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Product name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[13px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Price</label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                value={form.priceDollars}
                onChange={(e) => setForm((f) => ({ ...f, priceDollars: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[13px]"
                required
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Currency</label>
              <input
                maxLength={3}
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[13px] uppercase"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Page type</label>
            <div className="mt-1 space-y-2">
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="radio"
                  checked={form.mode === "custom_code"}
                  onChange={() => setForm((f) => ({ ...f, mode: "custom_code" }))}
                />
                Paste my own custom page design
              </label>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="radio"
                  checked={form.mode === "template"}
                  onChange={() => setForm((f) => ({ ...f, mode: "template" }))}
                />
                Use the built-in template design
              </label>
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-[13px] text-[#dc2626]">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#0f3d1f] text-white font-semibold text-[13px] px-5 py-2.5 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create Product"}
          </button>
          <button type="button" onClick={onClose} className="text-[13px] text-[#0f3d1f]/60">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
