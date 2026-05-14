"use client";

import { useState, useEffect } from "react";
import {
  FiShield, FiAlertTriangle, FiAlertOctagon,
  FiSun, FiMoon, FiSunset, FiRefreshCw,
} from "react-icons/fi";
import {
  MdLightbulbOutline, MdDirectionsBus, MdStorefront,
  MdRoad, MdBlock, MdWarningAmber,
} from "react-icons/md";

const band = (score) =>
  score >= 80
    ? { label: "Safe",     color: "#39D353", glow: "rgba(57,211,83,0.22)",  border: "rgba(57,211,83,0.25)",  bg: "rgba(57,211,83,0.07)",  Icon: FiShield }
    : score >= 50
    ? { label: "Moderate", color: "#FFC857", glow: "rgba(255,200,87,0.22)", border: "rgba(255,200,87,0.25)", bg: "rgba(255,200,87,0.07)", Icon: FiAlertTriangle }
    : { label: "Unsafe",   color: "#FF4D4D", glow: "rgba(255,77,77,0.22)",  border: "rgba(255,77,77,0.25)",  bg: "rgba(255,77,77,0.07)",  Icon: FiAlertOctagon };

const barColor = (v) => v >= 70 ? "#39D353" : v >= 45 ? "#FFC857" : "#FF4D4D";

const FACTOR_META = {
  lighting:  { label: "Lighting",   Icon: MdLightbulbOutline },
  transit:   { label: "Transit",    Icon: MdDirectionsBus    },
  amenities: { label: "Amenities",  Icon: MdStorefront       },
  roadType:  { label: "Road Type",  Icon: MdRoad             },
  barriers:  { label: "Isolation",  Icon: MdBlock            },
  incidents: { label: "Incidents",  Icon: MdWarningAmber     },
};

const TIME_ICONS = { morning: FiSun, afternoon: FiSun, evening: FiSunset, night: FiMoon };

function RingVariant({ score, size = "md", showLabel = true, animate = false }) {
  const b    = band(score);
  const dim  = size === "sm" ? 48 : size === "lg" ? 88 : 64;
  const r    = size === "sm" ? 18 : size === "lg" ? 34 : 26;
  const sw   = size === "sm" ? 3  : size === "lg" ? 5  : 4;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const fs   = size === "sm" ? "text-[11px]" : size === "lg" ? "text-[24px]" : "text-[16px]";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex-shrink-0" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className="-rotate-90">
          <circle cx={dim/2} cy={dim/2} r={r} fill="none"
                  stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
          <circle
            cx={dim/2} cy={dim/2} r={r} fill="none"
            stroke={b.color} strokeWidth={sw}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className={animate ? "transition-all duration-1000" : ""}
            style={{ filter: `drop-shadow(0 0 5px ${b.color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${fs} font-bold font-[Poppins,sans-serif]`} style={{ color: b.color }}>
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase
                         tracking-widest border"
              style={{ color: b.color, background: b.bg, borderColor: b.border }}>
          {b.label}
        </span>
      )}
    </div>
  );
}

