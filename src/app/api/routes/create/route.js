// app/api/routes/create/route.js

import { NextResponse } from "next/server";
import { analyzeRoutes, getRouteExplanation } from "@/lib/routeAnalyzer";
import connectDB from "@/lib/connectDB.js";
import Route from "@/Models/Route.js";
import { verifyAuth } from "@/lib/auth.js";

const OSRM_BASE = process.env.OSRM_URL || "https://router.project-osrm.org";

async function geocode(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "in");
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "SafeRouteNavigationSystem/1.0" },
  });
  if (!res.ok) throw new Error(`Geocoding failed for "${query}"`);
  const data = await res.json();
  if (!data.length) throw new Error(`Location not found: "${query}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export async function POST(req) {
  try {
    // 1. Auth — required so navigation/start can verify ownership
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please sign in" },
        { status: 401 }
      );
    }
    const userId = auth.user.id;

    const body = await req.json();
    const { source, destination } = body;

    if (!source?.trim() || !destination?.trim()) {
      return NextResponse.json(
        { success: false, error: "source and destination are required" },
        { status: 400 }
      );
    }

    // 2. Geocode
    const [srcCoords, dstCoords] = await Promise.all([
      geocode(source),
      geocode(destination),
    ]);

    // 3. OSRM — full geometry needed for per-route scoring
    const osrmUrl =
      `${OSRM_BASE}/route/v1/driving/` +
      `${srcCoords.lng},${srcCoords.lat};${dstCoords.lng},${dstCoords.lat}` +
      `?alternatives=3&geometries=geojson&overview=full&steps=true`;

    const osrmRes = await fetch(osrmUrl);
    if (!osrmRes.ok) throw new Error(`OSRM error ${osrmRes.status}`);
    const osrmData = await osrmRes.json();

    if (!osrmData.routes?.length) {
      return NextResponse.json(
        { success: false, error: "No routes found between these locations" },
        { status: 404 }
      );
    }

    // 4. Score each route from its own geometry → unique scores
    const origin = { lat: srcCoords.lat, lon: srcCoords.lng };
    const dest   = { lat: dstCoords.lat, lon: dstCoords.lng };
    const analyzed = analyzeRoutes(osrmData.routes, origin, dest);

    // 5. Shape for frontend
    const routes = analyzed.map((r, idx) => ({
      index:        idx,
      recommended:  r.recommended ?? false,
      score:        r.overall,
      safetyLabel:  r.safety_label,
      breakdown: {
        lighting:  r.scores.breakdown.lighting,
        transit:   r.scores.breakdown.transit,
        amenities: r.scores.breakdown.amenities,
        roadType:  r.scores.breakdown.road_type,
        barriers:  r.scores.breakdown.barriers,
        incidents: r.scores.breakdown.incidents,
      },
      distanceKm:    parseFloat(r.distance_km),
      durationMin:   r.duration_min,
      incidentCount: r.incident_count,
      lightZones:    r.light_zones,
      transitStops:  r.transit_stops,
      explanation:   getRouteExplanation(r),
      geometry:      r.route.geometry,
    }));

    // 6. Save to DB — userId included so navigation/start ownership check passes
    await connectDB();
    const doc = await Route.create({
      userId,                           // ← fixes "userId is required" validation error
      source,
      destination,
      sourceCoords:      srcCoords,
      destinationCoords: dstCoords,
      safetyScore:       routes[0]?.score ?? 0,
      selectedRouteIndex: 0,
      routes: routes.map((r) => ({
        index:       r.index,
        score:       r.score,
        distanceKm:  r.distanceKm,
        durationMin: r.durationMin,
        geometry:    r.geometry,
        breakdown:   r.breakdown,
      })),
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        routeId:           doc._id.toString(),
        source,
        destination,
        sourceCoords:      srcCoords,
        destinationCoords: dstCoords,
        routes,
      },
    });
  } catch (err) {
    console.error("[routes/create] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}