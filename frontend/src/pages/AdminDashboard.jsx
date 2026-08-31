import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "../lib/api.js";
import NewProductModal from "../components/NewProductModal.jsx";
import ButtonPlacementEditor from "../components/ButtonPlacementEditor.jsx";
import FloatingButtonConfig from "../components/FloatingButtonConfig.jsx";
import ProductSwitcher from "../components/ProductSwitcher.jsx";

function formatMoney(amountInSmallestUnit, currency) {
  const value = amountInSmallestUnit / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(2)}`;
  }
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-hairline bg-white p-5">
      <div className="text-[13px] text-[#5B6472] font-console">{label}</div>
      <div className="mt-1.5 text-[30px] font-display font-semibold text-[#12131A] tabular-nums leading-none">
        {value}
      </div>
      {sub && <div className="mt-2 text-[12px] text-[#5B6472] font-console">{sub}</div>}
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="block text-[12.5px] font-medium text-[#5B6472] font-console">{children}</label>;
}

const inputClass =
  "mt-1.5 w-full rounded-md border border-hairline px-3 py-2 text-[14px] font-console text-[#12131A] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [productList, setProductList] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [product, setProduct] = useState(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [activeView, setActiveView] = useState("stats"); // 'stats' | 'settings'

  const [settingsForm, setSettingsForm] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  const [pdfStatus, setPdfStatus] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");

  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [clearingPending, setClearingPending] = useState(false);

  const [reviews, setReviews] = useState(null);
  const [reviewActionId, setReviewActionId] = useState(null);

  useEffect(() => {
    api
      .adminSession()
      .then((s) => {
        if (!s.isAdmin) navigate("/admin/login");
        else loadProductList();
      })
      .catch(() => navigate("/admin/login"));
  }, []);

  function loadProductList() {
    api.adminListProducts().then((list) => {
      setProductList(list);
      if (list.length === 0) return;
      const lastId = Number(localStorage.getItem("flw_admin_last_product_id"));
      const stillExists = list.some((p) => p.id === lastId);
      setSelectedId((prev) => prev ?? (stillExists ? lastId : list[0].id));
    });
  }

  useEffect(() => {
    if (!selectedId) return;
    localStorage.setItem("flw_admin_last_product_id", String(selectedId));
    loadProduct();
    loadStats();
    loadPdfStatus();
    loadReviews();
  }, [selectedId]);

  function loadProduct() {
    api.adminGetProduct(selectedId).then((p) => {
      setProduct(p);
      setSettingsForm({
        name: p.name,
        priceDollars: (p.price_kobo / 100).toFixed(2),
        currency: p.currency,
        mode: p.mode,
        headline: p.headline || "",
        subheadline: p.subheadline || "",
        customHtml: p.custom_html || "",
        deliveryType: p.delivery_type || "pdf",
        telegramLink: p.telegram_link || "",
        floating: {
          enabled: !!p.floating_enabled,
          label: p.floating_label,
          position: p.floating_position,
          scrollPercent: p.floating_scroll_percent,
          stickTo: p.floating_stick_to,
        },
        inlineButtons: p.inline_buttons_json ? JSON.parse(p.inline_buttons_json) : [],
      });
      setSettingsMessage("");
    });
  }

  function loadStats() {
    api.adminGetStats(selectedId).then(setStats).catch((e) => setStatsError(e.message));
  }

  function loadPdfStatus() {
    api.adminGetPdfStatus(selectedId).then(setPdfStatus).catch(() => {});
  }

  function loadReviews() {
    api.adminGetReviews(selectedId).then(setReviews).catch(() => setReviews([]));
  }

  async function handleApproveReview(id) {
    setReviewActionId(id);
    try {
      await api.adminApproveReview(id);
      loadReviews();
    } finally {
      setReviewActionId(null);
    }
  }

  async function handleRejectReview(id) {
    setReviewActionId(id);
    try {
      await api.adminRejectReview(id);
      loadReviews();
    } finally {
      setReviewActionId(null);
    }
  }

  async function handleDeleteReview(id) {
    if (!window.confirm("Delete this review permanently?")) return;
    setReviewActionId(id);
    try {
      await api.adminDeleteReview(id);
      loadReviews();
    } finally {
      setReviewActionId(null);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage("");
    try {
      const updated = await api.adminUpdateProduct(selectedId, {
        name: settingsForm.name,
        priceKobo: Math.round(parseFloat(settingsForm.priceDollars) * 100),
        currency: settingsForm.currency,
        mode: settingsForm.mode,
        headline: settingsForm.headline,
        subheadline: settingsForm.subheadline,
        customHtml: settingsForm.customHtml,
        deliveryType: settingsForm.deliveryType,
        telegramLink: settingsForm.telegramLink,
        floatingEnabled: settingsForm.floating.enabled,
        floatingLabel: settingsForm.floating.label,
        floatingPosition: settingsForm.floating.position,
        floatingScrollPercent: settingsForm.floating.scrollPercent,
        floatingStickTo: settingsForm.floating.stickTo,
        inlineButtons: settingsForm.inlineButtons,
      });
      setProduct(updated);
      setSettingsMessage("Saved. Changes are live now.");
      loadProductList();
    } catch (err) {
      setSettingsMessage(err.message || "Could not save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleUploadPdf(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    setPdfMessage("");
    try {
      const result = await api.adminUploadPdf(selectedId, file);
      setPdfStatus({ exists: true, sizeBytes: result.sizeBytes, updatedAt: result.updatedAt, fileName: result.fileName });
      setPdfMessage("Uploaded. This is now the file buyers receive after payment.");
    } catch (err) {
      setPdfMessage(err.message || "Upload failed.");
    } finally {
      setUploadingPdf(false);
      e.target.value = "";
    }
  }

  async function handleClearPending() {
    if (!window.confirm("Delete all pending orders for this product? This can't be undone.")) return;
    setClearingPending(true);
    try {
      const result = await api.adminClearPending(selectedId);
      loadStats();
      window.alert(`Cleared ${result.deletedCount} pending order${result.deletedCount === 1 ? "" : "s"}.`);
    } catch (err) {
      window.alert(err.message || "Could not clear pending orders.");
    } finally {
      setClearingPending(false);
    }
  }

  async function handleLogout() {
    await api.adminLogout();
    navigate("/admin/login");
  }

  if (!productList) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-console text-[#5B6472]">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex font-console">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-ink flex flex-col p-4">
        <div className="px-1 py-2">
          <span className="font-display font-semibold text-[15px] text-white">Console</span>
        </div>

        <div className="mt-3">
          <ProductSwitcher products={productList} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <button
          onClick={() => setShowNewProduct(true)}
          className="mt-2 w-full text-left rounded-lg px-3 py-2 text-[13px] text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          + New product
        </button>

        <nav className="mt-6 space-y-0.5">
          {[
            { id: "stats", label: "Insights" },
            { id: "reviews", label: "Reviews" },
            { id: "settings", label: "Settings" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`relative w-full text-left rounded-md pl-4 pr-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                activeView === item.id ? "bg-white/[0.06] text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {activeView === item.id && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent" />
              )}
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto text-left text-[13px] text-white/40 hover:text-white/70 transition-colors"
        >
          Log out
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[860px] mx-auto px-8 py-8">
          {!product || !settingsForm ? (
            <div className="text-[#5B6472]">Loading product…</div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-7">
                <h1 className="font-display font-semibold text-[22px] text-[#12131A]">{product.name}</h1>
                <span className="text-[13px] text-accent">/{product.slug}</span>
              </div>

              {activeView === "settings" ? (
                <div className="space-y-5">
                  <section className="rounded-lg border border-hairline bg-white p-5">
                    <h2 className="font-display font-semibold text-[15px] text-[#12131A] mb-4">Product details</h2>
                    <form onSubmit={handleSaveSettings}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <FieldLabel>Product name</FieldLabel>
                          <input
                            value={settingsForm.name}
                            onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <FieldLabel>Price</FieldLabel>
                          <input
                            type="number"
                            step="0.01"
                            min="0.5"
                            value={settingsForm.priceDollars}
                            onChange={(e) => setSettingsForm((f) => ({ ...f, priceDollars: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <FieldLabel>Currency</FieldLabel>
                          <input
                            maxLength={3}
                            value={settingsForm.currency}
                            onChange={(e) => setSettingsForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                            className={`${inputClass} uppercase`}
                          />
                        </div>
                      </div>

                      <div className="mt-5">
                        <FieldLabel>Page type</FieldLabel>
                        <div className="mt-2 flex gap-5">
                          <label className="flex items-center gap-2 text-[13.5px] text-[#12131A]">
                            <input
                              type="radio"
                              checked={settingsForm.mode === "custom_code"}
                              onChange={() => setSettingsForm((f) => ({ ...f, mode: "custom_code" }))}
                              className="accent-accent"
                            />
                            Custom page
                          </label>
                          <label className="flex items-center gap-2 text-[13.5px] text-[#12131A]">
                            <input
                              type="radio"
                              checked={settingsForm.mode === "template"}
                              onChange={() => setSettingsForm((f) => ({ ...f, mode: "template" }))}
                              className="accent-accent"
                            />
                            Built-in template
                          </label>
                        </div>
                      </div>

                      <div className="mt-5">
                        <FieldLabel>What buyers get after payment</FieldLabel>
                        <div className="mt-2 flex gap-5">
                          <label className="flex items-center gap-2 text-[13.5px] text-[#12131A]">
                            <input
                              type="radio"
                              checked={settingsForm.deliveryType === "pdf"}
                              onChange={() => setSettingsForm((f) => ({ ...f, deliveryType: "pdf" }))}
                              className="accent-accent"
                            />
                            A PDF file
                          </label>
                          <label className="flex items-center gap-2 text-[13.5px] text-[#12131A]">
                            <input
                              type="radio"
                              checked={settingsForm.deliveryType === "telegram"}
                              onChange={() => setSettingsForm((f) => ({ ...f, deliveryType: "telegram" }))}
                              className="accent-accent"
                            />
                            A Telegram group invite link
                          </label>
                        </div>
                        {settingsForm.deliveryType === "telegram" && (
                          <div className="mt-3">
                            <FieldLabel>Telegram invite link</FieldLabel>
                            <input
                              value={settingsForm.telegramLink}
                              onChange={(e) => setSettingsForm((f) => ({ ...f, telegramLink: e.target.value }))}
                              placeholder="https://t.me/+xxxxxxxxxxxx"
                              className={inputClass}
                            />
                            <p className="mt-1.5 text-[12px] text-[#5B6472]">
                              Buyers are redirected here after a verified payment.
                            </p>
                          </div>
                        )}
                      </div>

                      {settingsForm.mode === "template" && (
                        <div className="mt-5 grid grid-cols-1 gap-4">
                          <div>
                            <FieldLabel>Headline (optional override)</FieldLabel>
                            <input
                              value={settingsForm.headline}
                              onChange={(e) => setSettingsForm((f) => ({ ...f, headline: e.target.value }))}
                              placeholder="Are you battling with...?"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <FieldLabel>Subheadline (optional override)</FieldLabel>
                            <input
                              value={settingsForm.subheadline}
                              onChange={(e) => setSettingsForm((f) => ({ ...f, subheadline: e.target.value }))}
                              placeholder="Discover the simple system to..."
                              className={inputClass}
                            />
                          </div>
                        </div>
                      )}

                      {settingsForm.mode === "custom_code" && (
                        <div className="mt-6 space-y-6">
                          <div>
                            <FieldLabel>Custom page HTML / CSS / JS</FieldLabel>
                            <textarea
                              value={settingsForm.customHtml}
                              onChange={(e) => setSettingsForm((f) => ({ ...f, customHtml: e.target.value }))}
                              rows={10}
                              placeholder="<html>...</html>"
                              className={`${inputClass} font-mono text-[12px]`}
                            />
                          </div>

                          <div>
                            <FieldLabel>Buttons on the page</FieldLabel>
                            <div className="mt-2">
                              <ButtonPlacementEditor
                                customHtml={settingsForm.customHtml}
                                buttons={settingsForm.inlineButtons}
                                onChange={(inlineButtons) => setSettingsForm((f) => ({ ...f, inlineButtons }))}
                              />
                            </div>
                          </div>

                          <div>
                            <FieldLabel>Floating action button</FieldLabel>
                            <div className="mt-2">
                              <FloatingButtonConfig
                                config={settingsForm.floating}
                                onChange={(floating) => setSettingsForm((f) => ({ ...f, floating }))}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-6 flex items-center gap-3 pt-5 border-t border-hairline">
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="rounded-md bg-accent text-white font-semibold text-[13.5px] px-4 py-2 hover:bg-accent/90 disabled:opacity-60 transition-colors"
                        >
                          {savingSettings ? "Saving…" : "Save changes"}
                        </button>
                        {settingsMessage && <span className="text-[13px] text-[#5B6472]">{settingsMessage}</span>}
                      </div>
                    </form>
                  </section>

                  {settingsForm.deliveryType === "pdf" && (
                    <section className="rounded-lg border border-hairline bg-white p-5">
                      <h2 className="font-display font-semibold text-[15px] text-[#12131A] mb-1">Delivery file</h2>
                      <p className="text-[13px] text-[#5B6472] mb-4">
                        The PDF customers receive after a verified payment for this product.
                      </p>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[220px]">
                          {pdfStatus?.exists ? (
                            <div className="flex flex-wrap items-center gap-2 text-[13px]">
                              <span className="text-positive font-semibold">● File in place</span>
                              <span className="text-[#5B6472]">
                                {pdfStatus.fileName} · {formatBytes(pdfStatus.sizeBytes)} · updated{" "}
                                {new Date(pdfStatus.updatedAt).toLocaleString()}
                              </span>
                            </div>
                          ) : pdfStatus ? (
                            <div className="text-[13px] text-[#DC2626] font-semibold">
                              ● No file uploaded — buyers can't download anything until you add one.
                            </div>
                          ) : (
                            <div className="text-[13px] text-[#5B6472]">Checking…</div>
                          )}
                        </div>
                        <label className="shrink-0 cursor-pointer rounded-md bg-[#12131A] text-white font-semibold text-[13px] px-4 py-2 hover:bg-black transition-colors">
                          {uploadingPdf ? "Uploading…" : pdfStatus?.exists ? "Replace file" : "Upload PDF"}
                          <input type="file" accept="application/pdf" onChange={handleUploadPdf} disabled={uploadingPdf} className="hidden" />
                        </label>
                      </div>
                      {pdfMessage && <p className="mt-3 text-[13px] text-[#5B6472]">{pdfMessage}</p>}
                    </section>
                  )}
                </div>
              ) : activeView === "reviews" ? (
                <div className="rounded-lg border border-hairline bg-white p-5">
                  <h2 className="font-display font-semibold text-[15px] text-[#12131A] mb-1">Reviews</h2>
                  <p className="text-[13px] text-[#5B6472] mb-4">
                    Approve a review to make it visible on this product's page.
                  </p>

                  {!reviews ? (
                    <p className="text-[13px] text-[#5B6472]">Loading…</p>
                  ) : reviews.length === 0 ? (
                    <p className="text-[13px] text-[#5B6472]">No reviews submitted yet for this product.</p>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((r) => (
                        <div key={r.id} className="rounded-md border border-hairline p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[13.5px] text-[#12131A]">{r.name}</span>
                                <span className="text-[#a3d65c] text-[13px]">
                                  {"★".repeat(r.rating)}
                                  {"☆".repeat(5 - r.rating)}
                                </span>
                              </div>
                              <p className="mt-1 text-[13px] text-[#12131A]">{r.body}</p>
                              <p className="mt-1.5 text-[11px] text-[#5B6472]">
                                {new Date(r.created_at).toLocaleString()} · {r.likes} like{r.likes === 1 ? "" : "s"}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                r.status === "approved"
                                  ? "bg-positive/10 text-positive"
                                  : r.status === "rejected"
                                  ? "bg-[#DC2626]/10 text-[#DC2626]"
                                  : "bg-warn/10 text-warn"
                              }`}
                            >
                              {r.status}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            {r.status !== "approved" && (
                              <button
                                onClick={() => handleApproveReview(r.id)}
                                disabled={reviewActionId === r.id}
                                className="text-[12.5px] font-semibold text-positive disabled:opacity-50"
                              >
                                Approve
                              </button>
                            )}
                            {r.status !== "rejected" && (
                              <button
                                onClick={() => handleRejectReview(r.id)}
                                disabled={reviewActionId === r.id}
                                className="text-[12.5px] font-semibold text-warn disabled:opacity-50"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReview(r.id)}
                              disabled={reviewActionId === r.id}
                              className="text-[12.5px] font-semibold text-[#DC2626] disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {statsError && <p className="text-[#DC2626]">{statsError}</p>}
                  {stats && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total sales" value={stats.totals.salesCount} />
                        <StatCard label="Total revenue" value={formatMoney(stats.totals.revenue, product.currency)} />
                        <StatCard
                          label="Today"
                          value={stats.totals.todaySalesCount}
                          sub={formatMoney(stats.totals.todayRevenue, product.currency)}
                        />
                        <StatCard
                          label="Conversion rate"
                          value={`${stats.totals.conversionRate}%`}
                          sub={`${stats.totals.totalVisits} unique visits`}
                        />
                      </div>

                      <div className="mt-5 rounded-lg border border-hairline bg-white p-5">
                        <h2 className="font-display font-semibold text-[15px] text-[#12131A] mb-4">Last 14 days</h2>
                        <div style={{ width: "100%", height: 280 }}>
                          <ResponsiveContainer>
                            <LineChart data={stats.series}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F3" vertical={false} />
                              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5B6472" }} axisLine={{ stroke: "#E3E6EC" }} tickLine={false} />
                              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#5B6472" }} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#5B6472" }} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E3E6EC" }} />
                              <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#3654FF" name="Sales" strokeWidth={2} dot={false} />
                              <Line yAxisId="right" type="monotone" dataKey="visits" stroke="#0EA5A4" name="Visits" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="mt-5 rounded-lg border border-hairline bg-white p-5 overflow-x-auto">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="font-display font-semibold text-[15px] text-[#12131A]">Recent transactions</h2>
                          <button
                            onClick={handleClearPending}
                            disabled={clearingPending}
                            className="text-[12.5px] font-medium text-[#5B6472] border border-hairline rounded-md px-3 py-1.5 hover:border-[#DC2626]/40 hover:text-[#DC2626] disabled:opacity-50 transition-colors"
                          >
                            {clearingPending ? "Clearing…" : "Clear pending orders"}
                          </button>
                        </div>
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="text-left text-[#5B6472] border-b border-hairline">
                              <th className="py-2 pr-4 font-medium">Email</th>
                              <th className="py-2 pr-4 font-medium text-right">Amount</th>
                              <th className="py-2 pr-4 font-medium">Status</th>
                              <th className="py-2 pr-4 font-medium text-right">Downloads</th>
                              <th className="py-2 pr-4 font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.recentTransactions.map((t) => (
                              <tr key={t.reference} className="border-b border-hairline/60 text-[#12131A]">
                                <td className="py-2.5 pr-4">{t.email}</td>
                                <td className="py-2.5 pr-4 text-right tabular-nums">{formatMoney(t.amount, t.currency)}</td>
                                <td className="py-2.5 pr-4">
                                  <span
                                    className={
                                      t.status === "success"
                                        ? "text-positive font-medium"
                                        : t.status === "failed"
                                        ? "text-[#DC2626] font-medium"
                                        : "text-warn font-medium"
                                    }
                                  >
                                    {t.status}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-4 text-right tabular-nums">{t.download_count}</td>
                                <td className="py-2.5 pr-4 text-[#5B6472]">{new Date(t.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showNewProduct && (
        <NewProductModal
          onClose={() => setShowNewProduct(false)}
          onCreated={(newProduct) => {
            setShowNewProduct(false);
            loadProductList();
            setSelectedId(newProduct.id);
          }}
        />
      )}
    </div>
  );
}
