"use client";

import { MdCheckCircle, MdRadioButtonUnchecked } from "react-icons/md";
import { FiStar, FiAlertTriangle, FiZap, FiMapPin } from "react-icons/fi";
 
const SCORE_COLOR = (s) => s >= 80 ? "#39D353" : s >= 50 ? "#FFC857" : "#FF4D4D";
const SCORE_LABEL = (s) => s >= 80 ? "Safe"     : s >= 50 ? "Moderate" : "Unsafe";
const SCORE_BG    = (s) =>
  s >= 80 ? "rgba(57,211,83,0.08)"  :
  s >= 50 ? "rgba(255,200,87,0.08)" : "rgba(255,77,77,0.08)";
const SCORE_GLOW  = (s) =>
  s >= 80 ? "rgba(57,211,83,0.20)"  :
  s >= 50 ? "rgba(255,200,87,0.20)" : "rgba(255,77,77,0.20)";
const BAR_COLOR   = (v) =>
  v >= 70 ? "#39D353" : v >= 45 ? "#FFC857" : "#FF4D4D";

const DEFAULT_FACTORS = [
  { label: "Lighting",  value: 80, weight: 30 },
  { label: "Transit",   value: 70, weight: 20 },
  { label: "Amenities", value: 60, weight: 15 },
  { label: "Road Type", value: 80, weight: 10 },
  { label: "Barriers",  value: 40, weight: 10 },
  { label: "Incidents", value: 30, weight: 15 },
];

export default function RouteCard({ route, selected, onSelect }) {
  const color   = SCORE_COLOR(route.score);
  const label   = SCORE_LABEL(route.score);
  const factors = route.factors ?? DEFAULT_FACTORS;
 
  const CIRC = 138.2;
  const dash  = (route.score / 100) * CIRC;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-[1.5px] p-[18px] cursor-pointer
                 transition-all duration-200 font-[Inter,sans-serif]
                 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,.35)]"
      style={{
        background:   selected ? SCORE_BG(route.score) : "rgba(255,255,255,0.03)",
        borderColor:  selected ? color : "rgba(255,255,255,0.07)",
        boxShadow:    selected ? `0 0 24px ${SCORE_GLOW(route.score)}` : undefined,
      }}
      onClick={onSelect}
    > 

      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3">

          <div className="relative w-[52px] h-[52px] flex-shrink-0">
            <svg
              width="52" height="52" viewBox="0 0 52 52"
              className="absolute top-0 left-0 -rotate-90"
            >
              <circle cx="26" cy="26" r="22" fill="none"
                      stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
              <circle
                cx="26" cy="26" r="22" fill="none"
                stroke={color} strokeWidth="4"
                strokeDasharray={`${dash} ${CIRC}`}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center
                            text-[14px] font-bold font-[Poppins,sans-serif]"
                 style={{ color }}>
              {route.score}
            </div>
          </div>

          <div>
            <p className="text-[14px] font-semibold text-[#F5F7FA]
                          font-[Poppins,sans-serif] mb-0.5">
              {route.name}
            </p>
            <p className="text-[11.5px] text-white/45 flex items-center gap-1">
              <FiMapPin size={10} />
              {route.distance} km · {route.duration} min
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                       text-[10px] font-bold tracking-widest uppercase border"
            style={{ color, background: SCORE_BG(route.score), borderColor: color }}
          >
            ● {label}
          </span>

          {route.recommended && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                             text-[9px] font-bold tracking-widest uppercase
                             text-[#39D353] bg-[#39D353]/10 border border-[#39D353]/30
                             animate-pulse">
              <FiStar size={8} /> Best
            </span>
          )}
        </div>
      </div> 

      <div className="h-px bg-white/5 my-3" />
 
      <div className="flex flex-col gap-1.5">
        {factors.map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-[10.5px] text-white/45 w-[68px] flex-shrink-0">
              {f.label}
            </span>
            <div className="flex-1 h-1 bg-white/[0.06] rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-700"
                style={{
                  width:      `${f.value}%`,
                  background: BAR_COLOR(f.value),
                  opacity:    0.75,
                }}
              />
            </div>
            <span className="text-[10px] text-white/30 w-6 text-right flex-shrink-0">
              {f.value}
            </span>
          </div>
        ))}
      </div>
 
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          { icon: <FiAlertTriangle size={10} />, num: route.incidents  ?? 2,    lbl: "Incidents"    },
          { icon: <FiZap size={10} />,           num: route.lights     ?? "12", lbl: "Light Zones"  },
          { icon: <FiMapPin size={10} />,        num: route.stops      ?? "4",  lbl: "Transit Stops" },
        ].map(({ icon, num, lbl }) => (
          <div key={lbl}
               className="bg-white/[0.03] border border-white/[0.04] rounded-lg py-2 text-center">
            <p className="text-[13px] font-semibold text-[#F5F7FA]
                          font-[Poppins,sans-serif] flex items-center justify-center gap-1">
              <span className="text-white/30">{icon}</span> {num}
            </p>
            <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{lbl}</p>
          </div>
        ))}
      </div>
 
      <button
        className="mt-3.5 w-full py-2.5 rounded-xl border-[1.5px] text-[12px]
                   font-bold font-[Poppins,sans-serif] tracking-wider uppercase
                   cursor-pointer transition-all duration-200 flex items-center
                   justify-center gap-2"
        style={{
          borderColor: color,
          background:  selected ? color : "transparent",
          color:       selected ? "#081120" : color,
        }}
        onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
      >
        {selected
          ? <><MdCheckCircle size={14} /> Selected Route</>
          : <><MdRadioButtonUnchecked size={14} /> Select This Route</>
        }
      </button>
 
      {route.explanation && (
        <p className="mt-2.5 text-[10.5px] text-white/35 leading-relaxed line-clamp-2">
          🤖 {route.explanation}
        </p>
      )}
    </div>
  );
}