"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiUser, FiMail, FiLock, FiPhone,
  FiEye, FiEyeOff, FiShield,
  FiAlertCircle, FiCheckCircle, FiArrowRight,
} from "react-icons/fi";

export default function Register() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
  });
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill all required fields");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => router.push("/login"), 1500);

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
          Create Account
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Join SNS and travel safer
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
      {success && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/40
                        text-green-400 text-sm rounded-xl px-4 py-3 mb-5">
          <FiCheckCircle className="shrink-0 text-base" />
          {success}
        </div>
      )}

      {/* ── Form ── */}
      <form className="space-y-4" onSubmit={handleSubmit}>

        {/* Full Name */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block pl-1">
            Full Name <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center bg-[#0F172A] border border-[#334155]
                          focus-within:border-[#22C55E]/60 rounded-xl px-4 py-3 transition-colors duration-200">
            <FiUser className="text-gray-500 mr-3 text-base shrink-0" />
            <input
              type="text"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              className="bg-transparent w-full outline-none text-white placeholder-gray-600 text-sm"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block pl-1">
            Email Address <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center bg-[#0F172A] border border-[#334155]
                          focus-within:border-[#22C55E]/60 rounded-xl px-4 py-3 transition-colors duration-200">
            <FiMail className="text-gray-500 mr-3 text-base shrink-0" />
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              className="bg-transparent w-full outline-none text-white placeholder-gray-600 text-sm"
              required
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block pl-1">
            Phone Number
            <span className="text-gray-600 ml-1">(optional)</span>
          </label>
          <div className="flex items-center bg-[#0F172A] border border-[#334155]
                          focus-within:border-[#22C55E]/60 rounded-xl px-4 py-3 transition-colors duration-200">
            <FiPhone className="text-gray-500 mr-3 text-base shrink-0" />
            <input
              type="tel"
              name="phone"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={handleChange}
              className="bg-transparent w-full outline-none text-white placeholder-gray-600 text-sm"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block pl-1">
            Password <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center bg-[#0F172A] border border-[#334155]
                          focus-within:border-[#22C55E]/60 rounded-xl px-4 py-3 transition-colors duration-200">
            <FiLock className="text-gray-500 mr-3 text-base shrink-0" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={handleChange}
              className="bg-transparent w-full outline-none text-white placeholder-gray-600 text-sm"
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

          {/* Password strength indicator */}
          {formData.password && (
            <div className="flex gap-1 mt-2 pl-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    formData.password.length >= (i + 1) * 3
                      ? formData.password.length >= 10
                        ? "bg-[#22C55E]"
                        : formData.password.length >= 6
                        ? "bg-yellow-400"
                        : "bg-red-400"
                      : "bg-[#1E293B]"
                  }`}
                />
              ))}
              <span className="text-xs text-gray-500 ml-1">
                {formData.password.length >= 10
                  ? "Strong"
                  : formData.password.length >= 6
                  ? "Medium"
                  : "Weak"}
              </span>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block pl-1">
            Confirm Password <span className="text-red-400">*</span>
          </label>
          <div className={`flex items-center bg-[#0F172A] border rounded-xl px-4 py-3
                          transition-colors duration-200
                          ${formData.confirmPassword && formData.password !== formData.confirmPassword
                            ? "border-red-500/50"
                            : formData.confirmPassword && formData.password === formData.confirmPassword
                            ? "border-[#22C55E]/60"
                            : "border-[#334155] focus-within:border-[#22C55E]/60"
                          }`}>
            <FiLock className="text-gray-500 mr-3 text-base shrink-0" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="bg-transparent w-full outline-none text-white placeholder-gray-600 text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-gray-500 hover:text-gray-300 ml-2 transition-colors duration-200"
            >
              {showConfirmPassword
                ? <FiEyeOff className="text-base" />
                : <FiEye className="text-base" />}
            </button>
          </div>

          {/* Match indicator */}
          {formData.confirmPassword && (
            <p className={`text-xs mt-1.5 pl-1 ${
              formData.password === formData.confirmPassword
                ? "text-[#22C55E]"
                : "text-red-400"
            }`}>
              {formData.password === formData.confirmPassword
                ? "✓ Passwords match"
                : "✗ Passwords do not match"}
            </p>
          )}
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
              Creating Account...
            </>
          ) : (
            <>
              Create Account
              <FiArrowRight className="text-base" />
            </>
          )}
        </button>
      </form>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-[#1E293B]" />
        <span className="text-xs text-gray-600">or</span>
        <div className="flex-1 h-px bg-[#1E293B]" />
      </div>

      {/* ── Login Link ── */}
      <p className="text-sm text-center text-gray-400">
        Already have an account?{" "}
        <Link href="/login"
          className="text-[#22C55E] font-medium hover:text-[#16A34A] transition-colors duration-200">
          Sign in →
        </Link>
      </p>

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