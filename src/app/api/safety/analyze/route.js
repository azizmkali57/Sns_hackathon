import { NextResponse }            from "next/server";
import { analyzeRouteCorridor }    from "@/services/riskAnalysisService.js";
import { geojsonToLatLng }         from "@/lib/mapUtils.js";
import Route                       from "@/Models/Route.js";
import connectDB                   from "@/lib/connectDB.js";
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
    const { routeId, routeIndex = 0, coordinates } = body;

    let routeCoords = [];
    let highwayTag  = "primary";

    if (Array.isArray(coordinates) && coordinates.length) {
      if (coordinates.length < 2)
        return NextResponse.json({ success: false, error: "At least 2 coordinates required" }, { status: 400 });

      routeCoords = coordinates.map((c) => ({ lat: parseFloat(c.lat), lng: parseFloat(c.lng) }));
    }

    else if (routeId) {
      await connectDB();
      const routeDoc = await Route.findById(routeId).lean();

      if (!routeDoc)
        return NextResponse.json({ success: false, error: "Route not found" }, { status: 404 });
      if (String(routeDoc.userId) !== String(auth.user.id))
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

      const chosenRoute = routeDoc.routes?.[routeIndex];
      if (!chosenRoute)
        return NextResponse.json({ success: false, error: "Route index not found" }, { status: 400 });

      routeCoords = geojsonToLatLng(chosenRoute.geometry);
    } else {
      return NextResponse.json(
        { success: false, error: "Provide either routeId or coordinates array" },
        { status: 400 }
      );
    }

    if (!routeCoords.length)
      return NextResponse.json({ success: false, error: "Could not extract route coordinates" }, { status: 400 });

    const report = await analyzeRouteCorridor(routeCoords, { highwayTag });

    return NextResponse.json({ success: true, data: report }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/safety/analyze]", err);
    return NextResponse.json({ success: false, error: err.message ?? "Internal server error" }, { status: 500 });
  }
}