# Flawless Natural Remedies — Landing Page + Paystack + Admin Dashboard

## Structure
- `frontend/` — React + Vite + Tailwind landing page, checkout, success/download page, admin dashboard
- `backend/` — Express API: Paystack init/verify/webhook, gated PDF download, visitor tracking, admin auth + stats (SQLite via `better-sqlite3`)

## Local setup

```bash
# Backend
cd backend
cp .env.example .env      # fill in real values
npm install
# put your real PDF at the path set by PDF_FILE_PATH in .env
npm run dev                # http://localhost:4000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:4000` automatically.

## Required `.env` values (`backend/.env`)
| Var | Notes |
|---|---|
| `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` | From your Paystack dashboard → Settings → API Keys & Webhooks |
| `PRODUCT_PRICE_KOBO` | Amount in the **smallest currency unit** (e.g. `499` = $4.99) |
| `PRODUCT_CURRENCY` | Must be enabled on your Paystack account (check available currencies) |
| `PDF_FILE_PATH` | Path to the real PDF, kept out of git |
| `ADMIN_PASSWORD` | Password for `/admin` |
| `SESSION_SECRET` | Long random string |
| `FRONTEND_ORIGIN` | Your real domain in production, for CORS |

## Paystack webhook
In your Paystack dashboard, set the webhook URL to:
```
https://yourdomain.com/api/paystack/webhook
```
This is a backup path — the primary flow verifies payment right after checkout via `/api/paystack/verify`, so the site works even if you skip the webhook, but the webhook catches edge cases (buyer closes tab before verify fires).

## Deploying on Coolify
1. Push this repo to GitHub/GitLab.
2. In Coolify, create a new **Docker Compose** resource pointing at this repo — it will pick up `docker-compose.yml`.
3. Add the backend environment variables in Coolify's UI (or mount `backend/.env` as a secret file) — **do not commit `.env`**.
4. Upload the real PDF into the `backend_data` volume once, or `docker cp` it in after first deploy:
   ```bash
   docker cp flawless-natural-remedies.pdf <backend_container>:/app/data/flawless-natural-remedies.pdf
   ```
5. Point your domain at the `frontend` service (port 80). Coolify handles TLS.
6. Test with Paystack **test keys** first (test cards: https://paystack.com/docs/payments/test-payments/), then swap to live keys.

## Security notes
- The Paystack **secret key never reaches the browser** — only used server-side to verify transactions and validate webhook signatures.
- Download links are single-use-tracked, tied to a verified transaction, and expire after `DOWNLOAD_TOKEN_TTL_MINUTES`.
- Admin session is a signed, httpOnly cookie — not accessible to JS, not stored in localStorage.
- Rate limiting is applied to `/paystack/init`, `/paystack/verify`, and `/admin/login` to blunt brute-force / abuse.
