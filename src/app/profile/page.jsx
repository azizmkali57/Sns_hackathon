"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MdVerified, MdShield, MdSos, MdWhatsapp,
  MdVisibility, MdPerson, MdLogout, MdRoute,
} from "react-icons/md";
import { FiBell, FiToggleLeft, FiToggleRight } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

// ─── Badge definitions (earned based on real stats) ───────────────────────────
const BADGE_DEFS = [
  { icon: "🛡️", label: "Safety First",   desc: "Chose safest route 10x",  earned: (s) => s.totalJourneys >= 10 },
  { icon: "🆘", label: "SOS Ready",      desc: "Contacts configured",      earned: ()  => true                  },
  { icon: "📍", label: "Reporter",       desc: "Submitted 5 incidents",    earned: (s) => s.reportsCount >= 5   },
  { icon: "🌙", label: "Night Guardian", desc: "Navigated after 10 PM",    earned: (s) => s.totalJourneys >= 1  },
  { icon: "⭐", label: "Trusted User",   desc: "100+ verified reports",    earned: (s) => s.reportsCount >= 100 },
  { icon: "🏆", label: "Community Hero", desc: "Top reporter in area",     earned: (s) => s.reportsCount >= 50  },
];

const SETTINGS_DEF = [
  { key: "notifications", label: "Risk Alert Notifications",  sub: "Audio + visual warnings on route",   icon: FiBell       },
  { key: "guardian",      label: "Auto-Guardian Mode",        sub: "Share location when journey starts",  icon: MdShield     },
  { key: "sosAuto",       label: "SOS Auto-Contact",          sub: "Send SMS when SOS triggered",         icon: MdSos        },
  { key: "whatsapp",      label: "WhatsApp Backup SOS",       sub: "Backup message via WhatsApp",         icon: MdWhatsapp   },
  { key: "crowdsource",   label: "Anonymous Reporting",       sub: "Hide identity in incident reports",   icon: MdVisibility },
];

