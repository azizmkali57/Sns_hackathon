import { NextResponse } from "next/server";
import NavigationSession from "@/Models/NavigationSession.js";
import Route from "@/Models/Route.js";
import dbConnect from "@/lib/connectDB.js";
import { verifyAuth } from "@/lib/auth.js";

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
    const {
      routeId,
      selectedRouteIndex = 0,
      startLat,
      startLng,
      guardianContacts = [],  
    } = body;

    if (!routeId) {
      return NextResponse.json(
        { success: false, error: "routeId is required" },
        { status: 400 }
      );
    }

    const lat = parseFloat(startLat);
    const lng = parseFloat(startLng);
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { success: false, error: "startLat and startLng are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const routeDoc = await Route.findById(routeId).lean();
    if (!routeDoc) {
      return NextResponse.json(
        { success: false, error: "Route not found" },
        { status: 404 }
      );
    }
    if (String(routeDoc.userId) !== String(auth.user.id)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    await NavigationSession.updateMany(
      { userId: auth.user.id, status: "active" },
      { $set: { status: "cancelled", endedAt: new Date() } }
    );

    const destCoords = routeDoc.destinationCoords ?? { lat: 0, lng: 0 };
    const chosenRoute = routeDoc.routes?.[selectedRouteIndex] ?? {};

    const navSession = await NavigationSession.create({
      userId:   auth.user.id,
      routeId,
      status:   "active",
      selectedRouteIndex,
      startedAt: new Date(),
      startLocation: { lat, lng, address: routeDoc.source },
      endLocation:   {
        lat: destCoords.lat,
        lng: destCoords.lng,
        address: routeDoc.destination,
      },
      safetyScore:     chosenRoute.score ?? routeDoc.safetyScore,
      guardianContacts: guardianContacts.map((c) => ({
        name:  c.name ?? "",
        phone: c.phone ?? "",
        notifiedAt: new Date(),
      })),
    });

    await Route.findByIdAndUpdate(routeId, {
      selectedRouteIndex,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          sessionId:         navSession._id,
          status:            navSession.status,
          routeId:           navSession.routeId,
          selectedRouteIndex: navSession.selectedRouteIndex,
          safetyScore:       navSession.safetyScore,
          guardianCount:     navSession.guardianContacts.length,
          startedAt:         navSession.startedAt,
          destination:       routeDoc.destination,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/navigation/start]", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}