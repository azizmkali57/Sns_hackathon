export const BASE_WEIGHTS = {
  lighting:  0.30,
  transit:   0.20,
  amenities: 0.15,
  roadType:  0.10,
  barriers:  0.10,
  incidents: 0.15,
};

export const SCORE_BANDS = [
  { min: 80, max: 100, label: "Safe",     color: "#39D353", bgColor: "rgba(57,211,83,0.08)",  tailwind: "text-[#39D353]" },
  { min: 50, max: 79,  label: "Moderate", color: "#FFC857", bgColor: "rgba(255,200,87,0.08)", tailwind: "text-[#FFC857]" },
  { min: 0,  max: 49,  label: "Unsafe",   color: "#FF4D4D", bgColor: "rgba(255,77,77,0.08)",  tailwind: "text-[#FF4D4D]" },
];

export const getScoreBand  = (score) => SCORE_BANDS.find((b) => score >= b.min && score <= b.max) ?? SCORE_BANDS[2];
export const getScoreColor = (score) => getScoreBand(score).color;
export const getScoreLabel = (score) => getScoreBand(score).label;

/**
 * @param {Date} now
 */
export function getTimeAdjustedWeights(now = new Date()) {
  // Convert to IST (UTC+5:30)
  const istOffset  = 5.5 * 60 * 60 * 1000;
  const istTime    = new Date(now.getTime() + istOffset);
  const hour       = istTime.getUTCHours();

  const weights = { ...BASE_WEIGHTS };

  if (hour >= 21 || hour < 5) {
    weights.lighting  = BASE_WEIGHTS.lighting  * 1.5;
    weights.incidents = BASE_WEIGHTS.incidents * 1.3;
    weights.transit   = BASE_WEIGHTS.transit   * 0.8;  
  } else if (hour >= 18) {
    // Evening
    weights.lighting  = BASE_WEIGHTS.lighting  * 1.2;
    weights.incidents = BASE_WEIGHTS.incidents * 1.1;
  }

  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  Object.keys(weights).forEach((k) => (weights[k] = weights[k] / total));

  return weights;
}

export function getTimePeriod(now = new Date()) {
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const hour    = istTime.getUTCHours();
  if (hour >= 21 || hour < 5)  return "night";
  if (hour >= 18)               return "evening";
  if (hour >= 12)               return "afternoon";
  return "morning";
}

/**
 * @param {Array<{createdAt: Date}>} incidents
 * @returns {number} decayed count (float)
 */
export function applyIncidentDecay(incidents = []) {
  const now = Date.now();
  return incidents.reduce((sum, inc) => {
    const ageMs = now - new Date(inc.createdAt).getTime();
    const ageH  = ageMs / (1000 * 60 * 60);

    if      (ageH <= 24)  return sum + 1.0;   
    else if (ageH <= 72)  return sum + 0.6;   
    else if (ageH <= 168) return sum + 0.3;  
    return sum;                                 
  }, 0);
}

export function scoreLighting(lampCount = 0, distanceKm = 1) {
  const density = lampCount / Math.max(distanceKm, 0.1);
  return Math.min(100, Math.round((density / 20) * 100));
}

export function scoreTransit(stopCount = 0) {
  return Math.min(100, Math.round((stopCount / 10) * 100));
}

export function scoreAmenities(amenityCount = 0) {
  // 0 = 0,  15+ = 100
  return Math.min(100, Math.round((amenityCount / 15) * 100));
}

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

export function scoreBarriers(barrierCount = 0, distanceKm = 1) {
  const density = barrierCount / Math.max(distanceKm, 0.1);
  return Math.max(0, Math.round(100 - (density / 5) * 100));
}

/**
 * @param {Array<{createdAt:Date}>} incidents  
 */
export function scoreIncidents(incidents = []) {
  const decayed = applyIncidentDecay(incidents);
  return Math.max(0, Math.round(100 - (decayed / 10) * 100));
}

/**
 * @param {object} p
 * @param {number}   p.lampCount
 * @param {number}   p.stopCount
 * @param {number}   p.amenityCount
 * @param {string}   p.highwayTag
 * @param {number}   p.barrierCount
 * @param {Array}    p.incidents      
 * @param {number}   p.distanceKm
 * @param {Date}     p.now          
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

    riskBreakdown: {
      trafficRisk:  Math.round(100 - raw.roadType),
      crimeRisk:    Math.round(100 - raw.incidents),
      lightingRisk: Math.round(100 - raw.lighting),
      isolationRisk: Math.round(100 - raw.barriers),
      weatherRisk:  0,    
      timeRisk:     getTimePeriod(now) === "night" ? 30 : getTimePeriod(now) === "evening" ? 15 : 0,
      overallRisk:  Math.round(100 - total),
    },
  };
}

export function rankRoutes(routes) {
  const sorted = [...routes].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  sorted.forEach((r, i) => (r.recommended = i === 0));
  return sorted;
}

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