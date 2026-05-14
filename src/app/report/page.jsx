"use client";

import { useState } from "react";
import {
  MdLightbulb, MdLocalPolice, MdWarning, MdDirectionsCar,
  MdConstruction, MdListAlt, MdUpload, MdCheckCircle,
  MdThumbUp,
} from "react-icons/md";
import { FiMapPin } from "react-icons/fi";

const INCIDENT_TYPES = [
  { value: "lighting",     label: "Poor Lighting",          icon: MdLightbulb     },
  { value: "crime",        label: "Crime / Theft",          icon: MdLocalPolice   },
  { value: "harassment",   label: "Harassment",             icon: MdWarning       },
  { value: "accident",     label: "Accident / Hazard",      icon: MdDirectionsCar },
  { value: "construction", label: "Blocked / Construction", icon: MdConstruction  },
  { value: "other",        label: "Other Safety Issue",     icon: MdListAlt       },
];

const RECENT_REPORTS = [
  { label: "Poor Lighting",       location: "Vijay Nagar, near petrol pump",    time: "12 min ago", votes: 14, color: "#FFC857", icon: MdLightbulb   },
  { label: "Bag Snatching",       location: "Old Palasia, main road",            time: "1h ago",     votes: 8,  color: "#FF4D4D", icon: MdLocalPolice },
  { label: "Harassment Reported", location: "Nehru Nagar junction",              time: "2h ago",     votes: 22, color: "#FF4D4D", icon: MdWarning     },
  { label: "Road Blocked",        location: "Sapna Sangeeta Rd, near D-Mart",   time: "3h ago",     votes: 5,  color: "#FFC857", icon: MdConstruction},
];

const STATS = [
  { val: "342",  lbl: "Reports Today" },
  { val: "1.2K", lbl: "This Week"     },
  { val: "89%",  lbl: "Verified"      },
];

