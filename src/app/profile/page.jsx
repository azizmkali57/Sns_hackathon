"use client";
import { useState } from "react";
import {
  MdVerified, MdShield, MdRoute, MdReport,
  MdNotifications, MdSecurity, MdSos, MdWhatsapp, MdVisibility, MdPerson,
} from "react-icons/md";
import { FiBell, FiToggleLeft, FiToggleRight } from "react-icons/fi";

const JOURNEY_HISTORY = [
  { from: "My Location",  to: "Rajwada, Indore",    score: 87, date: "Today, 10:45 PM",      distance: "4.2km", color: "#39D353" },
  { from: "Vijay Nagar",  to: "Palasia Square",     score: 64, date: "Yesterday, 8:12 PM",   distance: "2.8km", color: "#FFC857" },
  { from: "My Location",  to: "DB Mall",             score: 91, date: "May 6, 7:30 PM",       distance: "3.1km", color: "#39D353" },
  { from: "Old Palasia",  to: "Sapna Sangeeta",     score: 42, date: "May 5, 11:15 PM",      distance: "1.9km", color: "#FF4D4D" },
];

const BADGES = [
  { icon: "🛡️", label: "Safety First",    desc: "Chose safest route 10x",    earned: true  },
  { icon: "🆘", label: "SOS Ready",       desc: "Contacts configured",        earned: true  },
  { icon: "📍", label: "Reporter",        desc: "Submitted 5 incidents",      earned: true  },
  { icon: "🌙", label: "Night Guardian",  desc: "Navigated after 10 PM",      earned: true  },
  { icon: "⭐", label: "Trusted User",    desc: "100+ verified reports",      earned: false },
  { icon: "🏆", label: "Community Hero", desc: "Top reporter in area",       earned: false },
];

const SETTINGS = [
  { key: "notifications", label: "Risk Alert Notifications",  sub: "Audio + visual warnings on route",  icon: FiBell        },
  { key: "guardian",      label: "Auto-Guardian Mode",        sub: "Share location when journey starts", icon: MdShield      },
  { key: "sosAuto",       label: "SOS Auto-Contact",          sub: "Send SMS when SOS triggered",        icon: MdSos         },
  { key: "whatsapp",      label: "WhatsApp Backup SOS",       sub: "Backup message via WhatsApp",        icon: MdWhatsapp    },
  { key: "crowdsource",   label: "Anonymous Reporting",       sub: "Hide identity in incident reports",  icon: MdVisibility  },
];

const TABS = ["overview", "history", "badges", "settings"];

export default function ProfilePage() {
  const [settings,  setSettings]  = useState({ notifications: true, guardian: true, sosAuto: true, whatsapp: true, crowdsource: false });
  const [activeTab, setActiveTab] = useState("overview");

  const toggle = (k) => setSettings((s) => ({ ...s, [k]: !s[k] }));
  const avgScore = Math.round(JOURNEY_HISTORY.reduce((s, j) => s + j.score, 0) / JOURNEY_HISTORY.length);

  return (
    /* pt-[100px] = header(64) + status-bar(~36) */
    <div className="min-h-screen bg-[#081120] pt-[100px] pb-16 text-[#F5F7FA] font-[Inter,sans-serif] relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{background:"radial-gradient(ellipse 700px 500px at 50% 20%,rgba(0,209,255,.04) 0%,transparent 70%)"}}
      />

      <div className="max-w-5xl mx-auto px-6 relative z-10">

        {/* Hero card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#00D1FF]/6 to-[#39D353]/4 border border-[#00D1FF]/15 rounded-3xl p-8 flex flex-col md:flex-row items-center md:items-start gap-7 mb-5">
          <div className="absolute top-[-60px] right-[-60px] w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(0,209,255,.08),transparent)] pointer-events-none" />

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-[90px] h-[90px] rounded-full bg-gradient-to-br from-[#00D1FF]/13 to-[#39D353]/13 border-2 border-[#00D1FF]/30 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(0,209,255,.2)]">
              <MdPerson size={50} className="text-white/60" />
            </div>
            <span className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-[#39D353] rounded-full flex items-center justify-center border-2 border-[#081120] shadow-[0_0_8px_rgba(57,211,83,.5)]">
              <MdVerified size={12} className="text-[#081120]" />
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-[24px] font-extrabold text-[#F5F7FA] tracking-tight font-[Poppins,sans-serif] mb-1">Aditya Sharma</h1>
            <p className="text-[12.5px] text-[#00D1FF] font-medium mb-3">Verified SafeRoute User · Indore, MP</p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#39D353] bg-[#39D353]/10 border border-[#39D353]/25">● Active</span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#00D1FF] bg-[#00D1FF]/10 border border-[#00D1FF]/25">Guardian ON</span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#39D353] bg-[#39D353]/10 border border-[#39D353]/25">Top Reporter</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3.5 flex-shrink-0">
            {[
              { val: avgScore, lbl: "Avg Safety Score" },
              { val: 48,       lbl: "Journeys"         },
              { val: 12,       lbl: "Reports Filed"    },
            ].map(({ val, lbl }) => (
              <div key={lbl} className="text-center px-4 py-3.5 bg-white/4 border border-white/6 rounded-xl">
                <p className="text-[24px] font-extrabold text-[#39D353] font-[Poppins,sans-serif] drop-shadow-[0_0_20px_rgba(57,211,83,.3)]">{val}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
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

        {/* Content */}
        {(activeTab === "overview" || activeTab === "history") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">

            {/* Journey list */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
              <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">Recent Journeys</p>
              {JOURNEY_HISTORY.map((j, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl mb-2 bg-white/2 border border-white/4 hover:bg-white/4 transition-all">
                  <div
                    className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-[13px] font-bold font-[Poppins,sans-serif] flex-shrink-0 border-2"
                    style={{ color: j.color, borderColor: `${j.color}40`, background: `${j.color}10` }}
                  >
                    {j.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-[#F5F7FA] truncate mb-0.5">{j.from} → {j.to}</p>
                    <p className="text-[10.5px] text-white/30">{j.date}</p>
                  </div>
                  <span className="text-[11px] text-white/35 flex-shrink-0">{j.distance}</span>
                </div>
              ))}
            </div>

            {/* Safety trend */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
              <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">Safety Trend</p>

              <div className="h-40 bg-white/2 border border-white/4 rounded-xl flex items-end gap-2.5 px-4 pb-0 mb-4 overflow-hidden">
                {JOURNEY_HISTORY.slice().reverse().map((j, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full pb-0">
                    <div
                      className="w-full rounded-t-md border"
                      style={{
                        height: `${j.score * 1.3}px`,
                        background: `linear-gradient(to top, ${j.color}90, ${j.color}30)`,
                        borderColor: `${j.color}40`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-white/30 text-center mb-4">Last 4 journeys</p>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Safest Route Chosen", val: "87%" },
                  { label: "Incidents Avoided",   val: "23"  },
                  { label: "Total Distance",       val: "12km"},
                  { label: "Alerts Received",      val: "9"   },
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

        {activeTab === "badges" && (
          <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">Your Badges</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {BADGES.map((b) => (
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

        {activeTab === "settings" && (
          <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">Preferences & Safety Settings</p>
            {SETTINGS.map(({ key, label, sub, icon: Icon }) => (
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
                  className="flex-shrink-0 cursor-pointer bg-transparent border-0 p-0"
                >
                  {settings[key]
                    ? <FiToggleRight size={28} className="text-[#39D353]" />
                    : <FiToggleLeft  size={28} className="text-white/20"  />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}