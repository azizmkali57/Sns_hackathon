"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiMail, FiShield, FiArrowRight,
  FiAlertCircle, FiCheckCircle, FiArrowLeft,
} from "react-icons/fi";

export default function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong");
        return;
      }

      setSuccess("Reset link sent! Check your inbox.");
      setSent(true);

    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">

      {/* ── Header ── */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-full p-3 mb-4">
          <FiShield className="text-[#22C55E] text-3xl" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Forgot Password?
        </h2>
        <p className="text-gray-400 text-sm mt-1 text-center">
          No worries — we'll send you a reset link
        </p>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/40
                        text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
          <FiAlertCircle className="shrink-0 text-base" />
          {error}
        </div>
      )}

      {/* ── Success State ── */}
      {sent ? (
        <div className="text-center">
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/40
                          text-green-400 text-sm rounded-xl px-4 py-4 mb-6 justify-center">
            <FiCheckCircle className="shrink-0 text-lg" />
            <div className="text-left">
              <p className="font-medium">Reset link sent!</p>
              <p className="text-xs text-green-400/70 mt-0.5">
                Check your inbox at <span className="font-medium">{email}</span>
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-6">
            Didn't receive it? Check spam or{" "}
            <button
              onClick={() => { setSent(false); setSuccess(""); }}
              className="text-[#22C55E] hover:underline"
            >
              try again
            </button>
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>

          {/* Email */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block pl-1">
              Email Address
            </label>
            <div className="flex items-center bg-[#0F172A] border border-[#334155]
                            focus-within:border-[#22C55E]/60 rounded-xl px-4 py-3
                            transition-colors duration-200">
              <FiMail className="text-gray-500 mr-3 text-base shrink-0" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="bg-transparent w-full outline-none text-white placeholder-gray-600 text-sm"
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2
                       bg-[#22C55E] hover:bg-[#16A34A] active:scale-[0.98]
                       text-black font-semibold py-3 rounded-xl
                       transition-all duration-200
                       disabled:opacity-60 disabled:cursor-not-allowed
                       shadow-lg shadow-[#22C55E]/20 mt-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                Send Reset Link
                <FiArrowRight className="text-base" />
              </>
            )}
          </button>
        </form>
      )}

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-[#1E293B]" />
        <span className="text-xs text-gray-600">or</span>
        <div className="flex-1 h-px bg-[#1E293B]" />
      </div>

      {/* ── Back to Login ── */}
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-gray-400
                   hover:text-[#22C55E] transition-colors duration-200"
      >
        <FiArrowLeft className="text-base" />
        Back to Login
      </Link>

      {/* ── Trust Badge ── */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <FiShield className="text-gray-600 text-xs" />
        <span className="text-xs text-gray-600">
          Protected by end-to-end encryption
        </span>
      </div>

    </div>
  );
}