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
  // --- Public product pages ---
  getProductBySlug: (slug) => request(`/public/products/${encodeURIComponent(slug)}`),
  getGeoCurrency: () => request("/public/geo-currency"),
  getPublicFxRate: (to, from) =>
    request(`/public/fx-rate?to=${encodeURIComponent(to)}${from ? `&from=${encodeURIComponent(from)}` : ""}`),
  getSupportLink: () => request("/public/support-link"),
  getProductReviews: (slug) => request(`/public/products/${encodeURIComponent(slug)}/reviews`),
  submitReview: (payload) => request("/reviews", { method: "POST", body: JSON.stringify(payload) }),
  likeReview: (reviewId, sessionId) =>
    request(`/reviews/${reviewId}/like`, { method: "POST", body: JSON.stringify({ sessionId }) }),

  // --- Checkout ---
  initPayment: (email, productSlug) =>
    request("/payments/init", { method: "POST", body: JSON.stringify({ email, productSlug }) }),
  verifyPayment: (reference, providerRef) =>
    request("/payments/verify", { method: "POST", body: JSON.stringify({ reference, providerRef }) }),

  // --- Visitor tracking ---
  trackVisit: (sessionId, path, referrer, productSlug) =>
    request("/track/visit", {
      method: "POST",
      body: JSON.stringify({ sessionId, path, referrer, productSlug }),
    }).catch(() => {}), // tracking must never break the page
  trackEmailCapture: (email, productSlug, sessionId) =>
    request("/track/email-capture", {
      method: "POST",
      body: JSON.stringify({ email, productSlug, sessionId }),
    }).catch(() => {}),

  // --- Admin auth ---
  adminLogin: (password) =>
    request("/admin/login", { method: "POST", body: JSON.stringify({ password }) }),
  adminLogout: () => request("/admin/logout", { method: "POST" }),
  adminSession: () => request("/admin/session"),

  // --- Admin: products ---
  adminListProducts: () => request("/admin/products"),
  adminGetProduct: (id) => request(`/admin/products/${id}`),
  adminCreateProduct: (payload) =>
    request("/admin/products", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateProduct: (id, payload) =>
    request(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  adminSetDefaultProduct: (id) =>
    request(`/admin/products/${id}/set-default`, { method: "POST" }),

  // --- Admin: per-product PDF ---
  adminGetPdfStatus: (id) => request(`/admin/products/${id}/pdf-status`),
  adminUploadPdf: async (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/admin/products/${id}/upload-pdf`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Upload failed");
    return data;
  },

  // --- Admin: per-product stats ---
  adminGetStats: (id) => request(`/admin/products/${id}/stats`),
  adminClearPending: (id) =>
    request(`/admin/products/${id}/transactions/pending`, { method: "DELETE" }),
  adminGetEmailCaptures: (id) => request(`/admin/products/${id}/email-captures`),
  adminClearEmailCaptures: (id) =>
    request(`/admin/products/${id}/email-captures`, { method: "DELETE" }),
  adminGetFxRate: (to) => request(`/admin/fx-rate?to=${encodeURIComponent(to)}`),
  adminGetPaymentProviderStatus: () => request("/admin/products/payment-providers/status"),

  // --- Admin: reviews ---
  adminGetReviews: (productId) => request(`/admin/reviews?productId=${productId}`),
  adminApproveReview: (id) => request(`/admin/reviews/${id}/approve`, { method: "POST" }),
  adminRejectReview: (id) => request(`/admin/reviews/${id}/reject`, { method: "POST" }),
  adminDeleteReview: (id) => request(`/admin/reviews/${id}`, { method: "DELETE" }),
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
