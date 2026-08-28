import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.adminLogin(password);
      navigate("/admin");
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f3d1f] flex items-center justify-center px-5">
      <form
        onSubmit={handleSubmit}
        className="max-w-[360px] w-full bg-white rounded-[20px] p-7"
      >
        <h1 className="text-[20px] font-black text-[#0f3d1f]">Admin Dashboard</h1>
        <p className="text-[13px] text-[#0f3d1f]/60 mt-1">Enter your password to continue</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="mt-5 w-full rounded-xl border border-black/10 px-4 py-3 text-[15px] outline-none focus:border-[#0f3d1f]"
        />
        {error && <p className="mt-2 text-[13px] text-[#dc2626]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-full bg-[#0f3d1f] text-white font-bold py-3 disabled:opacity-60"
        >
          {loading ? "Checking…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
