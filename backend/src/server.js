import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import rateLimit from "express-rate-limit";

import paymentsRoutes, { handleWebhook } from "./paymentsRoutes.js";
import trackRoutes from "./trackRoutes.js";
import adminRoutes from "./adminRoutes.js";
import telegramRoutes from "./telegramRoutes.js";
import productsRoutes from "./productsRoutes.js";
import publicRoutes from "./publicRoutes.js";
import { publicReviewsRouter, adminReviewsRouter } from "./reviewsRoutes.js";
import fxRoutes from "./fxRoutes.js";
import geoRoutes from "./geoRoutes.js";
import supportRoutes from "./supportRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.set("trust proxy", 1); // needed behind Coolify's reverse proxy for secure cookies

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  })
);

// Webhook needs the RAW body for signature verification, so mount it
// before the global express.json() parser. One route, parameterized by
// gateway, handles Paystack, Flutterwave and Korapay alike.
app.post("/api/payments/webhook/:provider", express.raw({ type: "application/json" }), handleWebhook);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true, // trust X-Forwarded-Proto from Coolify's Traefik proxy
    cookie: {
      httpOnly: true,
      secure: "auto", // sets Secure only when the actual request is HTTPS
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// Basic abuse protection on payment-related endpoints
const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

app.use("/api/payments/init", paymentLimiter);
app.use("/api/payments/verify", paymentLimiter);
app.use("/api/admin/login", loginLimiter);

app.use("/api/payments", paymentsRoutes);
app.use("/api/track", trackRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/admin/products", productsRoutes);
app.use("/api/public/products", publicRoutes);
app.use("/api/reviews", publicReviewsRouter);
app.use("/api/admin/reviews", adminReviewsRouter);
app.use("/api/admin/fx-rate", fxRoutes);
app.use("/api/public", geoRoutes);
app.use("/api/support", supportRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
