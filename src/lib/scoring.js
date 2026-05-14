// lib/scoring.js
// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 Safety Scoring Engine
//
// WEIGHT TABLE (sums to 1.0):
//   Lighting          30%   — street lamp density from OSM
//   Transit & Activity 20%  — bus/metro stop proximity
//   Amenities         15%   — shops, hospitals, police nearby
//   Road Type         10%   — OSM highway classification
//   Barriers/Isolation 10%  — OSM barrier nodes (inverse)
//   Crowd Incidents   15%   — DB incidents last 7 days (inverse + decay)
//
// TIME-OF-DAY MODIFIER:
//   Night (21:00–05:00) → lighting weight ×1.5, incident weight ×1.3
//   Evening (18:00–21:00) → lighting weight ×1.2
//   Day (05:00–18:00) → no modifier
//
// INCIDENT DECAY:
//   Incidents from the last 24 h count fully.
//   24 h–72 h count at 60%.
//   72 h–7 days count at 30%.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Weight table ─────────────────────────────────────────────────────────────
export const BASE_WEIGHTS = {
  lighting:  0.30,
  transit:   0.20,
  amenities: 0.15,
  roadType:  0.10,
  barriers:  0.10,
  incidents: 0.15,
};

// ─── Score bands ──────────────────────────────────────────────────────────────
export const SCORE_BANDS = [
  { min: 80, max: 100, label: "Safe",     color: "#39D353", bgColor: "rgba(57,211,83,0.08)",  tailwind: "text-[#39D353]" },
  { min: 50, max: 79,  label: "Moderate", color: "#FFC857", bgColor: "rgba(255,200,87,0.08)", tailwind: "text-[#FFC857]" },
  { min: 0,  max: 49,  label: "Unsafe",   color: "#FF4D4D", bgColor: "rgba(255,77,77,0.08)",  tailwind: "text-[#FF4D4D]" },
];

export const getScoreBand  = (score) => SCORE_BANDS.find((b) => score >= b.min && score <= b.max) ?? SCORE_BANDS[2];
export const getScoreColor = (score) => getScoreBand(score).color;
export const getScoreLabel = (score) => getScoreBand(score).label;

// ─── Time-of-day modifier ─────────────────────────────────────────────────────

/**
 * Returns adjusted weights based on current hour (local IST or UTC+5:30)
 * @param {Date} now
 */
export function getTimeAdjustedWeights(now = new Date()) {
  // Convert to IST (UTC+5:30)
  const istOffset  = 5.5 * 60 * 60 * 1000;
  const istTime    = new Date(now.getTime() + istOffset);
  const hour       = istTime.getUTCHours();

  const weights = { ...BASE_WEIGHTS };

  if (hour >= 21 || hour < 5) {
    // Night — lighting and incidents matter most
    weights.lighting  = BASE_WEIGHTS.lighting  * 1.5;
    weights.incidents = BASE_WEIGHTS.incidents * 1.3;
    weights.transit   = BASE_WEIGHTS.transit   * 0.8;  // transit less useful at night
  } else if (hour >= 18) {
    // Evening
    weights.lighting  = BASE_WEIGHTS.lighting  * 1.2;
    weights.incidents = BASE_WEIGHTS.incidents * 1.1;
  }

  // Re-normalise so weights still sum to 1.0
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  Object.keys(weights).forEach((k) => (weights[k] = weights[k] / total));

  return weights;
}

/**
 * Time period label for display
 */
export function getTimePeriod(now = new Date()) {
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const hour    = istTime.getUTCHours();
  if (hour >= 21 || hour < 5)  return "night";
  if (hour >= 18)               return "evening";
  if (hour >= 12)               return "afternoon";
  return "morning";
}

// ─── Incident decay ───────────────────────────────────────────────────────────

/**
 * Apply time-decay to a list of incidents and return a weighted count
 * Recent incidents count more than older ones.
 *
 * @param {Array<{createdAt: Date}>} incidents
 * @returns {number} decayed count (float)
 */
export function applyIncidentDecay(incidents = []) {
  const now = Date.now();
  return incidents.reduce((sum, inc) => {
    const ageMs = now - new Date(inc.createdAt).getTime();
    const ageH  = ageMs / (1000 * 60 * 60);

    if      (ageH <= 24)  return sum + 1.0;   // full weight
    else if (ageH <= 72)  return sum + 0.6;   // 60%
    else if (ageH <= 168) return sum + 0.3;   // 30% (7 days)
    return sum;                                 // expired
  }, 0);
}

// ─── Individual factor scorers ────────────────────────────────────────────────

/** Lighting: lamp density per km → 0-100 */
export function scoreLighting(lampCount = 0, distanceKm = 1) {
  const density = lampCount / Math.max(distanceKm, 0.1);
  // 0 lamps/km = 0,  20+ lamps/km = 100
  return Math.min(100, Math.round((density / 20) * 100));
}

/** Transit: stop count → 0-100 */
export function scoreTransit(stopCount = 0) {
  // 0 stops = 0,  10+ stops = 100
  return Math.min(100, Math.round((stopCount / 10) * 100));
}

/** Amenities: nearby POI count → 0-100 */
export function scoreAmenities(amenityCount = 0) {
  // 0 = 0,  15+ = 100
  return Math.min(100, Math.round((amenityCount / 15) * 100));
}

