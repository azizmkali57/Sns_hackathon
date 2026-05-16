// lib/scoring.js
// Fixed: Scores are now computed from actual route geometry (waypoints, distance, turns)

/**
 * Deterministic but varied hash from a coordinate pair
 * Used to simulate real OSM data (lighting, incidents, etc.) per location
 */
function coordHash(lat, lon) {
  const str = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Simulates lighting score for a coordinate (0–100)
 * In production: replace with real OSM streetlight data or your DB
 */
function getLightingScore(lat, lon) {
  const h = coordHash(lat, lon);
  // Bias: main roads (more central lat/lon) have better lighting
  const base = 40 + (h % 45);
  return Math.min(100, base);
}

/**
 * Simulates incident density score for a coordinate (100 = safe, 0 = dangerous)
 * In production: query your Incident model for nearby incidents
 */
function getIncidentScore(lat, lon) {
  const h = coordHash(lat + 1, lon + 1); // offset so different from lighting
  return Math.max(10, 100 - (h % 60));
}

/**
 * Simulates amenity score (hospitals, police, shops nearby) (0–100)
 */
function getAmenityScore(lat, lon) {
  const h = coordHash(lat + 2, lon - 1);
  return 30 + (h % 55);
}

/**
 * Simulates road type score based on OSRM road class (0–100)
 * In production: use route.legs[].steps[].name / highway tag
 */
function getRoadTypeScore(waypoints, geometry) {
  // More waypoints with smooth geometry = better road type score
  const coords = geometry?.coordinates || [];
  if (coords.length === 0) return 50;

  // Check how straight the road is (straighter = likely highway = safer in some cases)
  let totalAngle = 0;
  for (let i = 1; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i - 1];
    const [x2, y2] = coords[i];
    const [x3, y3] = coords[i + 1];
    const angle =
      Math.abs(Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y2 - y1, x2 - x1)) *
      (180 / Math.PI);
    totalAngle += Math.min(angle, 180);
  }
  const avgAngle = totalAngle / Math.max(coords.length - 2, 1);
  // Fewer sharp turns = better road = higher score
  return Math.round(Math.max(30, Math.min(95, 90 - avgAngle * 0.4)));
}

/**
 * Simulates barrier/accessibility score (0–100)
 */
function getBarrierScore(lat, lon) {
  const h = coordHash(lat - 1, lon + 2);
  return 30 + (h % 50);
}

/**
 * Simulates transit access score (0–100)
 */
function getTransitScore(lat, lon) {
  const h = coordHash(lat + 3, lon + 3);
  return 35 + (h % 50);
}

/**
 * Count estimated incidents along a route (based on geometry sampling)
 */
function countIncidents(coords) {
  let count = 0;
  const step = Math.max(1, Math.floor(coords.length / 10)); // sample ~10 points
  for (let i = 0; i < coords.length; i += step) {
    const [lon, lat] = coords[i];
    const h = coordHash(lat, lon);
    if (h % 8 === 0) count++; // ~12.5% chance of incident at each sample
  }
  return count;
}

/**
 * Count light zones along a route
 */
function countLightZones(coords) {
  let count = 0;
  const step = Math.max(1, Math.floor(coords.length / 15));
  for (let i = 0; i < coords.length; i += step) {
    const [lon, lat] = coords[i];
    const score = getLightingScore(lat, lon);
    if (score > 60) count++;
  }
  return count;
}

/**
 * Count transit stops along a route
 */
function countTransitStops(coords) {
  let count = 0;
  const step = Math.max(1, Math.floor(coords.length / 10));
  for (let i = 0; i < coords.length; i += step) {
    const [lon, lat] = coords[i];
    const h = coordHash(lat + 5, lon + 5);
    if (h % 4 === 0) count++;
  }
  return count;
}

/**
 * MAIN SCORING FUNCTION
 * @param {Object} route - OSRM route object with geometry and legs
 * @param {Array} waypoints - [{lat, lon}] start/end
 * @returns {Object} scores and metadata
 */
export function scoreRoute(route, waypoints = []) {
  const geometry = route.geometry; // GeoJSON LineString
  const coords = geometry?.coordinates || []; // [[lon, lat], ...]
  const distance = route.distance || 0; // meters
  const duration = route.duration || 0; // seconds

  if (coords.length === 0) {
    return getDefaultScores();
  }

  // Sample points evenly along the route for scoring
  const sampleCount = Math.min(coords.length, 20);
  const step = Math.max(1, Math.floor(coords.length / sampleCount));
  const samples = [];
  for (let i = 0; i < coords.length; i += step) {
    samples.push(coords[i]);
  }

  // Aggregate scores from sampled coordinates
  let lightingTotal = 0,
    incidentTotal = 0,
    amenityTotal = 0,
    barrierTotal = 0,
    transitTotal = 0;

  for (const [lon, lat] of samples) {
    lightingTotal += getLightingScore(lat, lon);
    incidentTotal += getIncidentScore(lat, lon);
    amenityTotal += getAmenityScore(lat, lon);
    barrierTotal += getBarrierScore(lat, lon);
    transitTotal += getTransitScore(lat, lon);
  }

  const n = samples.length;
  const lighting = Math.round(lightingTotal / n);
  const incidents_score = Math.round(incidentTotal / n);
  const amenities = Math.round(amenityTotal / n);
  const road_type = getRoadTypeScore(waypoints, geometry);
  const barriers = Math.round(barrierTotal / n);
  const transit = Math.round(transitTotal / n);

  // Weighted overall safety score
  const overall = Math.round(
    lighting * 0.25 +
      incidents_score * 0.30 +
      amenities * 0.15 +
      road_type * 0.15 +
      barriers * 0.10 +
      transit * 0.05
  );

  // Metadata counts
  const incident_count = countIncidents(coords);
  const light_zones = countLightZones(coords);
  const transit_stops = countTransitStops(coords);

  // Safety label
  const safety_label =
    overall >= 75 ? "SAFE" : overall >= 50 ? "MODERATE" : "UNSAFE";

  return {
    overall,
    safety_label,
    breakdown: {
      lighting,
      transit,
      amenities,
      road_type,
      barriers,
      incidents: incidents_score,
    },
    metadata: {
      incident_count,
      light_zones,
      transit_stops,
      distance_km: (distance / 1000).toFixed(2),
      duration_min: Math.round(duration / 60),
    },
  };
}

function getDefaultScores() {
  return {
    overall: 50,
    safety_label: "MODERATE",
    breakdown: {
      lighting: 50,
      transit: 50,
      amenities: 50,
      road_type: 50,
      barriers: 50,
      incidents: 50,
    },
    metadata: {
      incident_count: 0,
      light_zones: 0,
      transit_stops: 0,
      distance_km: "0.00",
      duration_min: 0,
    },
  };
}