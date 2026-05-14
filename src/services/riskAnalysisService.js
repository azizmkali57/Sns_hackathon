import connectDB from "@/lib/connectDB.js";
import Incident  from "@/Models/Incident.js";
import {
  calculateSafetyScore,
  explainScore,
  getTimeAdjustedWeights,
  getTimePeriod,
  rankRoutes,
} from "../lib/scoring.js";
import {
  buildOverpassQuery,
  parseOverpassResponse,
  geojsonToLatLng,
  boundingBox,
  isPointNearRoute,
} from "../lib/mapUtils.js";

const OVERPASS_URL = process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter";
const INCIDENT_LOOKBACK_DAYS = 7;

// ─── OSM data fetch ───────────────────────────────────────────────────────────

/**
 * Fetch OSM node counts for a lat/lng area via Overpass API
 * Gracefully returns zeroes on failure (non-blocking)
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 */
async function fetchOSMCounts(lat, lng, radiusKm = 0.4) {
  try {
    const query = buildOverpassQuery(lat, lng, radiusKm);

    const res = await fetch(OVERPASS_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    return parseOverpassResponse(await res.json());
  } catch (err) {
    console.warn("[riskAnalysis] Overpass fetch failed:", err.message);
    return { lamps: 0, stops: 0, amenities: 0, barriers: 0 };
  }
}

// ─── Incident fetch ───────────────────────────────────────────────────────────

/**
 * Fetch active incidents near a bounding box from MongoDB
 *
 * @param {number} minLat
 * @param {number} maxLat
 * @param {number} minLng
 * @param {number} maxLng
 * @returns {Promise<IncidentDoc[]>}
 */
async function fetchNearbyIncidents(minLat, maxLat, minLng, maxLng) {
  await connectDB();

  const since = new Date(Date.now() - INCIDENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  return Incident.find({
    active:    true,
    createdAt: { $gte: since },
    "location.lat": { $gte: minLat, $lte: maxLat },
    "location.lng": { $gte: minLng, $lte: maxLng },
  })
    .select("type severity location createdAt")
    .lean();
}

// ─── Single-point analysis ────────────────────────────────────────────────────

/**
 * Analyse safety for a single geographic point (used by live tracking)
 *
 * @param {number} lat
 * @param {number} lng
 * @param {object} opts
 * @param {string}  opts.highwayTag   — OSM highway type if known
 * @param {number}  opts.radiusKm     — search radius
 * @param {Date}    opts.now
 *
 * @returns {Promise<PointRiskReport>}
 */
export async function analyzePoint(lat, lng, {
  highwayTag = "residential",
  radiusKm   = 0.35,
  now        = new Date(),
} = {}) {
  const delta = radiusKm / 111; // rough degrees

  const [osmCounts, incidents] = await Promise.all([
    fetchOSMCounts(lat, lng, radiusKm),
    fetchNearbyIncidents(lat - delta, lat + delta, lng - delta, lng + delta),
  ]);

  const result = calculateSafetyScore({
    lampCount:    osmCounts.lamps,
    stopCount:    osmCounts.stops,
    amenityCount: osmCounts.amenities,
    barrierCount: osmCounts.barriers,
    incidents,
    highwayTag,
    distanceKm:   radiusKm * 2,
    now,
  });

  // Categorise nearby incidents for the response
  const incidentSummary = incidents.reduce((acc, inc) => {
    acc[inc.type] = (acc[inc.type] ?? 0) + 1;
    return acc;
  }, {});

  return {
    lat, lng,
    score:          result.total,
    band:           result.band,
    breakdown:      result.breakdown,
    riskBreakdown:  result.riskBreakdown,
    weights:        result.weights,
    timePeriod:     result.timePeriod,
    explanation:    explainScore(result),
    osmCounts,
    incidentCount:  incidents.length,
    incidentSummary,
    analyzedAt:     now.toISOString(),
  };
}

// ─── Route corridor analysis ──────────────────────────────────────────────────

/**
 * Analyse safety for an entire route (array of lat/lng coords)
 * Samples the route into segments and scores each, then aggregates.
 *
 * @param {Array<{lat:number,lng:number}>} routeCoords   — from geojsonToLatLng()
 * @param {object} opts
 * @param {string}  opts.highwayTag
 * @param {Date}    opts.now
 *
 * @returns {Promise<RouteRiskReport>}
 */
export async function analyzeRouteCorridor(routeCoords, {
  highwayTag = "primary",
  now        = new Date(),
} = {}) {
  if (!routeCoords?.length) throw new Error("routeCoords is required");

  const bbox = boundingBox(routeCoords);

  // Fetch OSM + incidents for entire bounding box in one call
  const [osmCounts, incidents] = await Promise.all([
    fetchOSMCounts(bbox.center.lat, bbox.center.lng, 0.6),
    fetchNearbyIncidents(bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng),
  ]);

  // Filter incidents to only those actually near the route line
  const routeIncidents = incidents.filter((inc) =>
    isPointNearRoute(
      { lat: inc.location.lat, lng: inc.location.lng },
      routeCoords,
      0.2   // 200 m tolerance
    )
  );

  const distanceKm = routeCoords.length > 1
    ? routeCoords.reduce((sum, c, i) => {
        if (i === 0) return 0;
        const prev = routeCoords[i - 1];
        const d    = Math.sqrt((c.lat - prev.lat) ** 2 + (c.lng - prev.lng) ** 2) * 111;
        return sum + d;
      }, 0)
    : 1;

  const result = calculateSafetyScore({
    lampCount:    osmCounts.lamps,
    stopCount:    osmCounts.stops,
    amenityCount: osmCounts.amenities,
    barrierCount: osmCounts.barriers,
    incidents:    routeIncidents,
    highwayTag,
    distanceKm,
    now,
  });

  // Hotspots — incidents grouped by severity
  const hotspots = routeIncidents
    .filter((i) => i.severity === "high")
    .map((i) => ({
      lat:  i.location.lat,
      lng:  i.location.lng,
      type: i.type,
    }));

  return {
    score:         result.total,
    band:          result.band,
    breakdown:     result.breakdown,
    riskBreakdown: result.riskBreakdown,
    weights:       result.weights,
    timePeriod:    result.timePeriod,
    explanation:   explainScore(result),
    osmCounts,
    distanceKm:    parseFloat(distanceKm.toFixed(2)),
    totalIncidents: routeIncidents.length,
    hotspots,
    analyzedAt:    now.toISOString(),
  };
}

// ─── Multi-route comparison ───────────────────────────────────────────────────

/**
 * Analyse and rank multiple OSRM routes by safety score
 *
 * @param {Array<ParsedRoute>} parsedRoutes  — from parseOSRMRoutes()
 * @returns {Promise<EnrichedRoute[]>}       — sorted best-first
 */
export async function analyzeAndRankRoutes(parsedRoutes) {
  if (!parsedRoutes?.length) return [];

  const enriched = await Promise.all(
    parsedRoutes.map(async (route, index) => {
      const coords = geojsonToLatLng(route.geometry);
      if (!coords.length) return { ...route, index, score: 0, recommended: false };

      const report = await analyzeRouteCorridor(coords, {
        highwayTag: route.steps?.[0]?.type === "arrive" ? "residential" : "primary",
      });

      return {
        index,
        name:          `Route ${index + 1}`,
        distance:      route.distance,
        duration:      route.duration,
        geometry:      route.geometry,
        checkpoints:   route.checkpoints,
        steps:         route.steps ?? [],
        score:         report.score,
        band:          report.band,
        breakdown:     report.breakdown,
        riskBreakdown: report.riskBreakdown,
        explanation:   report.explanation,
        osmCounts:     report.osmCounts,
        incidentCount: report.totalIncidents,
        hotspots:      report.hotspots,
        timePeriod:    report.timePeriod,
        recommended:   false,
      };
    })
  );

  return rankRoutes(enriched);
}

// ─── Threshold checks (used by alertService) ──────────────────────────────────

export const RISK_THRESHOLDS = {
  DANGER:         40,   // score ≤ 40 → danger alert + consider SOS
  WARNING:        60,   // score ≤ 60 → warning alert
  LOW_SCORE_SOS:  25,   // auto-trigger SOS consideration
  OFF_ROUTE_M:   200,   // metres before off-route alert
};

/**
 * Evaluate a point score against thresholds and return alert objects
 */
export function evaluateThresholds(score, { isOffRoute = false, remainingKm = 0 } = {}) {
  const alerts = [];

  if (score <= RISK_THRESHOLDS.DANGER) {
    alerts.push({
      type:    "danger",
      title:   "Danger Zone",
      message: `Safety score critically low (${score}/100). High-risk area detected. Consider stopping or triggering SOS.`,
    });
  } else if (score <= RISK_THRESHOLDS.WARNING) {
    alerts.push({
      type:    "warning",
      title:   "Low Safety Area",
      message: `Safety score dropped to ${score}/100. Poor lighting or recent incidents nearby.`,
    });
  }

  if (isOffRoute) {
    alerts.push({
      type:    "warning",
      title:   "Off Route",
      message: "You have deviated from the planned safe route. Tap Reroute to continue safely.",
    });
  }

  if (remainingKm > 0 && remainingKm < 0.3) {
    alerts.push({
      type:    "info",
      title:   "Almost There",
      message: `${Math.round(remainingKm * 1000)} m to your destination.`,
      distance: `${Math.round(remainingKm * 1000)} m`,
    });
  }

  return alerts;
}