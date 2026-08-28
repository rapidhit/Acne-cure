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

function formatMoney(amountInSmallestUnit, currency) {
  // amount stored in smallest currency unit (e.g. cents)
  const value = amountInSmallestUnit / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(2)}`;
  }
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
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({ priceDollars: "", currency: "", productName: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  useEffect(() => {
    api
      .adminSession()
      .then((s) => {
        if (!s.isAdmin) navigate("/admin/login");
        else {
          loadStats();
          loadSettings();
        }
      })
      .catch(() => navigate("/admin/login"));
  }, []);

  function loadSettings() {
    api.adminGetSettings().then((s) => {
      setSettings(s);
      setSettingsForm({
        priceDollars: (s.price_kobo / 100).toFixed(2),
        currency: s.currency,
        productName: s.product_name,
      });
    });
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage("");
    try {
      const priceKobo = Math.round(parseFloat(settingsForm.priceDollars) * 100);
      const updated = await api.adminUpdateSettings({
        priceKobo,
        currency: settingsForm.currency,
        productName: settingsForm.productName,
      });
      setSettings(updated);
      setSettingsMessage("Saved — new price is live on the checkout immediately.");
    } catch (e) {
      setSettingsMessage(e.message || "Could not save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  function loadStats() {
    api
      .adminStats()
      .then(setStats)
      .catch((e) => setError(e.message));
  }

  async function handleLogout() {
    await api.adminLogout();
    navigate("/admin/login");
  }

  if (error) {
    return <div className="p-8 text-[#dc2626]">{error}</div>;
  }
  if (!stats) {
    return <div className="p-8">Loading dashboard…</div>;
  }

  const { totals, series, recentTransactions } = stats;
  const currency = recentTransactions[0]?.currency || "USD";

  return (
    <div className="min-h-screen bg-[#f9fafb] px-6 py-8">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-black text-[#0f3d1f]">Sales Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-[13px] font-semibold text-[#0f3d1f]/70 underline"
          >
            Log out
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="text-[15px] font-bold text-[#0f3d1f] mb-1">Product Settings</h2>
          <p className="text-[12px] text-[#0f3d1f]/60 mb-4">
            Changes apply immediately to the live checkout — no redeploy needed.
          </p>
          {settings && (
            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
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
                <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Currency (3-letter code)</label>
                <input
                  type="text"
                  maxLength={3}
                  value={settingsForm.currency}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[14px] uppercase"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-[#0f3d1f]/60">Product name</label>
                <input
                  type="text"
                  value={settingsForm.productName}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, productName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[14px]"
                />
              </div>
              <div className="md:col-span-3 flex items-center gap-3">
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
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Sales" value={totals.salesCount} />
          <StatCard label="Total Revenue" value={formatMoney(totals.revenue, currency)} />
          <StatCard
            label="Today"
            value={totals.todaySalesCount}
            sub={formatMoney(totals.todayRevenue, currency)}
          />
          <StatCard
            label="Conversion Rate"
            value={`${totals.conversionRate}%`}
            sub={`${totals.totalVisits} unique visits`}
          />
        </div>

        <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="text-[15px] font-bold text-[#0f3d1f] mb-4">Last 14 Days</h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={series}>
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
          <h2 className="text-[15px] font-bold text-[#0f3d1f] mb-4">Recent Transactions</h2>
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
              {recentTransactions.map((t) => (
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
      </div>
    </div>
  );
}
