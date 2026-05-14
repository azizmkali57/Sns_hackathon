"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();

  // Fetch current user from JWT cookie via /api/auth/me
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Call this right after a successful login/register response
  // so the context updates without needing a page refresh
  const loginUser = (userData) => {
    setUser(userData);
  };

  // Clear cookie + state, redirect to login
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (_) {}
    setUser(null);
    router.push("/login");
  };

  // Optimistically patch settings in context (used by profile page)
  const updateSettings = (patch) => {
    setUser((prev) =>
      prev ? { ...prev, settings: { ...prev.settings, ...patch } } : prev
    );
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout, fetchUser, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}