import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.adminLogin(password, needsCode ? code : undefined);
      if (res?.needsCode) {
        setNeedsCode(true);
        return;
      }
      navigate("/admin");
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-5 font-console">
      <form
        onSubmit={handleSubmit}
        className="max-w-[360px] w-full bg-[#161D2E] border border-white/10 rounded-lg p-7"
      >
        <h1 className="font-display font-semibold text-[19px] text-white">Console</h1>
        <p className="text-[13px] text-white/40 mt-1">
          {needsCode ? "Enter the 6-digit code from your authenticator app" : "Enter your password to continue"}
        </p>
        {needsCode ? (
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            autoFocus
            className="mt-5 w-full rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-[18px] tracking-[0.4em] text-center text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 placeholder:text-white/30"
          />
        ) : (
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="mt-5 w-full rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-[14px] text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 placeholder:text-white/30"
        />
        )}
        {error && <p className="mt-2 text-[13px] text-[#FF6B6B]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-md bg-accent text-white font-semibold text-[14px] py-2.5 hover:bg-accent/90 disabled:opacity-60 transition-colors"
        >
          {loading ? "Checking…" : needsCode ? "Verify" : "Log in"}
        </button>
      </form>
    </div>
  );
}
