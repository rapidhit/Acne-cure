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
  Legend,
} from "recharts";
import { api } from "../lib/api.js";
import NewProductModal from "../components/NewProductModal.jsx";
import ButtonPlacementEditor from "../components/ButtonPlacementEditor.jsx";
import FloatingButtonConfig from "../components/FloatingButtonConfig.jsx";

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
    <div className="rounded-2xl border border-black/10 p-5 bg-white">
      <div className="text-[12px] uppercase tracking-wide text-[#0f3d1f]/60">{label}</div>
      <div className="mt-1 text-[26px] font-black text-[#0f3d1f]">{value}</div>
      {sub && <div className="mt-1 text-[12px] text-[#0f3d1f]/50">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [productList, setProductList] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [product, setProduct] = useState(null); // full record for selected product
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

  // --- Auth + initial product list ---
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

  // --- Load everything for whichever product is selected ---
  useEffect(() => {
    if (!selectedId) return;
    localStorage.setItem("flw_admin_last_product_id", String(selectedId));
    loadProduct();
    loadStats();
    loadPdfStatus();
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
        floatingEnabled: settingsForm.floating.enabled,
        floatingLabel: settingsForm.floating.label,
        floatingPosition: settingsForm.floating.position,
        floatingScrollPercent: settingsForm.floating.scrollPercent,
        floatingStickTo: settingsForm.floating.stickTo,
        inlineButtons: settingsForm.inlineButtons,
      });
      setProduct(updated);
      setSettingsMessage("Saved — changes are live immediately.");
      loadProductList(); // in case name changed, refresh the switcher labels
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
      setPdfMessage("Uploaded — this is now the file buyers receive after payment.");
    } catch (err) {
      setPdfMessage(err.message || "Upload failed.");
    } finally {
      setUploadingPdf(false);
      e.target.value = "";
    }
  }

  async function handleClearPending() {
    if (!window.confirm("Delete all pending (never-completed) orders for this product? This can't be undone.")) return;
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
    return <div className="p-8">Loading dashboard…</div>;
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-white border-r border-black/10 flex flex-col p-5">
        <h1 className="text-[18px] font-black text-[#0f3d1f]">Dashboard</h1>

        <select
          value={selectedId || ""}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="mt-5 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold text-[#0f3d1f]"
        >
          {productList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (/{p.slug})
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowNewProduct(true)}
          className="mt-2 text-[12px] font-semibold text-[#0f3d1f] border border-[#0f3d1f]/20 rounded-lg px-3 py-2 hover:bg-[#0f3d1f]/5"
        >
          + New Product
        </button>

        <nav className="mt-6 space-y-1">
          <button
            onClick={() => setActiveView("stats")}
            className={`w-full text-left rounded-lg px-3 py-2.5 text-[14px] font-semibold ${
              activeView === "stats" ? "bg-[#0f3d1f] text-white" : "text-[#0f3d1f] hover:bg-[#0f3d1f]/5"
            }`}
          >
            📊 Insights
          </button>
          <button
            onClick={() => setActiveView("settings")}
            className={`w-full text-left rounded-lg px-3 py-2.5 text-[14px] font-semibold ${
              activeView === "settings" ? "bg-[#0f3d1f] text-white" : "text-[#0f3d1f] hover:bg-[#0f3d1f]/5"
            }`}
          >
            ⚙️ Settings
          </button>
        </nav>

        <button onClick={handleLogout} className="mt-auto text-[13px] font-semibold text-[#0f3d1f]/60 hover:text-[#0f3d1f] text-left">
          Log out
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-[900px] mx-auto">
          {!product || !settingsForm ? (
            <div>Loading product…</div>
          ) : activeView === "settings" ? (
            <>
              <h2 className="text-[22px] font-black text-[#0f3d1f]">{product.name}</h2>
              <p className="text-[13px] text-[#0f3d1f]/50 mb-6">Live at yourdomain.com/{product.slug}</p>

              {/* Basic settings */}
              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <h3 className="text-[15px] font-bold text-[#0f3d1f] mb-1">Product Settings</h3>
                <p className="text-[12px] text-[#0f3d1f]/60 mb-4">Changes apply immediately.</p>
                <form onSubmit={handleSaveSettings}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Product name</label>
                      <input
                        value={settingsForm.name}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[14px]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.5"
                        value={settingsForm.priceDollars}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, priceDollars: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[14px]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Currency</label>
                      <input
                        maxLength={3}
                        value={settingsForm.currency}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[14px] uppercase"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Page type</label>
                    <div className="mt-1 flex gap-4">
                      <label className="flex items-center gap-2 text-[13px]">
                        <input
                          type="radio"
                          checked={settingsForm.mode === "custom_code"}
                          onChange={() => setSettingsForm((f) => ({ ...f, mode: "custom_code" }))}
                        />
                        Custom page
                      </label>
                      <label className="flex items-center gap-2 text-[13px]">
                        <input
                          type="radio"
                          checked={settingsForm.mode === "template"}
                          onChange={() => setSettingsForm((f) => ({ ...f, mode: "template" }))}
                        />
                        Built-in template
                      </label>
                    </div>
                  </div>

                  {settingsForm.mode === "template" && (
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Headline (optional override)</label>
                        <input
                          value={settingsForm.headline}
                          onChange={(e) => setSettingsForm((f) => ({ ...f, headline: e.target.value }))}
                          placeholder="Are you battling with...?"
                          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[14px]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Subheadline (optional override)</label>
                        <input
                          value={settingsForm.subheadline}
                          onChange={(e) => setSettingsForm((f) => ({ ...f, subheadline: e.target.value }))}
                          placeholder="Discover the simple system to..."
                          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[14px]"
                        />
                      </div>
                    </div>
                  )}

                  {settingsForm.mode === "custom_code" && (
                    <div className="mt-5 space-y-5">
                      <div>
                        <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">
                          Custom page HTML/CSS/JS
                        </label>
                        <textarea
                          value={settingsForm.customHtml}
                          onChange={(e) => setSettingsForm((f) => ({ ...f, customHtml: e.target.value }))}
                          rows={10}
                          placeholder="<html>...</html>"
                          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[12px] font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60 block mb-2">
                          Buttons on the page (drag to place)
                        </label>
                        <ButtonPlacementEditor
                          customHtml={settingsForm.customHtml}
                          buttons={settingsForm.inlineButtons}
                          onChange={(inlineButtons) => setSettingsForm((f) => ({ ...f, inlineButtons }))}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60 block mb-2">
                          Floating action button
                        </label>
                        <FloatingButtonConfig
                          config={settingsForm.floating}
                          onChange={(floating) => setSettingsForm((f) => ({ ...f, floating }))}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="rounded-full bg-[#0f3d1f] text-white font-semibold text-[13px] px-5 py-2 disabled:opacity-60"
                    >
                      {savingSettings ? "Saving…" : "Save changes"}
                    </button>
                    {settingsMessage && <span className="text-[12px] text-[#0f3d1f]/70">{settingsMessage}</span>}
                  </div>
                </form>
              </div>

              {/* Delivery file */}
              <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
                <h3 className="text-[15px] font-bold text-[#0f3d1f] mb-1">Delivery File</h3>
                <p className="text-[12px] text-[#0f3d1f]/60 mb-4">
                  The PDF customers receive after a verified payment for this product.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[220px]">
                    {pdfStatus?.exists ? (
                      <div className="flex items-center gap-2 text-[13px]">
                        <span className="text-[#15803d] font-semibold">✓ File in place</span>
                        <span className="text-[#0f3d1f]/50">
                          {pdfStatus.fileName} · {formatBytes(pdfStatus.sizeBytes)} · updated{" "}
                          {new Date(pdfStatus.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    ) : pdfStatus ? (
                      <div className="text-[13px] text-[#dc2626] font-semibold">
                        ⚠ No file uploaded yet — buyers can't download anything until you add one.
                      </div>
                    ) : (
                      <div className="text-[13px] text-[#0f3d1f]/50">Checking…</div>
                    )}
                  </div>
                  <label className="shrink-0 cursor-pointer rounded-full bg-[#0f3d1f] text-white font-semibold text-[13px] px-5 py-2.5">
                    {uploadingPdf ? "Uploading…" : pdfStatus?.exists ? "Replace file" : "Upload PDF"}
                    <input type="file" accept="application/pdf" onChange={handleUploadPdf} disabled={uploadingPdf} className="hidden" />
                  </label>
                </div>
                {pdfMessage && <p className="mt-3 text-[12px] text-[#0f3d1f]/70">{pdfMessage}</p>}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-[22px] font-black text-[#0f3d1f] mb-6">{product.name} — Insights</h2>

              {statsError && <p className="text-[#dc2626]">{statsError}</p>}
              {stats && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Sales" value={stats.totals.salesCount} />
                    <StatCard label="Total Revenue" value={formatMoney(stats.totals.revenue, product.currency)} />
                    <StatCard label="Today" value={stats.totals.todaySalesCount} sub={formatMoney(stats.totals.todayRevenue, product.currency)} />
                    <StatCard label="Conversion Rate" value={`${stats.totals.conversionRate}%`} sub={`${stats.totals.totalVisits} unique visits`} />
                  </div>

                  <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5">
                    <h3 className="text-[15px] font-bold text-[#0f3d1f] mb-4">Last 14 Days</h3>
                    <div style={{ width: "100%", height: 300 }}>
                      <ResponsiveContainer>
                        <LineChart data={stats.series}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#0f3d1f" name="Sales" strokeWidth={2} />
                          <Line yAxisId="right" type="monotone" dataKey="visits" stroke="#a3d65c" name="Visits" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5 overflow-x-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[15px] font-bold text-[#0f3d1f]">Recent Transactions</h3>
                      <button
                        onClick={handleClearPending}
                        disabled={clearingPending}
                        className="text-[12px] font-semibold text-[#dc2626] border border-[#dc2626]/30 rounded-full px-3.5 py-1.5 hover:bg-[#dc2626]/5 disabled:opacity-50"
                      >
                        {clearingPending ? "Clearing…" : "Clear Pending Orders"}
                      </button>
                    </div>
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-left text-[#0f3d1f]/60 border-b border-black/10">
                          <th className="py-2 pr-4">Email</th>
                          <th className="py-2 pr-4">Amount</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4">Downloads</th>
                          <th className="py-2 pr-4">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentTransactions.map((t) => (
                          <tr key={t.reference} className="border-b border-black/5">
                            <td className="py-2 pr-4">{t.email}</td>
                            <td className="py-2 pr-4">{formatMoney(t.amount, t.currency)}</td>
                            <td className="py-2 pr-4">
                              <span
                                className={
                                  t.status === "success"
                                    ? "text-[#15803d] font-semibold"
                                    : t.status === "failed"
                                    ? "text-[#dc2626] font-semibold"
                                    : "text-[#b45309] font-semibold"
                                }
                              >
                                {t.status}
                              </span>
                            </td>
                            <td className="py-2 pr-4">{t.download_count}</td>
                            <td className="py-2 pr-4">{new Date(t.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
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
