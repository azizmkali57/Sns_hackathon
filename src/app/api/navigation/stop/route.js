import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/auth/[...nextauth]/route.js";
import NavigationSession from "@/Models/NavigationSession.js";
import { clearTracking } from "@/services/trackingService.js";
import { routeLength, geojsonToLatLng } from "@/lib/mapUtils.js";
import Route from "@/Models/Route.js";
import dbConnect from "@/lib/connectDB.js";
import { verifyAuth } from "@/lib/auth";

export async function POST(req) {
  try {
    const auth = await verifyAuth(req);

    if (!auth.success || !auth.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized — please sign in",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { sessionId, reason = "cancelled" } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId is required" },
        { status: 400 }
      );
    }

    const allowedReasons = ["completed", "cancelled", "sos_triggered"];
    if (!allowedReasons.includes(reason)) {
      return NextResponse.json(
        { success: false, error: `reason must be one of: ${allowedReasons.join(", ")}` },
        { status: 400 }
      );
    }

    await dbConnect();

    const navSession = await NavigationSession.findById(sessionId);
    if (!navSession) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }
    if (String(navSession.userId) !== String(auth.user.id)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const breadcrumbs = navSession.breadcrumbs ?? [];
    const traveledKm  = breadcrumbs.length > 1 ? routeLength(breadcrumbs) : 0;

    const startedAt = navSession.startedAt ?? new Date();
    const endedAt   = new Date();
    const durationMs = endedAt - startedAt;
    const durationMins = Math.round(durationMs / 60_000);

    let plannedScore = navSession.safetyScore ?? 0;
    try {
      const routeDoc   = await Route.findById(navSession.routeId).lean();
      const chosenRoute = routeDoc?.routes?.[navSession.selectedRouteIndex ?? 0];
      if (chosenRoute?.score) plannedScore = chosenRoute.score;
    } catch (_) { /* non-critical */ }
    
    navSession.status  = reason;
    navSession.endedAt = endedAt;
    navSession.summary = {
      totalDistanceKm:    parseFloat(traveledKm.toFixed(2)),
      totalDurationMins:  durationMins,
      averageSafetyScore: plannedScore,
      incidentsNearby:    navSession.alertsTriggered?.length ?? 0,
    };

    await navSession.save();

    await clearTracking(session.user.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          sessionId,
          status:   navSession.status,
          endedAt:  navSession.endedAt,
          summary:  navSession.summary,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/navigation/stop]", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}