/** Road type: OSM highway tag → 0-100 */
export function scoreRoadType(highwayTag = "residential") {
  const lookup = {
    motorway:      95,
    trunk:         90,
    primary:       85,
    secondary:     75,
    tertiary:      65,
    unclassified:  50,
    residential:   60,
    living_street: 70,
    service:       40,
    track:         20,
    path:          15,
    footway:       30,
    cycleway:      35,
  };
  return lookup[highwayTag] ?? 50;
}

/** Barriers: inverse — more barriers near route = lower score */
export function scoreBarriers(barrierCount = 0, distanceKm = 1) {
  const density = barrierCount / Math.max(distanceKm, 0.1);
  // 0 barriers/km = 100,  5+ = 0
  return Math.max(0, Math.round(100 - (density / 5) * 100));
}

/**
 * Incidents: inverse with decay applied
 * @param {Array<{createdAt:Date}>} incidents  raw incident docs
 */
export function scoreIncidents(incidents = []) {
  const decayed = applyIncidentDecay(incidents);
  // 0 decayed = 100,  10+ decayed = 0
  return Math.max(0, Math.round(100 - (decayed / 10) * 100));
}

// ─── Master scorer ────────────────────────────────────────────────────────────

/**
 * Calculate composite safety score (0-100) for a location or route
 *
 * @param {object} p
 * @param {number}   p.lampCount
 * @param {number}   p.stopCount
 * @param {number}   p.amenityCount
 * @param {string}   p.highwayTag
 * @param {number}   p.barrierCount
 * @param {Array}    p.incidents      — raw incident docs with createdAt
 * @param {number}   p.distanceKm
 * @param {Date}     p.now            — override current time (for testing)
 *
 * @returns {{
 *   total: number,
 *   breakdown: object,
 *   band: object,
 *   weights: object,
 *   timePeriod: string,
 *   riskBreakdown: object,
 * }}
 */
export function calculateSafetyScore({
  lampCount     = 0,
  stopCount     = 0,
  amenityCount  = 0,
  highwayTag    = "residential",
  barrierCount  = 0,
  incidents     = [],
  distanceKm    = 1,
  now           = new Date(),
} = {}) {
  const weights = getTimeAdjustedWeights(now);

  const raw = {
    lighting:  scoreLighting(lampCount,  distanceKm),
    transit:   scoreTransit(stopCount),
    amenities: scoreAmenities(amenityCount),
    roadType:  scoreRoadType(highwayTag),
    barriers:  scoreBarriers(barrierCount, distanceKm),
    incidents: scoreIncidents(incidents),
  };

  const total = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        Object.entries(weights).reduce(
          (sum, [key, w]) => sum + (raw[key] ?? 0) * w,
          0
        )
      )
    )
  );

  return {
    total,
    breakdown:   raw,
    band:        getScoreBand(total),
    weights,
    timePeriod:  getTimePeriod(now),

    // Mirrors Route model riskBreakdown fields
    riskBreakdown: {
      trafficRisk:  Math.round(100 - raw.roadType),
      crimeRisk:    Math.round(100 - raw.incidents),
      lightingRisk: Math.round(100 - raw.lighting),
      isolationRisk: Math.round(100 - raw.barriers),
      weatherRisk:  0,    // reserved — requires weather API
      timeRisk:     getTimePeriod(now) === "night" ? 30 : getTimePeriod(now) === "evening" ? 15 : 0,
      overallRisk:  Math.round(100 - total),
    },
  };
}

// ─── Route ranking ────────────────────────────────────────────────────────────

/** Sort enriched routes best-first; mark index 0 as recommended */
export function rankRoutes(routes) {
  const sorted = [...routes].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  sorted.forEach((r, i) => (r.recommended = i === 0));
  return sorted;
}

// ─── AI-style explanation ─────────────────────────────────────────────────────

/**
 * Generate a plain-English explanation of why this score was given
 * (used as the "Claude AI explanation" in the UI)
 */
export function explainScore({ total, breakdown, timePeriod }) {
  const band       = getScoreBand(total);
  const strengths  = [];
  const weaknesses = [];

  if (breakdown.lighting  >= 70) strengths.push("good street lighting");
  else                            weaknesses.push("poor street lighting");

  if (breakdown.transit   >= 70) strengths.push("strong transit coverage");
  else                            weaknesses.push("limited transit stops");

  if (breakdown.amenities >= 70) strengths.push("many amenities nearby");
  else                            weaknesses.push("isolated stretch with few amenities");

  if (breakdown.incidents >= 70) strengths.push("low recent incident history");
  else                            weaknesses.push("recent incidents reported nearby");

  if (breakdown.barriers  < 50)  weaknesses.push("barriers or isolated road sections");

  const timeNote =
    timePeriod === "night"   ? " Risk is elevated due to night-time conditions." :
    timePeriod === "evening" ? " Slightly elevated risk due to evening hours."   : "";

  const good = strengths.length  ? `Positives: ${strengths.join(", ")}.`  : "";
  const bad  = weaknesses.length ? `Concerns: ${weaknesses.join(", ")}.` : "";

  return `Safety score ${total}/100 — ${band.label}.${timeNote} ${good} ${bad}`.trim();
}