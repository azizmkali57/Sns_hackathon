import {parseOSRMRoutes, fetchOSRMRoutes } from "@/lib/osrm.js"; 
import { analyzeRoutes } from "@/lib/routeAnalyzer.js";
import Route from "@/Models/Route.js";
import dbConnect from "@/lib/connectDB.js"; 
const NOMINATIM = "https://nominatim.openstreetmap.org";

/**
 * @param {string} query  
 * @returns {Promise<{lat:number, lng:number, displayName:string}>}
 */
export async function geocodeAddress(query) {
  const url = new URL("/search", NOMINATIM);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "in"); 

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "SafeRouteNavigationSystem/1.0" },
  });

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

  const results = await res.json();
  if (!results.length) throw new Error(`Location not found: "${query}"`);

  const { lat, lon, display_name } = results[0];
  return { lat: parseFloat(lat), lng: parseFloat(lon), displayName: display_name };
}

/**
 * @param {string} userId
 * @param {string} source       
 * @param {string} destination  
 * @returns {Promise<RouteDocument>}
 */
export async function createRoute(userId, source, destination) {
  await dbConnect();

  const [srcGeo, dstGeo] = await Promise.all([
    geocodeAddress(source),
    geocodeAddress(destination),
  ]);

  const osrmRaw = await fetchOSRMRoutes(
    srcGeo.lat, srcGeo.lng,
    dstGeo.lat, dstGeo.lng,
    3 
  );
  const parsed = parseOSRMRoutes(osrmRaw);

  const enriched = await analyzeRoutes(parsed);

  const best = enriched[0] ?? {};

  const routeDoc = await Route.create({
    userId,
    source,
    destination,
    sourceCoords:      { lat: srcGeo.lat, lng: srcGeo.lng },
    destinationCoords: { lat: dstGeo.lat, lng: dstGeo.lng },
    routes:            enriched,
    safetyScore:       best.score ?? 0,
    riskBreakdown:     best.riskBreakdown ?? {},
    selectedRouteIndex: 0,
  });

  return routeDoc;
}

export async function getRouteById(routeId, userId) {
  await dbConnect();
  const doc = await Route.findById(routeId).lean();
  if (!doc) throw new Error("Route not found");
  if (String(doc.userId) !== String(userId)) throw new Error("Unauthorized");
  return doc;
}

export async function getUserRoutes(userId, limit = 20) {
  await dbConnect();
  return Route.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * @param {string} routeAId
 * @param {string} routeBId
 * @param {string} userId
 */
export async function compareRoutes(routeAId, routeBId, userId) {
  await dbConnect();

  const [routeA, routeB] = await Promise.all([
    getRouteById(routeAId, userId),
    getRouteById(routeBId, userId),
  ]);

  const bestA = routeA.routes?.[routeA.selectedRouteIndex ?? 0] ?? {};
  const bestB = routeB.routes?.[routeB.selectedRouteIndex ?? 0] ?? {};

  const diff = (a, b) => ({
    a,
    b,
    delta: typeof a === "number" && typeof b === "number" ? a - b : null,
    winner: a > b ? "A" : b > a ? "B" : "tie",
  });

  return {
    routeA: {
      id:          routeAId,
      source:      routeA.source,
      destination: routeA.destination,
      score:       bestA.score,
      distance:    bestA.distance,
      duration:    bestA.duration,
      breakdown:   bestA.breakdown,
    },
    routeB: {
      id:          routeBId,
      source:      routeB.source,
      destination: routeB.destination,
      score:       bestB.score,
      distance:    bestB.distance,
      duration:    bestB.duration,
      breakdown:   bestB.breakdown,
    },
    comparison: {
      safetyScore: diff(bestA.score,            bestB.score),
      distance:    diff(parseFloat(bestA.distance), parseFloat(bestB.distance)),
      duration:    diff(bestA.duration,          bestB.duration),
      lighting:    diff(bestA.breakdown?.lighting,  bestB.breakdown?.lighting),
      transit:     diff(bestA.breakdown?.transit,   bestB.breakdown?.transit),
      incidents:   diff(bestA.breakdown?.incidents, bestB.breakdown?.incidents),
    },
    recommendation:
      (bestA.score ?? 0) >= (bestB.score ?? 0)
        ? `Route A (${routeA.source} → ${routeA.destination}) is safer.`
        : `Route B (${routeB.source} → ${routeB.destination}) is safer.`,
  };
}

export async function selectRouteAlternative(routeId, userId, alternativeIndex) {
  await dbConnect();
  const doc = await Route.findById(routeId);
  if (!doc) throw new Error("Route not found");
  if (String(doc.userId) !== String(userId)) throw new Error("Unauthorized");
  if (alternativeIndex < 0 || alternativeIndex >= doc.routes.length)
    throw new Error("Invalid route index");

  doc.selectedRouteIndex = alternativeIndex;
  doc.safetyScore        = doc.routes[alternativeIndex].score ?? 0;
  await doc.save();
  return doc;
}