function BarVariant({ score, breakdown = {}, compact = false, timePeriod }) {
  const b = band(score);
  const TimeIcon = timePeriod ? (TIME_ICONS[timePeriod] ?? FiSun) : null;

  return (
    <div className="flex flex-col gap-2 font-[Inter,sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white/60">Safety Score</span>
          {TimeIcon && (
            <span className="flex items-center gap-1 text-[10px] text-white/30 capitalize">
              <TimeIcon size={10} /> {timePeriod}
            </span>
          )}
        </div>
        <span className="text-[18px] font-bold font-[Poppins,sans-serif]" style={{ color: b.color }}>
          {score}<span className="text-[11px] text-white/30">/100</span>
        </span>
      </div>

      {/* Master bar */}
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
             style={{
               width:     `${score}%`,
               background:`linear-gradient(90deg, ${b.color}, ${b.color}99)`,
               boxShadow: `0 0 8px ${b.color}60`,
             }} />
      </div>

      {!compact && Object.keys(FACTOR_META).length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          {Object.entries(FACTOR_META).map(([key, meta]) => {
            const val = breakdown[key] ?? 0;
            const FactorIcon = meta.Icon;
            return (
              <div key={key} className="flex items-center gap-2">
                <FactorIcon size={11} className="text-white/25 flex-shrink-0" />
                <span className="text-[10px] text-white/35 w-[68px] flex-shrink-0">{meta.label}</span>
                <div className="flex-1 h-1 bg-white/[0.05] rounded-sm overflow-hidden">
                  <div className="h-full rounded-sm transition-all duration-700"
                       style={{ width: `${val}%`, background: barColor(val), opacity: 0.8 }} />
                </div>
                <span className="text-[9px] text-white/25 w-5 text-right">{val}</span>
              </div>
            );
          })}
        </div>
      )}

      <span className="self-start mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold
                       uppercase tracking-wide border"
            style={{ color: b.color, background: b.bg, borderColor: b.border }}>
        <b.Icon size={10} className="inline mr-1" />
        {b.label}
      </span>
    </div>
  );
}

