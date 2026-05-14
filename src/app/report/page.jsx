"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MdLightbulb, MdLocalPolice, MdWarning, MdDirectionsCar,
  MdConstruction, MdListAlt, MdUpload, MdCheckCircle,
  MdThumbUp, MdMyLocation, MdRefresh,
} from "react-icons/md";
import { FiMapPin, FiAlertTriangle } from "react-icons/fi";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const INCIDENT_TYPES = [
  { value: "lighting",      label: "Poor Lighting",          icon: MdLightbulb,    color: "#FFC857" },
  { value: "crime",         label: "Crime / Theft",          icon: MdLocalPolice,  color: "#FF4D4D" },
  { value: "harassment",    label: "Harassment",             icon: MdWarning,      color: "#FF4D4D" },
  { value: "accident",      label: "Accident / Hazard",      icon: MdDirectionsCar,color: "#FF4D4D" },
  { value: "construction",  label: "Blocked / Construction", icon: MdConstruction, color: "#FFC857" },
  { value: "other",         label: "Other Safety Issue",     icon: MdListAlt,      color: "#00D1FF" },
];

const SEV = [
  { k: "low",    label: "🟢 Low",    active: "bg-[#39D353]/12 border-[#39D353] text-[#39D353]",  inactive: "border-[#39D353]/25 text-[#39D353]/50"  },
  { k: "medium", label: "🟡 Medium", active: "bg-[#FFC857]/12 border-[#FFC857] text-[#FFC857]",  inactive: "border-[#FFC857]/25 text-[#FFC857]/50"  },
  { k: "high",   label: "🔴 High",   active: "bg-[#FF4D4D]/12 border-[#FF4D4D] text-[#FF4D4D]",  inactive: "border-[#FF4D4D]/25 text-[#FF4D4D]/50"  },
];

// Map incident type from API → local icon/color config
const TYPE_META = Object.fromEntries(INCIDENT_TYPES.map((t) => [t.value, t]));

