"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import RouteCard from "@/components/home/RouteCard";
import Footer from "@/components/layout/Footer";

import {
  FiSearch, FiHome, FiUser, FiAlertTriangle, FiMapPin, FiEye,
} from "react-icons/fi";
import { MdSecurity } from "react-icons/md";
import SOSButton from "@/components/Home/SOSButton";

const MapView = dynamic(() => import("@/components/home/MapView"), { ssr: false });

const ROUTES = [
  {
    key: "safe",
    name: "MG Road via Vijay Nagar",
    score: 92, level: "safe",
    duration: "18 min", distance: "4.2 km",
    tags: ["CCTV Covered", "Well Lit", "High Footfall"],
    badge: "SAFEST", recommended: true,
  },
  {
    key: "medium",
    name: "Palasia Square Bypass",
    score: 67, level: "medium",
    duration: "12 min", distance: "3.1 km",
    tags: ["1 Risk Zone", "Partial Lit"],
    badge: "FASTER",
  },
  {
    key: "danger",
    name: "Old Agra Road Shortcut",
    score: 31, level: "danger",
    duration: "9 min", distance: "2.8 km",
    tags: ["3 Risk Zones", "No CCTV", "Isolated"],
    badge: "AVOID",
  },
];

const QUICK_ACTIONS = [
  { icon: FiHome,          label: "Home Route",    path: "/",         },
  { icon: FiUser,          label: "Guardian Mode", path: "/guardian", },
  { icon: FiAlertTriangle, label: "Report",        path: "/report",   },
  { icon: FiMapPin,        label: "Navigate",      path: "/navigate", },
];

export default function App() {
  const router = useRouter();

  const [guardianOn,  setGuardianOn]  = useState(true);
  const [user,        setUser]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activeRoute, setActiveRoute] = useState("safe");

  useEffect(() => {
    const stored = localStorage.getItem("sns_user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      router.push("/login");
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sns_token");
    localStorage.removeItem("sns_user");
    router.push("/login");
  };

  const handleSOS = () => alert("🚨 SOS Activated!");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <span className="text-[#22C55E] text-base">Loading...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#0F172A] text-[#F1F5F9] min-h-screen font-[Poppins,sans-serif]">
      <Header user={user} hasNotification onLogout={handleLogout} />

      <div className="max-w-[430px] mx-auto pt-[100px] pb-24">

        <div className="px-5 py-3">
          <p className="text-[13px] text-[#94A3B8]">Stay protected</p>
          <h2 className="text-[22px] font-semibold leading-snug mt-0.5">
            Where are you <br />
            <span className="text-[#22C55E]">
              navigating today{user?.name ? `, ${user.name.split(" ")[0]}` : ""}?
            </span>
          </h2>
        </div>

        <div className="mx-5 mb-4 p-4 bg-[#22C55E]/10 rounded-xl flex items-center gap-3">
          <MdSecurity size={30} className="text-[#22C55E] flex-shrink-0" />
          <div>
            <p className="text-[12px] text-white/60">Area Safety</p>
            <h3 className="text-[#22C55E] font-bold text-lg leading-none">87/100</h3>
          </div>
        </div>

        <div className="mx-5 mb-5">
          <div
            onClick={() => router.push("/navigate")}
            className="flex items-center gap-3 bg-[#1E293B] px-4 py-3 rounded-xl cursor-pointer hover:bg-[#1E293B]/80 transition-colors"
          >
            <FiSearch className="text-[#94A3B8]" size={16} />
            <span className="text-[#94A3B8] text-sm">Search destination...</span>
          </div>
        </div>

        <MapView activeRoute={activeRoute} onRouteChange={setActiveRoute} />

        <div className="px-5 mt-5">
          <h3 className="text-sm font-semibold mb-3 text-white/80">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ icon: Icon, label, path }) => (
              <div
                key={label}
                onClick={() => router.push(path)}
                className="bg-[#1E293B] p-3 rounded-xl text-center cursor-pointer hover:scale-105 hover:bg-[#1E293B]/80 transition-all duration-200"
              >
                <div className="flex justify-center mb-1">
                  <Icon size={20} className="text-[#94A3B8]" />
                </div>
                <p className="text-[10px] text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-5 mt-4 p-3 bg-[#1E293B] rounded-xl flex items-center gap-3">
          <FiEye size={18} className="text-[#94A3B8]" />
          <span className="text-sm text-white/70">Guardian Mode</span>
          <button
            onClick={() => setGuardianOn(!guardianOn)}
            className={`ml-auto px-3 py-1.5 rounded-md text-xs font-semibold border-0 cursor-pointer transition-colors ${
              guardianOn ? "bg-[#22C55E] text-[#0F172A]" : "bg-[#334155] text-white/60"
            }`}
          >
            {guardianOn ? "ON" : "OFF"}
          </button>
        </div>

        <div className="px-5 mt-5">
          <h3 className="text-sm font-semibold mb-3 text-white/80">Routes</h3>
          {ROUTES.map((route) => {
            const borderColor =
              route.level === "safe"   ? "#22C55E" :
              route.level === "medium" ? "#F59E0B" : "#EF4444";
            return (
              <div
                key={route.key}
                onClick={() => setActiveRoute(route.key)}
                className="mb-3 rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  outline: activeRoute === route.key ? `2px solid ${borderColor}` : "2px solid transparent",
                  borderRadius: 12,
                }}
              >
                <RouteCard route={route} />
              </div>
            );
          })}
        </div>

        <div className="px-5 mt-4 flex justify-center">
          <SOSButton onSOS={handleSOS} />
        </div>

      </div>

      <Footer />
    </div>
  );
}