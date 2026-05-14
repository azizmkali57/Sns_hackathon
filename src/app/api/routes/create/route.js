// app/api/routes/create/route.js
import { NextResponse } from "next/server";
import { createRoute }  from "@/services/routeService.js";
import { verifyAuth }   from "@/lib/auth.js";

export async function POST(req) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please sign in" },
        { status: 401 }
      );
    }

    // ── Body validation ──────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { source, destination } = body;

    if (!source?.trim()) {
      return NextResponse.json(
        { success: false, error: "source is required" },
        { status: 400 }
      );
    }
    if (!destination?.trim()) {
      return NextResponse.json(
        { success: false, error: "destination is required" },
        { status: 400 }
      );
    }

    // ── Create route ─────────────────────────────────────────────────────────
    const routeDoc = await createRoute(
      auth.user.id,
      source.trim(),
      destination.trim()
    );

    // ── Shape response ────────────────────────────────────────────────────────
    // CRITICAL: geometry and steps MUST be included so the map can draw
    // polylines and the directions panel can show turn-by-turn instructions.
    return NextResponse.json(
      {
        success: true,
        data: {
          routeId:     routeDoc._id,
          source:      routeDoc.source,
          destination: routeDoc.destination,
          safetyScore: routeDoc.safetyScore,

          // Source + destination coords — needed by MapView markers
          sourceCoords:      routeDoc.sourceCoords,
          destinationCoords: routeDoc.destinationCoords,

          routes: routeDoc.routes.map((r) => ({
            index:        r.index,
            name:         r.name,
            score:        r.score,
            band:         r.band,
            distance:     r.distance,
            duration:     r.duration,
            recommended:  r.recommended ?? false,
            breakdown:    r.breakdown,
            explanation:  r.explanation,
            incidentCount: r.incidentCount,

            // ✅ REQUIRED FOR MAP — GeoJSON LineString with all coordinates
            geometry:    r.geometry,

            // ✅ REQUIRED FOR DIRECTIONS PANEL — turn-by-turn steps
            steps:       r.steps ?? [],

            // Checkpoint lat/lngs (fallback if geometry missing)
            checkpoints: r.checkpoints ?? [],
          })),

          expiresAt: routeDoc.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/routes/create]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}