export default function ReportPage() {
  const [incidentType, setIncidentType] = useState("");
  const [description,  setDescription]  = useState("");
  const [location,     setLocation]     = useState("");
  const [severity,     setSeverity]     = useState("medium");
  const [submitted,    setSubmitted]    = useState(false);
  const [voted,        setVoted]        = useState({});

  const handleSubmit = () => {
    if (!incidentType || !description) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIncidentType(""); setDescription(""); setLocation(""); setSeverity("medium");
    }, 4000);
  };

  const SEV = [
    { k: "low",    label: "🟢 Low",    active: "bg-[#39D353]/12 border-[#39D353] text-[#39D353]",  inactive: "border-[#39D353]/25 text-[#39D353]/50"  },
    { k: "medium", label: "🟡 Medium", active: "bg-[#FFC857]/12 border-[#FFC857] text-[#FFC857]",  inactive: "border-[#FFC857]/25 text-[#FFC857]/50"  },
    { k: "high",   label: "🔴 High",   active: "bg-[#FF4D4D]/12 border-[#FF4D4D] text-[#FF4D4D]",  inactive: "border-[#FF4D4D]/25 text-[#FF4D4D]/50"  },
  ];

  return (
    <div className="min-h-screen bg-[#081120] pt-[100px] pb-16 text-[#F5F7FA] font-[Inter,sans-serif] relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{background:"radial-gradient(ellipse 600px 400px at 60% 30%,rgba(255,200,87,.04) 0%,transparent 70%)"}}
      />

      <div className="max-w-5xl mx-auto px-6 relative z-10">

        {/* Page header */}
        <div className="mb-7">
          <h1 className="text-[26px] font-extrabold text-[#F5F7FA] tracking-tight font-[Poppins,sans-serif]">
            Report an <span className="text-[#FFC857]">Incident</span>
          </h1>
          <p className="text-[13px] text-white/40 mt-1">Help keep your community safe — reports improve safety scores in real-time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">

          {/* Form */}
          <div className="bg-white/3 border border-white/7 rounded-2xl p-7">
            {submitted ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-[fadeIn_.4s_ease]">
                <MdCheckCircle size={56} className="text-[#39D353]" style={{animation:"bounceIn .5s cubic-bezier(.34,1.56,.64,1)"}} />
                <h2 className="text-[20px] font-bold text-[#39D353] font-[Poppins,sans-serif]">Report Submitted!</h2>
                <p className="text-[13px] text-white/45 max-w-[240px]">
                  Your incident report has been verified and added to the safety database. Safety scores are being updated.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">Incident Type</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
                  {INCIDENT_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setIncidentType(value)}
                      className={`flex flex-col items-center gap-1.5 px-2.5 py-3.5 rounded-xl text-[11.5px] border-[1.5px] cursor-pointer transition-all duration-150 text-center ${
                        incidentType === value
                          ? "bg-[#FFC857]/10 border-[#FFC857] text-[#FFC857] shadow-[0_0_12px_rgba(255,200,87,.15)]"
                          : "bg-white/3 border-white/7 text-white/50 hover:bg-[#FFC857]/5 hover:border-[#FFC857]/20 hover:text-white/80"
                      }`}
                    >
                      <Icon size={22} />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-white/35 tracking-[0.12em] uppercase mb-2">Location</label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Describe or auto-detect location…"
                      className="w-full bg-white/4 border border-white/9 rounded-xl pl-9 pr-4 py-2.5 text-[#F5F7FA] text-[13.5px] outline-none placeholder:text-white/25 focus:border-[#FFC857]/40 focus:bg-[#FFC857]/3 focus:shadow-[0_0_0_3px_rgba(255,200,87,.06)] transition-all"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-white/35 tracking-[0.12em] uppercase mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what happened in detail…"
                    className="w-full min-h-[90px] bg-white/4 border border-white/9 rounded-xl px-4 py-2.5 text-[#F5F7FA] text-[13.5px] outline-none placeholder:text-white/25 focus:border-[#FFC857]/40 focus:bg-[#FFC857]/3 transition-all resize-none"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-[11px] font-semibold text-white/35 tracking-[0.12em] uppercase mb-2">Severity</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SEV.map(({ k, label, active, inactive }) => (
                      <button
                        key={k}
                        onClick={() => setSeverity(k)}
                        className={`py-2 rounded-xl text-[11px] font-bold font-[Poppins,sans-serif] border-[1.5px] cursor-pointer transition-all text-center tracking-wider ${
                          severity === k ? active : inactive
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={!incidentType || !description}
                  onClick={handleSubmit}
                  className="w-full py-3.5 bg-gradient-to-br from-[#FFC857] to-[#e6a832] text-[#081120] font-bold font-[Poppins,sans-serif] text-[14px] rounded-xl tracking-wider shadow-[0_0_24px_rgba(255,200,87,.3)] hover:-translate-y-px hover:shadow-[0_0_36px_rgba(255,200,87,.45)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none border-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <MdUpload size={18} /> Submit Incident Report
                </button>
              </>
            )}
          </div>

          <div>
            <div className="grid grid-cols-3 gap-2.5 mb-3">
              {STATS.map(({ val, lbl }) => (
                <div key={lbl} className="bg-white/3 border border-white/5 rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-[#FFC857] font-[Poppins,sans-serif]">{val}</p>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{lbl}</p>
                </div>
              ))}
            </div>

            {/* Recent reports */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
              <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">Recent Reports Near You</p>
              {RECENT_REPORTS.map((r, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded-xl mb-2.5 bg-white/2 border border-white/4 hover:bg-white/4 transition-all">
                  <div
                    className="w-[34px] h-[34px] rounded-lg flex items-center justify-center flex-shrink-0 border"
                    style={{ background: `${r.color}15`, borderColor: `${r.color}30`, color: r.color }}
                  >
                    <r.icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] font-semibold font-[Poppins,sans-serif] mb-0.5" style={{ color: r.color }}>{r.label}</p>
                    <p className="text-[11px] text-white/40 mb-1.5">{r.location}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] text-white/25">{r.time}</span>
                      <button
                        onClick={() => setVoted((v) => ({ ...v, [i]: !v[i] }))}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border cursor-pointer transition-all ${
                          voted[i]
                            ? "bg-[#39D353]/10 border-[#39D353]/30 text-[#39D353]"
                            : "bg-white/5 border-white/8 text-white/40 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <MdThumbUp size={10} />
                        {r.votes + (voted[i] ? 1 : 0)}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn   { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        @keyframes bounceIn { from{transform:scale(0)}             to{transform:scale(1)}           }
      `}</style>
    </div>
  );
}