function BadgeVariant({ score, pulse = false }) {
  const b = band(score);
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border
                     font-[Inter,sans-serif] text-[12px] font-semibold
                     ${pulse ? "animate-pulse" : ""}`}
         style={{ color: b.color, background: b.bg, borderColor: b.border,
                  boxShadow: `0 0 10px ${b.glow}` }}>
      <b.Icon size={12} />
      <span>{score}/100</span>
      <span className="text-[10px] opacity-60">· {b.label}</span>
    </div>
  );
}

function PanelVariant({ lat, lng, initialScore }) {
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchScore = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/safety/score?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setReport(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lat && lng) fetchScore();
  }, [lat, lng]);

  const score = report?.score ?? initialScore ?? 0;
  const b     = band(score);
  const TimeIcon = report?.timePeriod ? (TIME_ICONS[report.timePeriod] ?? FiSun) : FiSun;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5
                    font-[Inter,sans-serif] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-white/40 uppercase tracking-[0.12em]">
            Live Safety Score
          </span>
          {report?.timePeriod && (
            <span className="flex items-center gap-1 text-[10px] text-white/25 capitalize">
              <TimeIcon size={9} /> {report.timePeriod}
            </span>
          )}
        </div>
        <button onClick={fetchScore}
                className="w-7 h-7 flex items-center justify-center rounded-lg
                           bg-white/[0.04] border border-white/[0.08] text-white/30
                           hover:border-[#00D1FF]/30 hover:text-[#00D1FF] transition-all">
          <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && !report && (
        <div className="flex items-center gap-2 text-white/30 text-[12px]">
          <FiRefreshCw size={13} className="animate-spin" /> Analysing location…
        </div>
      )}

      {error && (
        <div className="text-[11.5px] text-[#FF4D4D]/80 bg-[#FF4D4D]/05
                        border border-[#FF4D4D]/15 rounded-lg px-3 py-2">
          ⚠ {error}
        </div>
      )}

      {report && (
        <>
          <div className="flex items-center gap-4">
            <RingVariant score={score} size="lg" showLabel={false} animate />
            <div className="flex-1">
              <p className="text-[28px] font-bold font-[Poppins,sans-serif]"
                 style={{ color: b.color, textShadow: `0 0 20px ${b.glow}` }}>
                {score}
                <span className="text-[14px] text-white/30 font-normal">/100</span>
              </p>
              <p className="text-[13px] font-semibold" style={{ color: b.color }}>{b.label}</p>
              <p className="text-[11px] text-white/30 mt-0.5 leading-relaxed line-clamp-2">
                {report.explanation}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {Object.entries(FACTOR_META).map(([key, meta]) => {
              const val = report.breakdown?.[key] ?? 0;
              const FactorIcon = meta.Icon;
              return (
                <div key={key} className="flex items-center gap-2">
                  <FactorIcon size={11} className="text-white/20 flex-shrink-0" />
                  <span className="text-[10px] text-white/35 w-[68px] flex-shrink-0">{meta.label}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                         style={{ width: `${val}%`, background: barColor(val), opacity: 0.85 }} />
                  </div>
                  <span className="text-[9.5px] text-white/25 w-6 text-right">{val}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Traffic Risk",   val: report.riskBreakdown?.trafficRisk  ?? 0 },
              { label: "Crime Risk",     val: report.riskBreakdown?.crimeRisk    ?? 0 },
              { label: "Lighting Risk",  val: report.riskBreakdown?.lightingRisk ?? 0 },
              { label: "Time Risk",      val: report.riskBreakdown?.timeRisk     ?? 0 },
            ].map((r) => {
              const rc = r.val >= 60 ? "#FF4D4D" : r.val >= 35 ? "#FFC857" : "#39D353";
              return (
                <div key={r.label}
                     className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                  <p className="text-[10px] text-white/30 mb-0.5">{r.label}</p>
                  <p className="text-[15px] font-bold font-[Poppins,sans-serif]" style={{ color: rc }}>
                    {r.val}
                    <span className="text-[9px] text-white/25">/100</span>
                  </p>
                </div>
              );
            })}
          </div>

          {report.incidentCount > 0 && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                            bg-[#FFC857]/07 border border-[#FFC857]/20">
              <FiAlertTriangle size={14} className="text-[#FFC857] flex-shrink-0" />
              <div>
                <p className="text-[11.5px] font-semibold text-[#FFC857]">
                  {report.incidentCount} incident{report.incidentCount > 1 ? "s" : ""} nearby
                </p>
                <p className="text-[10px] text-white/35">
                  {Object.entries(report.incidentSummary ?? {})
                    .map(([t, c]) => `${c} ${t}`)
                    .join(" · ")}
                </p>
              </div>
            </div>
          )}

          {report.hotspots?.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.12em]">
                High-Risk Hotspots
              </p>
              {report.hotspots.slice(0, 3).map((h, i) => (
                <div key={i}
                     className="flex items-center gap-2 text-[11px] text-[#FF4D4D]/80
                                bg-[#FF4D4D]/05 border border-[#FF4D4D]/12 rounded-lg px-3 py-1.5">
                  <FiAlertOctagon size={11} />
                  <span className="capitalize">{h.type.replace("_", " ")}</span>
                  <span className="ml-auto text-white/20 text-[9px]">
                    {h.lat.toFixed(3)}, {h.lng.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[9px] text-white/20 text-right">
            Analysed {new Date(report.analyzedAt).toLocaleTimeString()}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * @param {number}                  score      
 * @param {"ring"|"bar"|"badge"|"panel"} variant
 * @param {object}                  breakdown 
 * @param {string}                  timePeriod 
 * @param {"sm"|"md"|"lg"}          size        
 * @param {boolean}                 showLabel
 * @param {boolean}                 compact    
 * @param {boolean}                 pulse     
 * @param {boolean}                 animate    
 * @param {number}                  lat        
 * @param {number}                  lng       
 * @param {string}                  className
 */
export default function RiskIndicator({
  score      = 0,
  variant    = "ring",
  breakdown  = {},
  timePeriod,
  size       = "md",
  showLabel  = true,
  compact    = false,
  pulse      = false,
  animate    = false,
  lat,
  lng,
  className  = "",
}) {
  return (
    <div className={className}>
      {variant === "ring"  && <RingVariant  score={score} size={size} showLabel={showLabel} animate={animate} />}
      {variant === "bar"   && <BarVariant   score={score} breakdown={breakdown} compact={compact} timePeriod={timePeriod} />}
      {variant === "badge" && <BadgeVariant score={score} pulse={pulse} />}
      {variant === "panel" && <PanelVariant lat={lat} lng={lng} initialScore={score} />}
    </div>
  );
}