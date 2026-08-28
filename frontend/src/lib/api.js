const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  initPayment: (email) =>
    request("/paystack/init", { method: "POST", body: JSON.stringify({ email }) }),
  verifyPayment: (reference) =>
    request("/paystack/verify", { method: "POST", body: JSON.stringify({ reference }) }),
  trackVisit: (sessionId, path, referrer) =>
    request("/track/visit", {
      method: "POST",
      body: JSON.stringify({ sessionId, path, referrer }),
    }).catch(() => {}), // tracking must never break the page
  adminLogin: (password) =>
    request("/admin/login", { method: "POST", body: JSON.stringify({ password }) }),
  adminLogout: () => request("/admin/logout", { method: "POST" }),
  adminSession: () => request("/admin/session"),
  adminStats: () => request("/admin/stats"),
};

export function getOrCreateSessionId() {
  const key = "flw_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}
