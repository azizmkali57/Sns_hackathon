"use client";
// components/Home/RouteCard.jsx
// Fixed: field names now match what /api/routes/create returns

import { FiShield, FiAlertTriangle, FiAlertOctagon, FiClock, FiMapPin } from "react-icons/fi";
import { MdAddRoad, MdBlock, MdDirectionsBus, MdLightbulbOutline, MdStorefront, MdWarningAmber } from "react-icons/md";
// import {
//   MdLightbulbOutline, MdDirectionsBus, MdStorefront,
//   MdRoad, MdBlock, MdWarningAmber,
// } from "react-icons/md";

/* ── Safety band helper ─────────────────────────────────────── */
function band(score) {
  if (score >= 75) return { label: "SAFE",     color: "#39D353", bg: "rgba(57,211,83,0.08)",   border: "rgba(57,211,83,0.25)",  glow: "rgba(57,211,83,0.18)",  Icon: FiShield        };
  if (score >= 50) return { label: "MODERATE", color: "#FFC857", bg: "rgba(255,200,87,0.08)",  border: "rgba(255,200,87,0.25)", glow: "rgba(255,200,87,0.18)", Icon: FiAlertTriangle };
  return             { label: "UNSAFE",   color: "#FF4D4D", bg: "rgba(255,77,77,0.08)",    border: "rgba(255,77,77,0.25)",  glow: "rgba(255,77,77,0.18)",  Icon: FiAlertOctagon  };
}

const barColor = (v) => v >= 70 ? "#39D353" : v >= 45 ? "#FFC857" : "#FF4D4D";

/* Factor rows shown inside each card */
const FACTORS = [
  { key: "lighting",  label: "Lighting",  Icon: MdLightbulbOutline },
  { key: "transit",   label: "Transit",   Icon: MdDirectionsBus    },
  { key: "amenities", label: "Amenities", Icon: MdStorefront       },
  { key: "roadType",  label: "Road Type", Icon: MdAddRoad          },
  { key: "barriers",  label: "Barriers",  Icon: MdBlock            },
  { key: "incidents", label: "Incidents", Icon: MdWarningAmber     },
];

/* ── Ring SVG ───────────────────────────────────────────────── */
function Ring({ score, color }) {
  const r    = 26, sw = 4, dim = 64;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(score, 100) / 100 * circ;
  return (
    <div className="relative flex-shrink-0" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}
           style={{ transform: "rotate(-90deg)" }}>
        <circle cx={dim/2} cy={dim/2} r={r} fill="none"
                stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={dim/2} cy={dim/2} r={r} fill="none"
                stroke={color} strokeWidth={sw}
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray .8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "Poppins,sans-serif", fontSize: 15, fontWeight: 700, color, lineHeight: 1 }}>
          {score}
        </span>
      </div>
    </div>
  );
}

/* ── RouteCard ──────────────────────────────────────────────── */
export default function RouteCard({ route, selected, onSelect }) {
  /*
   * API shape (from /api/routes/create):
   *   route.score          → overall safety 0–100
   *   route.safetyLabel    → "SAFE" | "MODERATE" | "UNSAFE"
   *   route.distanceKm     → number  e.g. 16.4
   *   route.durationMin    → number  e.g. 20
   *   route.breakdown      → { lighting, transit, amenities, roadType, barriers, incidents }
   *   route.incidentCount  → number
   *   route.lightZones     → number
   *   route.transitStops   → number
   *   route.recommended    → bool
   */
  const score    = route.score       ?? 0;
  const b        = band(score);
  const dist     = route.distanceKm  != null ? `${Number(route.distanceKm).toFixed(2)} km` : "— km";
  const dur      = route.durationMin != null ? `${route.durationMin} min`                  : "— min";
  const breakdown = route.breakdown  ?? {};

  return (
    <div
      onClick={onSelect}
      style={{
        background:   selected ? b.bg                         : "rgba(255,255,255,0.025)",
        border:       `1.5px solid ${selected ? b.border : "rgba(255,255,255,0.07)"}`,
        borderRadius: 16,
        padding:      "16px",
        cursor:       "pointer",
        transition:   "all .2s",
        boxShadow:    selected ? `0 0 24px ${b.glow}` : "none",
        fontFamily:   "Inter,sans-serif",
      }}
    >
      {/* ── Header row ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <Ring score={score} color={b.color} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Distance · Duration */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <FiMapPin size={11} style={{ color: "rgba(245,247,250,0.35)", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "rgba(245,247,250,0.55)", fontWeight: 500 }}>
              {dist} · {dur}
            </span>
            {route.recommended && (
              <span style={{
                marginLeft: 4, padding: "1px 7px",
                background: "rgba(57,211,83,0.12)", border: "1px solid rgba(57,211,83,0.3)",
                borderRadius: 20, fontSize: 9, fontWeight: 700,
                color: "#39D353", letterSpacing: "0.1em", textTransform: "uppercase",
              }}>
                Best
              </span>
            )}
          </div>

          {/* Safety badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 9px", borderRadius: 20,
            background: b.bg, border: `1px solid ${b.border}`,
            color: b.color, fontSize: 9.5, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            <b.Icon size={9} /> {b.label}
          </span>
        </div>
      </div>

      {/* ── Factor bars ────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {FACTORS.map(({ key, label, Icon }) => {
          const val = breakdown[key] ?? 0;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon size={11} style={{ color: "rgba(255,255,255,0.22)", flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "rgba(245,247,250,0.38)", width: 62, flexShrink: 0 }}>
                {label}
              </span>
              <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  width: `${val}%`, height: "100%",
                  background: barColor(val),
                  borderRadius: 99,
                  transition: "width .7s ease",
                  opacity: 0.85,
                }} />
              </div>
              <span style={{ fontSize: 9, color: "rgba(245,247,250,0.28)", width: 20, textAlign: "right" }}>
                {val}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Footer chips ───────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { label: "INCIDENTS",     value: route.incidentCount ?? "—" },
          { label: "LIGHT ZONES",   value: route.lightZones    ?? "—" },
          { label: "TRANSIT STOPS", value: route.transitStops  ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "Poppins,sans-serif", fontSize: 15, fontWeight: 700, color: "rgba(245,247,250,0.75)" }}>
              {value}
            </div>
            <div style={{ fontSize: 8.5, color: "rgba(245,247,250,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 1 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Selected / Select button ────────────────────────── */}
      <div style={{ marginTop: 12 }}>
        {selected ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px", borderRadius: 10,
            background: b.bg, border: `1px solid ${b.border}`,
            color: b.color, fontSize: 11.5, fontWeight: 700,
          }}>
            ✓ SELECTED ROUTE
          </div>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(245,247,250,0.45)", fontSize: 11.5, fontWeight: 600,
          }}>
            SELECT THIS ROUTE
          </div>
        )}
      </div>
    </div>
  );
}