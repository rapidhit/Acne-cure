import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export default function AdminSecurity() {
  const [status, setStatus] = useState(null); // { enabled, bypassed }
  const [setup, setSetup] = useState(null); // { secret, qr }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  function load() {
    api.adminTwoFaStatus().then(setStatus).catch(() => setStatus({ enabled: false }));
  }
  useEffect(load, []);

  async function startSetup() {
    setError("");
    setDone("");
    setBusy(true);
    try {
      setSetup(await api.adminTwoFaSetup());
      setCode("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError("");
    setBusy(true);
    try {
      await api.adminTwoFaEnable(code);
      setSetup(null);
      setCode("");
      setDone("Two-factor authentication is on. You'll need a code each time you log in.");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setError("");
    setBusy(true);
    try {
      await api.adminTwoFaDisable(code);
      setCode("");
      setDone("Two-factor authentication is off.");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full max-w-[220px] rounded-md border border-hairline px-3 py-2 text-[15px] tracking-[0.3em] text-center outline-none focus:border-accent";

  return (
    <div className="rounded-lg border border-hairline bg-white p-5">
      <h2 className="font-display font-semibold text-[15px] text-[#12131A] mb-1">Two-factor authentication</h2>
      <p className="text-[13px] text-[#5B6472] mb-4">
        Adds a 6-digit code from Google Authenticator (or any authenticator app) to your dashboard login.
      </p>

      {!status ? (
        <p className="text-[13px] text-[#5B6472]">Loading…</p>
      ) : setup ? (
        <div>
          <p className="text-[13px] text-[#12131A] mb-3">
            1. Open your authenticator app and scan this code, or type the key in.
          </p>
          <img src={setup.qr} alt="Authenticator QR code" className="w-[200px] h-[200px] border border-hairline rounded-md" />
          <p className="mt-3 text-[12px] text-[#5B6472]">Can't scan? Enter this key:</p>
          <code className="block mt-1 text-[13px] break-all select-all bg-[#F3F4F6] rounded px-2 py-1.5 max-w-[420px]">
            {setup.secret}
          </code>
          <p className="mt-4 text-[13px] text-[#12131A] mb-2">2. Enter the 6-digit code it shows to confirm.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="000000"
            className={input}
          />
          <div className="mt-3 flex gap-3">
            <button
              onClick={confirm}
              disabled={busy || code.length !== 6}
              className="rounded-md bg-accent text-white text-[13px] font-semibold px-4 py-2 disabled:opacity-50"
            >
              {busy ? "Checking…" : "Turn on"}
            </button>
            <button onClick={() => { setSetup(null); setCode(""); setError(""); }} className="text-[13px] text-[#5B6472]">
              Cancel
            </button>
          </div>
        </div>
      ) : status.enabled ? (
        <div>
          <p className="text-[13px] font-semibold text-positive">● Two-factor authentication is on</p>
          {status.bypassed && (
            <p className="mt-2 text-[12px] text-warn">
              ADMIN_DISABLE_2FA is set on the server, so login currently skips the code. Remove it to enforce 2FA.
            </p>
          )}
          <p className="mt-4 text-[13px] text-[#12131A] mb-2">To turn it off, enter a current code:</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="000000"
            className={input}
          />
          <div className="mt-3">
            <button
              onClick={turnOff}
              disabled={busy || code.length !== 6}
              className="rounded-md border border-[#DC2626]/40 text-[#DC2626] text-[13px] font-semibold px-4 py-2 disabled:opacity-50"
            >
              Turn off
            </button>
          </div>
          <p className="mt-5 text-[12px] text-[#5B6472]">
            Lost your phone? Set <code>ADMIN_DISABLE_2FA=true</code> in Coolify, redeploy, log in with just your
            password, then turn 2FA off and on again here with the new phone.
          </p>
        </div>
      ) : (
        <button
          onClick={startSetup}
          disabled={busy}
          className="rounded-md bg-accent text-white text-[13px] font-semibold px-4 py-2 disabled:opacity-60"
        >
          Set up authenticator
        </button>
      )}

      {done && <p className="mt-4 text-[13px] text-positive">{done}</p>}
      {error && <p className="mt-4 text-[13px] text-[#DC2626]">{error}</p>}
    </div>
  );
}
