"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiShield,
  FiAlertCircle,
  FiCheckCircle,
  FiArrowRight,
} from "react-icons/fi";

export default function Login() {
  const router = useRouter();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      // Save user to localStorage for UI use
      localStorage.setItem("sns_user", JSON.stringify(data.user));

      setSuccess(`Welcome back, ${data.user.name}!`);
      setTimeout(() => router.push("/"), 1200);

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
          Welcome Back
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Sign in to your SNS account
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/40
                        text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
          <FiAlertCircle className="shrink-0 text-base" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/40
                        text-green-400 text-sm rounded-xl px-4 py-3 mb-5">
          <FiCheckCircle className="shrink-0 text-base" />
          {success}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>

        <div className="group">
          <label className="text-xs text-gray-400 font-medium mb-1.5 block pl-1">
            Email Address
          </label>
          <div className={`flex items-center bg-[#0F172A] border rounded-xl px-4 py-3
                          transition-colors duration-200
                          ${error ? "border-red-500/50" : "border-[#334155] focus-within:border-[#22C55E]/60"}`}>
            <FiMail className="text-gray-500 group-focus-within:text-[#22C55E] mr-3 text-base shrink-0
                               transition-colors duration-200" />
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              className="bg-transparent w-full outline-none text-white placeholder-gray-600 text-sm"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="group">
          <label className="text-xs text-gray-400 font-medium mb-1.5 block pl-1">
            Password
          </label>
          <div className={`flex items-center bg-[#0F172A] border rounded-xl px-4 py-3
                          transition-colors duration-200
                          ${error ? "border-red-500/50" : "border-[#334155] focus-within:border-[#22C55E]/60"}`}>
            <FiLock className="text-gray-500 mr-3 text-base shrink-0 transition-colors duration-200" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className="bg-transparent w-full outline-none text-white placeholder-gray-600 text-sm"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-500 hover:text-gray-300 ml-2 transition-colors duration-200"
            >
              {showPassword ? <FiEyeOff className="text-base" /> : <FiEye className="text-base" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-[#22C55E] hover:text-[#16A34A] transition-colors duration-200"
          >
            Forgot password?
          </Link>
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
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <FiArrowRight className="text-base" />
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-[#1E293B]" />
        <span className="text-xs text-gray-600">or</span>
        <div className="flex-1 h-px bg-[#1E293B]" />
      </div>

      <p className="text-sm text-center text-gray-400">
        Don't have an account?{" "}
        <Link
          href="/register"
          className="text-[#22C55E] font-medium hover:text-[#16A34A] transition-colors duration-200"
        >
          Create one free →
        </Link>
      </p>

      <div className="flex items-center justify-center gap-2 mt-6">
        <FiShield className="text-gray-600 text-xs" />
        <span className="text-xs text-gray-600">
          Protected by end-to-end encryption
        </span>
      </div>

    </div>
  );
}