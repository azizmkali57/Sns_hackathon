// app/api/routes/compare/route.js
// Fixed: Now passes each route's geometry correctly to the analyzer

import { NextResponse } from "next/server";
import { analyzeRoutes, getRouteExplanation } from "@/lib/routeAnalyzer";

const OSRM_BASE = process.env.OSRM_URL || "https://router.project-osrm.org";

export async function POST(req) {
  try {
    const body = await req.json();
    const { origin, destination } = body;
    // origin & destination: { lat: number, lon: number, label?: string }

    if (!origin?.lat || !origin?.lon || !destination?.lat || !destination?.lon) {
      return NextResponse.json(
        { error: "origin and destination with lat/lon are required" },
        { status: 400 }
      );
    }

    // Request up to 3 alternative routes from OSRM
    const osrmUrl =
      `${OSRM_BASE}/route/v1/driving/` +
      `${origin.lon},${origin.lat};${destination.lon},${destination.lat}` +
      `?alternatives=3&geometries=geojson&overview=full&steps=true`;

    const osrmRes = await fetch(osrmUrl);
    if (!osrmRes.ok) {
      throw new Error(`OSRM error: ${osrmRes.status}`);
    }

    const osrmData = await osrmRes.json();

    if (!osrmData.routes || osrmData.routes.length === 0) {
      return NextResponse.json({ error: "No routes found" }, { status: 404 });
    }

    // ✅ FIX: analyzeRoutes now uses each route's own geometry for unique scoring
    const analyzedRoutes = analyzeRoutes(osrmData.routes, origin, destination);

    // Build response payload
    const result = analyzedRoutes.map((r, idx) => ({
      route_index: idx,
      recommended: r.recommended || false,
      overall_score: r.overall,
      safety_label: r.safety_label,
      distance_km: r.distance_km,
      duration_min: r.duration_min,
      scores: r.scores.breakdown,
      metadata: {
        incident_count: r.incident_count,
        light_zones: r.light_zones,
        transit_stops: r.transit_stops,
      },
      explanation: getRouteExplanation(r),
      // ✅ Return geometry for map rendering
      geometry: r.route.geometry,
    }));

    return NextResponse.json({
      success: true,
      total_routes: result.length,
      routes: result,
    });
  } catch (err) {
    console.error("[routes/compare] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}