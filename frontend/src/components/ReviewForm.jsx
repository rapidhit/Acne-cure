import { useState } from "react";
import { api } from "../lib/api.js";

export default function ReviewForm({ reference }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [country, setCountry] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !country.trim() || !body.trim()) {
      setError("Please fill in your name, country and a short review.");
      return;
    }
    setSubmitting(true);
    try {
      await api.submitReview({ reference, name: name.trim(), country: country.trim(), rating, body: body.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 rounded-[24px] border border-[#e4e9ee] bg-white p-5 text-center">
        <p className="text-[14px] font-semibold text-[#0b2a3a]">Thanks for your review!</p>
        <p className="mt-1 text-[13px] text-[#4a5b66]">
          It'll appear on the page once it's been reviewed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-[24px] border border-[#e4e9ee] bg-white p-5">
      <h3 className="text-[15px] font-bold text-[#0b2a3a]">Leave a review</h3>
      <p className="mt-1 text-[12.5px] text-[#4a5b66]">Help others considering this guide.</p>

      <div className="mt-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            className="text-[26px] leading-none"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <span className={(hoverRating || rating) >= n ? "text-[#f5b301]" : "text-black/15"}>★</span>
          </button>
        ))}
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="mt-3 w-full rounded-xl border border-[#d5dde4] px-4 py-2.5 text-[14px] outline-none focus:border-[#1f4d3a]"
      />
      <input
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        placeholder="Your country (e.g. USA)"
        className="mt-2 w-full rounded-xl border border-[#d5dde4] px-4 py-2.5 text-[14px] outline-none focus:border-[#1f4d3a]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think?"
        rows={3}
        className="mt-2 w-full rounded-xl border border-[#d5dde4] px-4 py-2.5 text-[14px] outline-none focus:border-[#1f4d3a]"
      />

      {error && <p className="mt-2 text-[13px] text-[#dc2626]">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full rounded-2xl bg-[#1f4d3a] text-white font-semibold text-[14px] py-2.5 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
