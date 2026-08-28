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

  useEffect(() => {
    api
      .adminSession()
      .then((s) => {
        if (!s.isAdmin) navigate("/admin/login");
        else loadStats();
      })
      .catch(() => navigate("/admin/login"));
  }, []);

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
