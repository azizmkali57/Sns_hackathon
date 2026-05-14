"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FiLock, FiEye, FiEyeOff, FiShield,
  FiAlertCircle, FiCheckCircle, FiArrowRight,
} from "react-icons/fi";

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token");
  const email        = searchParams.get("email");

  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");
  const [success, setSuccess]                 = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Reset failed");
        return;
      }

      setSuccess("Password reset! Redirecting to login...");
      setTimeout(() => router.push("/login"), 1500);

    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">

      <div className="flex flex-col items-center mb-8">
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-full p-3 mb-4">
          <FiShield className="text-[#22C55E] text-3xl" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Reset Password
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Enter your new password below
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/40
                        text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
          <FiAlertCircle className="shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/40
                        text-green-400 text-sm rounded-xl px-4 py-3 mb-5">
          <FiCheckCircle className="shrink-0" />
          {success}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block pl-1">
            New Password
          </label>
          <div className="flex items-center bg-[#0F172A] border border-[#334155]
                          focus-within:border-[#22C55E]/60 rounded-xl px-4 py-3
                          transition-colors duration-200">
            <FiLock className="text-gray-500 mr-3 text-base shrink-0" />
            <input
              type={showNew ? "text" : "password"}
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
              className="bg-transparent w-full outline-none text-white placeholder-gray-600 text-sm"
              required
            />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="text-gray-500 hover:text-gray-300 ml-2">
              {showNew ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block pl-1">
            Confirm Password
          </label>
          <div className={`flex items-center bg-[#0F172A] border rounded-xl px-4 py-3
                          transition-colors duration-200
                          ${confirmPassword && newPassword !== confirmPassword
                            ? "border-red-500/50"
                            : confirmPassword && newPassword === confirmPassword
                            ? "border-[#22C55E]/60"
                            : "border-[#334155] focus-within:border-[#22C55E]/60"}`}>
            <FiLock className="text-gray-500 mr-3 text-base shrink-0" />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              className="bg-transparent w-full outline-none text-white placeholder-gray-600 text-sm"
              required
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="text-gray-500 hover:text-gray-300 ml-2">
              {showConfirm ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {confirmPassword && (
            <p className={`text-xs mt-1.5 pl-1 ${
              newPassword === confirmPassword ? "text-[#22C55E]" : "text-red-400"
            }`}>
              {newPassword === confirmPassword
                ? "✓ Passwords match"
                : "✗ Passwords do not match"}
            </p>
          )}
        </div>

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
              Resetting...
            </>
          ) : (
            <>Reset Password <FiArrowRight /></>
          )}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-[#1E293B]" />
        <span className="text-xs text-gray-600">or</span>
        <div className="flex-1 h-px bg-[#1E293B]" />
      </div>

      <p className="text-sm text-center text-gray-400">
        Remember your password?{" "}
        <Link href="/login"
          className="text-[#22C55E] font-medium hover:text-[#16A34A] transition-colors duration-200">
          Back to Login →
        </Link>
      </p>

      <div className="flex items-center justify-center gap-2 mt-6">
        <FiShield className="text-gray-600 text-xs" />
        <span className="text-xs text-gray-600">Protected by end-to-end encryption</span>
      </div>

    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="text-white text-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}