// Relative time formatter
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Skeleton
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-white/8 rounded-lg ${className}`} />;
}

export default function ReportPage() {
  const { user } = useAuth();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [incidentType, setIncidentType] = useState("");
  const [description,  setDescription]  = useState("");
  const [location,     setLocation]     = useState("");
  const [severity,     setSeverity]     = useState("medium");
  const [anonymous,    setAnonymous]    = useState(false);

  // ── GPS state ──────────────────────────────────────────────────────────────
  const [coords,        setCoords]       = useState(null);  // { lat, lng }
  const [gpsLoading,    setGpsLoading]   = useState(false);
  const [gpsError,      setGpsError]     = useState("");

  // ── Submit state ───────────────────────────────────────────────────────────
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [submitError,  setSubmitError]  = useState("");

  // ── Nearby incidents ───────────────────────────────────────────────────────
  const [nearby,        setNearby]       = useState([]);
  const [nearbyLoading, setNearbyLoading]= useState(false);
  const [votedMap,      setVotedMap]     = useState({});   // incidentId → bool

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ today: "—", week: "—", verified: "—" });

  // ── Auto-detect GPS on mount ───────────────────────────────────────────────
  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        const lat = c.latitude;
        const lng = c.longitude;
        setCoords({ lat, lng });
        setGpsLoading(false);

        // Reverse geocode with Nominatim (free, no key needed)
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const addr = data.display_name?.split(",").slice(0, 3).join(", ") ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setLocation(addr);
        } catch {
          setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError("Could not detect location. Enter it manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => { detectGPS(); }, [detectGPS]);

  // ── Fetch nearby incidents whenever coords change ──────────────────────────
  const fetchNearby = useCallback(async (lat, lng) => {
    setNearbyLoading(true);
    try {
      const res  = await fetch(
        `/api/incidents?lat=${lat}&lng=${lng}&radius=2&limit=10`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setNearby(data.data.incidents ?? []);

        // Build stats from response
        const all     = data.data.incidents ?? [];
        const now     = Date.now();
        const todayMs = 24 * 60 * 60 * 1000;
        const weekMs  = 7  * todayMs;
        const todayCount    = all.filter((i) => now - new Date(i.createdAt) < todayMs).length;
        const weekCount     = all.filter((i) => now - new Date(i.createdAt) < weekMs).length;
        const verifiedCount = all.filter((i) => i.verified).length;
        const verifiedPct   = all.length ? Math.round((verifiedCount / all.length) * 100) : 0;

        setStats({
          today:    String(todayCount),
          week:     weekCount >= 1000 ? `${(weekCount / 1000).toFixed(1)}K` : String(weekCount),
          verified: `${verifiedPct}%`,
        });
      }
    } catch (err) {
      console.error("Failed to load nearby incidents:", err);
    } finally {
      setNearbyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (coords) fetchNearby(coords.lat, coords.lng);
  }, [coords, fetchNearby]);

  // ── Submit incident ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!incidentType || !description.trim()) return;
    if (!coords) {
      setSubmitError("Location is required. Please enable GPS or enter it manually.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res  = await fetch("/api/incidents", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type:        incidentType,
          lat:         coords.lat,
          lng:         coords.lng,
          description: description.trim(),
          severity,
          anonymous:   anonymous || !user,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSubmitError(data.error ?? "Submission failed. Please try again.");
        return;
      }

      setSubmitted(true);

      // Refresh nearby list
      if (coords) fetchNearby(coords.lat, coords.lng);

      // Auto-reset form after 4s
      setTimeout(() => {
        setSubmitted(false);
        setIncidentType("");
        setDescription("");
        setSeverity("medium");
        setAnonymous(false);
        setSubmitError("");
      }, 4000);
    } catch (err) {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Vote on incident ───────────────────────────────────────────────────────
  const handleVote = async (incidentId) => {
    // Optimistic toggle
    const prev    = votedMap[incidentId] ?? false;
    const delta   = prev ? -1 : 1;
    setVotedMap((v) => ({ ...v, [incidentId]: !prev }));
    setNearby((list) =>
      list.map((i) => i._id === incidentId ? { ...i, votes: (i.votes ?? 0) + delta } : i)
    );

    try {
      const res  = await fetch("/api/incidents/vote", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ incidentId }),
      });
      const data = await res.json();

      if (data.success) {
        // Sync actual server vote count
        setVotedMap((v) => ({ ...v, [incidentId]: data.voted }));
        setNearby((list) =>
          list.map((i) => i._id === incidentId ? { ...i, votes: data.votes } : i)
        );
      } else {
        // Revert on failure
        setVotedMap((v) => ({ ...v, [incidentId]: prev }));
        setNearby((list) =>
          list.map((i) => i._id === incidentId ? { ...i, votes: (i.votes ?? 0) - delta } : i)
        );
      }
    } catch {
      // Revert on error
      setVotedMap((v) => ({ ...v, [incidentId]: prev }));
      setNearby((list) =>
        list.map((i) => i._id === incidentId ? { ...i, votes: (i.votes ?? 0) - delta } : i)
      );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#081120] pt-[100px] pb-16 text-[#F5F7FA] font-[Inter,sans-serif] relative">
      <Header />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 600px 400px at 60% 30%,rgba(255,200,87,.04) 0%,transparent 70%)" }}
      />

      <div className="max-w-5xl mx-auto px-6 relative z-10">

        {/* ── Page heading ───────────────────────────────────────────────── */}
        <div className="mb-7">
          <h1 className="text-[26px] font-extrabold text-[#F5F7FA] tracking-tight font-[Poppins,sans-serif]">
            Report an <span className="text-[#FFC857]">Incident</span>
          </h1>
          <p className="text-[13px] text-white/40 mt-1">
            Help keep your community safe — reports improve safety scores in real-time
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">

          {/* ── LEFT — Report form ─────────────────────────────────────── */}
          <div className="bg-white/3 border border-white/7 rounded-2xl p-7">

            {submitted ? (
              /* Success state */
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center"
                   style={{ animation: "fadeIn .4s ease" }}>
                <MdCheckCircle size={56} className="text-[#39D353]"
                  style={{ animation: "bounceIn .5s cubic-bezier(.34,1.56,.64,1)" }} />
                <h2 className="text-[20px] font-bold text-[#39D353] font-[Poppins,sans-serif]">
                  Report Submitted!
                </h2>
                <p className="text-[13px] text-white/45 max-w-[260px]">
                  Your incident has been verified and added to the safety database. Scores are being updated.
                </p>
              </div>
            ) : (
              <>
                {/* Incident type grid */}
                <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase mb-4 font-[Poppins,sans-serif]">
                  Incident Type
                </p>
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

                {/* Location field */}
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-white/35 tracking-[0.12em] uppercase mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black" size={14} />
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={gpsLoading ? "Detecting your location…" : "Describe or auto-detect location…"}
                      className="w-full bg-white/4 border border-white/9 rounded-xl pl-9 pr-[44px] py-2.5 text-black text-[13.5px] outline-none placeholder:text-white/25 focus:border-[#FFC857]/40 focus:bg-[#FFC857]/3 transition-all"
                    />
                    {/* GPS detect button */}
                    <button
                      onClick={detectGPS}
                      disabled={gpsLoading}
                      title="Auto-detect location"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#FFC857] transition-colors bg-transparent border-0 cursor-pointer disabled:opacity-40"
                    >
                      {gpsLoading
                        ? <span className="text-[10px] text-[#FFC857] animate-pulse">…</span>
                        : <MdMyLocation size={16} />
                      }
                    </button>
                  </div>

                  {/* GPS status messages */}
                  {gpsError && (
                    <p className="text-[10.5px] text-[#FF4D4D]/80 mt-1.5 flex items-center gap-1">
                      <FiAlertTriangle size={11} /> {gpsError}
                    </p>
                  )}
                  {coords && !gpsError && (
                    <p className="text-[10px] text-[#39D353]/70 mt-1.5">
                      📍 GPS locked · {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-white/35 tracking-[0.12em] uppercase mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what happened in detail…"
                    className="w-full min-h-[90px] bg-white/4 border border-white/9 rounded-xl px-4 py-2.5 text-black text-[13.5px] outline-none placeholder:text-white/25 focus:border-[#FFC857]/40 focus:bg-[#FFC857]/3 transition-all resize-none"
                  />
                  <p className="text-[10px] text-white/20 mt-1 text-right">{description.length}/500</p>
                </div>

                {/* Severity */}
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-white/35 tracking-[0.12em] uppercase mb-2">
                    Severity
                  </label>
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

                {/* Anonymous toggle */}
                <div className="mb-6 flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/2 border border-white/6">
                  <div>
                    <p className="text-[12.5px] font-medium text-[#F5F7FA]">Report Anonymously</p>
                    <p className="text-[10.5px] text-white/35">Your identity will be hidden from public view</p>
                  </div>
                  <button
                    onClick={() => setAnonymous((v) => !v)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer border-0 flex-shrink-0 ${
                      anonymous ? "bg-[#FFC857]" : "bg-white/15"
                    }`}
                    style={{ width: 40, height: 22 }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{ left: anonymous ? 20 : 2, width: 18, height: 18 }}
                    />
                  </button>
                </div>

                {/* Error message */}
                {submitError && (
                  <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FF4D4D]/08 border border-[#FF4D4D]/20 text-[#FF4D4D] text-[12px]">
                    <FiAlertTriangle size={13} className="flex-shrink-0" />
                    {submitError}
                  </div>
                )}

                {/* Submit button */}
                <button
                  disabled={!incidentType || !description.trim() || submitting}
                  onClick={handleSubmit}
                  className="w-full py-3.5 bg-gradient-to-br from-[#FFC857] to-[#e6a832] text-[#081120] font-bold font-[Poppins,sans-serif] text-[14px] rounded-xl tracking-wider shadow-[0_0_24px_rgba(255,200,87,.3)] hover:-translate-y-px hover:shadow-[0_0_36px_rgba(255,200,87,.45)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none border-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <span className="animate-pulse">Submitting…</span>
                  ) : (
                    <><MdUpload size={18} /> Submit Incident Report</>
                  )}
                </button>
              </>
            )}
          </div>

          {/* ── RIGHT — Stats + nearby incidents ──────────────────────── */}
          <div>

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-2.5 mb-3">
              {[
                { val: stats.today,    lbl: "Reports Today" },
                { val: stats.week,     lbl: "This Week"     },
                { val: stats.verified, lbl: "Verified"      },
              ].map(({ val, lbl }) => (
                <div key={lbl} className="bg-white/3 border border-white/5 rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-[#FFC857] font-[Poppins,sans-serif]">{val}</p>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{lbl}</p>
                </div>
              ))}
            </div>

            {/* Nearby incidents panel */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] font-semibold text-white/30 tracking-[0.12em] uppercase font-[Poppins,sans-serif]">
                  Recent Reports Near You
                </p>
                <button
                  onClick={() => coords && fetchNearby(coords.lat, coords.lng)}
                  disabled={nearbyLoading || !coords}
                  className="text-white/30 hover:text-[#FFC857] transition-colors bg-transparent border-0 cursor-pointer disabled:opacity-30"
                  title="Refresh"
                >
                  <MdRefresh size={16} className={nearbyLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {nearbyLoading ? (
                <div className="space-y-2.5">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
                </div>
              ) : !coords ? (
                <div className="flex flex-col items-center py-8 gap-2 text-center">
                  <FiMapPin size={22} className="text-white/20" />
                  <p className="text-[12px] text-white/30">Enable GPS to see nearby incidents</p>
                  <button
                    onClick={detectGPS}
                    className="mt-1 text-[11px] text-[#FFC857] border border-[#FFC857]/30 px-3 py-1.5 rounded-lg hover:bg-[#FFC857]/08 transition-all bg-transparent cursor-pointer"
                  >
                    Detect my location
                  </button>
                </div>
              ) : nearby.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2 text-center">
                  <MdCheckCircle size={22} className="text-[#39D353]/50" />
                  <p className="text-[12px] text-white/30">No incidents reported nearby</p>
                  <p className="text-[10.5px] text-white/20">within 2 km in the last 7 days</p>
                </div>
              ) : (
                nearby.map((r) => {
                  const meta    = TYPE_META[r.type] ?? TYPE_META["other"];
                  const Icon    = meta.icon;
                  const color   = r.severity === "high" ? "#FF4D4D" : r.severity === "low" ? "#39D353" : meta.color;
                  const isVoted = votedMap[r._id] ?? false;

                  return (
                    <div key={r._id} className="flex gap-3 items-start p-3 rounded-xl mb-2.5 bg-white/2 border border-white/4 hover:bg-white/4 transition-all">
                      <div
                        className="w-[34px] h-[34px] rounded-lg flex items-center justify-center flex-shrink-0 border"
                        style={{ background: `${color}15`, borderColor: `${color}30`, color }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-[11.5px] font-semibold font-[Poppins,sans-serif] truncate" style={{ color }}>
                            {meta.label}
                          </p>
                          {r.verified && (
                            <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-[#39D353]/10 text-[#39D353] border border-[#39D353]/20 flex-shrink-0">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/40 mb-1.5 truncate">
                          {r.location?.address || `${r.location?.lat?.toFixed(4)}, ${r.location?.lng?.toFixed(4)}`}
                        </p>
                        {r.description && (
                          <p className="text-[10.5px] text-white/30 mb-1.5 line-clamp-1">{r.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] text-white/25">{timeAgo(r.createdAt)}</span>
                          <button
                            onClick={() => handleVote(r._id)}
                            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border cursor-pointer transition-all bg-transparent ${
                              isVoted
                                ? "bg-[#39D353]/10 border-[#39D353]/30 text-[#39D353]"
                                : "border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <MdThumbUp size={10} />
                            {r.votes ?? 0}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn   { from { opacity: 0; transform: scale(.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounceIn { from { transform: scale(0); }              to { transform: scale(1); }              }
      `}</style>

      <Footer />
    </div>
  );
}