const TABS = ["overview", "history", "badges", "settings"];

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-white/8 rounded-lg ${className}`} />;
}

export default function ProfilePage() {
  const router                          = useRouter();
  const { user, loading: authLoading, logout, updateSettings } = useAuth();

  const [activeTab,    setActiveTab]    = useState("overview");
  const [journeys,     setJourneys]     = useState([]);
  const [stats,        setStats]        = useState({ totalJourneys: 0, avgScore: 0, reportsCount: 0 });
  const [settings,     setSettings]     = useState(null);
  const [dataLoading,  setDataLoading]  = useState(true);
  const [savingKey,    setSavingKey]    = useState(null);

  // ── Redirect if not logged in — wait for auth to finish loading first ────
  useEffect(() => {
    if (authLoading) return;   // still fetching /api/auth/me, wait
    if (!user) router.replace("/login");
  }, [authLoading, user, router]);

  // ── Sync settings from auth context ──────────────────────────────────────
  useEffect(() => {
    if (user?.settings) setSettings(user.settings);
  }, [user]);

  // ── Fetch journeys + stats ────────────────────────────────────────────────
  const loadJourneys = useCallback(async () => {
    try {
      setDataLoading(true);
      const res = await fetch("/api/user/journeys", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setJourneys(data.journeys ?? []);
        setStats(data.stats   ?? { totalJourneys: 0, avgScore: 0, reportsCount: 0 });
      }
    } catch (err) {
      console.error("Failed to load journeys:", err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadJourneys();
  }, [user, loadJourneys]);

  // ── Toggle setting: optimistic update + persist to DB ────────────────────
  const toggle = async (key) => {
    if (savingKey) return;
    const newVal      = !settings[key];
    const newSettings = { ...settings, [key]: newVal };

    setSettings(newSettings);
    updateSettings({ [key]: newVal });
    setSavingKey(key);

    try {
      const res = await fetch("/api/user/settings", {
        method:      "PUT",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify(newSettings),
      });
      if (!res.ok) {
        // revert on failure
        setSettings((prev) => ({ ...prev, [key]: !newVal }));
        updateSettings({ [key]: !newVal });
      }
    } catch {
      setSettings((prev) => ({ ...prev, [key]: !newVal }));
      updateSettings({ [key]: !newVal });
    } finally {
      setSavingKey(null);
    }
  };

  // ── Loading state — show skeleton while auth is resolving ────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#081120] pt-[100px] pb-16 px-6">
        <div className="max-w-5xl mx-auto space-y-5">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-10 w-64 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not logged in — redirect handled in useEffect, show nothing ──────────
  if (!user) return null;

  // ── Derived ───────────────────────────────────────────────────────────────
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "—";

  const badges = BADGE_DEFS.map((b) => ({ ...b, earned: b.earned(stats) }));

  return (
    <div className="min-h-screen bg-[#081120] pt-[100px] pb-16 text-[#F5F7FA] font-[Inter,sans-serif] relative">
      <Header />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 700px 500px at 50% 20%,rgba(0,209,255,.04) 0%,transparent 70%)" }}
      />

      <div className="max-w-5xl mx-auto px-6 relative z-10">

        {/* ── Hero card ──────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#00D1FF]/6 to-[#39D353]/4 border border-[#00D1FF]/15 rounded-3xl p-8 flex flex-col md:flex-row items-center md:items-start gap-7 mb-5">
          <div className="absolute top-[-60px] right-[-60px] w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(0,209,255,.08),transparent)] pointer-events-none" />

          {/* Avatar with real initials */}
          <div className="relative flex-shrink-0">
            <div className="w-[90px] h-[90px] rounded-full bg-gradient-to-br from-[#00D1FF]/20 to-[#39D353]/20 border-2 border-[#00D1FF]/30 flex items-center justify-center text-[32px] font-bold font-[Poppins,sans-serif] text-white shadow-[0_0_30px_rgba(0,209,255,.2)]">
              {initials}
            </div>
            <span className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-[#39D353] rounded-full flex items-center justify-center border-2 border-[#081120] shadow-[0_0_8px_rgba(57,211,83,.5)]">
              <MdVerified size={12} className="text-[#081120]" />
            </span>
          </div>

          {/* Real user info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-[24px] font-extrabold text-[#F5F7FA] tracking-tight font-[Poppins,sans-serif] mb-1">
              {user.name}
            </h1>
            <p className="text-[12.5px] text-[#00D1FF] font-medium mb-1">{user.email}</p>
            {user.phone && (
              <p className="text-[11.5px] text-white/40 mb-2">{user.phone}</p>
            )}
            <p className="text-[11px] text-white/30 mb-3">Member since {memberSince}</p>

            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#39D353] bg-[#39D353]/10 border border-[#39D353]/25">
                ● Active
              </span>
              {settings?.guardian && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#00D1FF] bg-[#00D1FF]/10 border border-[#00D1FF]/25">
                  Guardian ON
                </span>
              )}
              {stats.reportsCount >= 5 && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#39D353] bg-[#39D353]/10 border border-[#39D353]/25">
                  Top Reporter
                </span>
              )}
              {user.role === "admin" && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#FFC857] bg-[#FFC857]/10 border border-[#FFC857]/25">
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Real stats + logout */}
          <div className="flex flex-col gap-3 flex-shrink-0">
            <div className="grid grid-cols-3 gap-3.5">
              {[
                { val: stats.avgScore,       lbl: "Avg Score" },
                { val: stats.totalJourneys,  lbl: "Journeys"  },
                { val: stats.reportsCount,   lbl: "Reports"   },
              ].map(({ val, lbl }) => (
                <div key={lbl} className="text-center px-4 py-3.5 bg-white/4 border border-white/6 rounded-xl">
                  <p className="text-[24px] font-extrabold text-[#39D353] font-[Poppins,sans-serif] drop-shadow-[0_0_20px_rgba(57,211,83,.3)]">
                    {dataLoading ? "—" : val}
                  </p>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{lbl}</p>
                </div>
              ))}
            </div>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D4D]/08 border border-[#FF4D4D]/20 text-[#FF4D4D] text-[12px] font-semibold hover:bg-[#FF4D4D]/15 transition-all cursor-pointer"
            >
              <MdLogout size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white/3 border border-white/6 rounded-xl p-1 mb-5 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-[12.5px] font-semibold font-[Poppins,sans-serif] transition-all duration-150 cursor-pointer border-0 tracking-wide ${
                activeTab === tab
                  ? "bg-[#00D1FF]/12 text-[#00D1FF] border border-[#00D1FF]/20"
                  : "bg-transparent text-white/40 hover:text-white/60"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Overview / History ─────────────────────────────────────────── */}
        {(activeTab === "overview" || activeTab === "history") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">

            {/* Journey list */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
              <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">
                Recent Journeys
              </p>

              {dataLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : journeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <MdRoute size={28} className="text-white/20" />
                  <p className="text-[12px] text-white/30">No journeys yet</p>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="mt-2 text-[11px] text-[#00D1FF] border border-[#00D1FF]/30 px-3 py-1.5 rounded-lg hover:bg-[#00D1FF]/08 transition-all"
                  >
                    Start navigating
                  </button>
                </div>
              ) : (
                journeys
                  .slice(0, activeTab === "overview" ? 4 : journeys.length)
                  .map((j) => (
                    <div key={j.id} className="flex items-center gap-3 p-2.5 rounded-xl mb-2 bg-white/2 border border-white/4 hover:bg-white/4 transition-all">
                      <div
                        className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-[13px] font-bold font-[Poppins,sans-serif] flex-shrink-0 border-2"
                        style={{ color: j.color, borderColor: `${j.color}40`, background: `${j.color}10` }}
                      >
                        {j.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-[#F5F7FA] truncate mb-0.5">
                          {j.from} → {j.to}
                        </p>
                        <p className="text-[10.5px] text-white/30">{j.date}</p>
                      </div>
                      <span className="text-[11px] text-white/35 flex-shrink-0">{j.distance}</span>
                    </div>
                  ))
              )}
            </div>

            {/* Safety trend */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
              <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">
                Safety Trend
              </p>

              <div className="h-40 bg-white/2 border border-white/4 rounded-xl flex items-end gap-2.5 px-4 pb-0 mb-4 overflow-hidden">
                {dataLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Skeleton className="h-20 w-full rounded" />
                  </div>
                ) : journeys.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[11px] text-white/20">
                    No data yet
                  </div>
                ) : (
                  journeys.slice(0, 6).slice().reverse().map((j, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center justify-end h-full"
                      title={`${j.from} → ${j.to}: ${j.score}`}
                    >
                      <div
                        className="w-full rounded-t-md border transition-all duration-500"
                        style={{
                          height:      `${Math.max(j.score * 1.3, 8)}px`,
                          background:  `linear-gradient(to top, ${j.color}90, ${j.color}30)`,
                          borderColor: `${j.color}40`,
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
              <p className="text-[11px] text-white/30 text-center mb-4">
                Last {Math.min(journeys.length, 6)} journeys
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Avg Safety Score",  val: dataLoading ? "—" : `${stats.avgScore}`      },
                  { label: "Total Journeys",     val: dataLoading ? "—" : `${stats.totalJourneys}` },
                  { label: "Reports Filed",      val: dataLoading ? "—" : `${stats.reportsCount}`  },
                  { label: "Guardian Mode",      val: settings?.guardian ? "ON" : "OFF"            },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-white/3 border border-white/5 rounded-xl p-2.5">
                    <p className="text-[18px] font-bold text-[#00D1FF] font-[Poppins,sans-serif]">{val}</p>
                    <p className="text-[9.5px] text-white/30 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Badges ─────────────────────────────────────────────────────── */}
        {activeTab === "badges" && (
          <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">
              Your Badges
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {badges.map((b) => (
                <div
                  key={b.label}
                  className={`flex flex-col items-center gap-1.5 px-2.5 py-3.5 rounded-xl text-center border transition-all ${
                    b.earned
                      ? "bg-[#39D353]/6 border-[#39D353]/20"
                      : "bg-white/2 border-white/5 opacity-50 grayscale-[60%]"
                  }`}
                >
                  <span className="text-2xl">{b.icon}</span>
                  <span className="text-[10.5px] font-semibold text-[#F5F7FA] font-[Poppins,sans-serif]">{b.label}</span>
                  <span className="text-[9px] text-white/35">{b.desc}</span>
                  {!b.earned && <span className="text-[9px] text-white/25">🔒 Locked</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Settings ───────────────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div className="space-y-4">

            {/* Toggle settings */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
              <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">
                Preferences & Safety Settings
              </p>

              {!settings ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              ) : (
                SETTINGS_DEF.map(({ key, label, sub, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between py-3.5 border-b border-white/4 last:border-0">
                    <div className="flex items-center gap-3">
                      <Icon size={16} className="text-white/40 flex-shrink-0" />
                      <div>
                        <p className="text-[13px] font-medium text-[#F5F7FA] mb-0.5">{label}</p>
                        <p className="text-[10.5px] text-white/35">{sub}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggle(key)}
                      disabled={!!savingKey}
                      className={`flex-shrink-0 cursor-pointer bg-transparent border-0 p-0 transition-opacity ${savingKey === key ? "opacity-50" : ""}`}
                    >
                      {settings[key]
                        ? <FiToggleRight size={28} className="text-[#39D353]" />
                        : <FiToggleLeft  size={28} className="text-white/20"  />
                      }
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Account info */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
              <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">
                Account
              </p>
              <div className="space-y-1">
                {[
                  { label: "Full Name",    val: user.name              },
                  { label: "Email",        val: user.email             },
                  { label: "Phone",        val: user.phone || "Not set"},
                  { label: "Member Since", val: memberSince            },
                  { label: "Role",         val: user.role              },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between items-center py-2.5 border-b border-white/4 last:border-0">
                    <span className="text-[11px] text-white/35 uppercase tracking-wider">{label}</span>
                    <span className="text-[13px] text-[#F5F7FA] font-medium">{val}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={logout}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF4D4D]/08 border border-[#FF4D4D]/20 text-[#FF4D4D] text-[13px] font-semibold hover:bg-[#FF4D4D]/15 transition-all cursor-pointer"
              >
                <MdLogout size={15} /> Sign Out
              </button>
            </div>
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
}