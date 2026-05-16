// lib/routeAnalyzer.js
// Fixed: Each route gets unique scores based on its actual geometry

import { scoreRoute } from "./scoring.js";

/**
 * Analyze and rank multiple OSRM routes by safety
 * @param {Array} routes - Array of OSRM route objects (each has geometry, distance, duration)
 * @param {Object} origin - { lat, lon }
 * @param {Object} destination - { lat, lon }
 * @returns {Array} routes sorted by safety score descending, each with scores attached
 */
export function analyzeRoutes(routes, origin, destination) {
  if (!routes || routes.length === 0) return [];

  const waypoints = [origin, destination];

  const analyzed = routes.map((route, index) => {
    // CRITICAL FIX: Pass the route's own geometry into scoreRoute
    // Previously all routes likely shared the same geometry object
    const scores = scoreRoute(route, waypoints);

    return {
      index,
      route, // original OSRM route object
      scores,
      // Convenience top-level fields for UI
      overall: scores.overall,
      safety_label: scores.safety_label,
      distance_km: scores.metadata.distance_km,
      duration_min: scores.metadata.duration_min,
      incident_count: scores.metadata.incident_count,
      light_zones: scores.metadata.light_zones,
      transit_stops: scores.metadata.transit_stops,
    };
  });

  // Sort: safest first
  analyzed.sort((a, b) => b.overall - a.overall);

  // Mark the recommended route
  if (analyzed.length > 0) {
    analyzed[0].recommended = true;
  }

  return analyzed;
}

/**
 * Get a human-readable AI explanation for why a route was chosen
 * @param {Object} analyzedRoute - Output from analyzeRoutes
 * @returns {string}
 */
export function getRouteExplanation(analyzedRoute) {
  const { scores, recommended } = analyzedRoute;
  const { breakdown, metadata } = scores;

  const strengths = [];
  const weaknesses = [];

  if (breakdown.lighting >= 70) strengths.push("well-lit streets");
  else if (breakdown.lighting < 50) weaknesses.push("poor street lighting");

  if (breakdown.incidents >= 70) strengths.push("low incident history");
  else if (breakdown.incidents < 50) weaknesses.push("high incident area");

  if (breakdown.amenities >= 70) strengths.push("good amenity access");
  if (breakdown.road_type >= 70) strengths.push("good road quality");
  if (breakdown.barriers < 50) weaknesses.push("barrier/accessibility issues");

  const strengthStr =
    strengths.length > 0
      ? `This route has ${strengths.join(", ")}.`
      : "";

  const weaknessStr =
    weaknesses.length > 0
      ? ` Watch out for ${weaknesses.join(", ")}.`
      : "";

  const recommendation = recommended
    ? " This is the recommended safest route."
    : " Consider the safer alternative if available.";

  return `${strengthStr}${weaknessStr}${recommendation} Overall safety score: ${scores.overall}/100 (${scores.safety_label}).`;
}

/**
 * Compare two routes and return which is safer and why
 */
export function compareRoutes(routeA, routeB) {
  const diff = routeA.overall - routeB.overall;
  if (Math.abs(diff) < 5) {
    return "Both routes have similar safety scores. Choose based on distance or time preference.";
  }
  const better = diff > 0 ? "Route A" : "Route B";
  const worse = diff > 0 ? "Route B" : "Route A";
  return `${better} is significantly safer (score difference: ${Math.abs(diff)} points). ${worse} has more risks based on lighting, incidents, and road conditions.`;
}