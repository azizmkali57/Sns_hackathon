import { buildOverpassQuery, parseOverpassResponse, geojsonToLatLng, boundingBox, haversineDistance } from "./mapUtils.js";
import { calculateSafetyScore, rankRoutes, explainScore } from "./scoring.js";
import Incident from "@/Models/Incident.js";

const OVERPASS_API = process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter";

async function fetchOSMData(routeCoords) {
  try {
    const bbox = boundingBox(routeCoords);
    const query = buildOverpassQuery(bbox.center.lat, bbox.center.lng, 0.5);

    const res = await fetch(OVERPASS_API, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(10_000), // 10 s
    });

    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    return parseOverpassResponse(await res.json());
  } catch {
    // Graceful degradation — scoring will use defaults
    return { lamps: 0, stops: 0, amenities: 0, barriers: 0 };
  }
}

async function countNearbyIncidents(routeCoords) {
  try {
    const bbox  = boundingBox(routeCoords);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const count = await Incident.countDocuments({
      createdAt: { $gte: since },
      "location.lat": { $gte: bbox.minLat, $lte: bbox.maxLat },
      "location.lng": { $gte: bbox.minLng, $lte: bbox.maxLng },
    });

    return count;
  } catch {
    return 0;
  }
}

/**
 * @param {ParsedRoute} route   
 * @param {number}      index
 */
async function enrichRoute(route, index) {
  const coords = geojsonToLatLng(route.geometry);

  const [osmCounts, incidentCount] = await Promise.all([
    fetchOSMData(coords),
    countNearbyIncidents(coords),
  ]);

  const highwayTag =
    route.steps?.[0]?.type === "arrive" ? "residential" : "primary";

  const scored = calculateSafetyScore({
    lampCount:     osmCounts.lamps,
    stopCount:     osmCounts.stops,
    amenityCount:  osmCounts.amenities,
    barrierCount:  osmCounts.barriers,
    incidentCount,
    highwayTag,
    distanceKm:    parseFloat(route.distance),
  });

  return {
    index,
    name:      `Route ${index + 1}`,
    distance:  route.distance,
    duration:  route.duration,
    geometry:  route.geometry,
    checkpoints: route.checkpoints,
    steps:     route.steps,
    score:     scored.total,
    band:      scored.band,
    breakdown: scored.breakdown,
    riskBreakdown: scored.riskBreakdown,
    explanation:  explainScore(scored),
    osmCounts,
    incidentCount,
  };
}

/**
 * @param {ParsedRoute[]} parsedRoutes  
 * @returns {Promise<EnrichedRoute[]>} 
 */
export async function analyzeRoutes(parsedRoutes) {
  if (!parsedRoutes?.length) return [];

  const enriched = await Promise.all(
    parsedRoutes.map((r, i) => enrichRoute(r, i))
  );

  const ranked = rankRoutes(enriched.map((r) => ({ ...r, score: r.score })));

  if (ranked.length) ranked[0].recommended = true;

  return ranked;
}

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{score:number, band:object}>}
 */
export async function scoreLocation(lat, lng) {
  const osmCounts   = await fetchOSMData([{ lat, lng }]);
  const incidentCount = await countNearbyIncidents([{ lat, lng }]);

  const result = calculateSafetyScore({
    lampCount:    osmCounts.lamps,
    stopCount:    osmCounts.stops,
    amenityCount: osmCounts.amenities,
    barrierCount: osmCounts.barriers,
    incidentCount,
    distanceKm:   0.5,
  });

  return { score: result.total, band: result.band, breakdown: result.breakdown };
}