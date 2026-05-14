import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions }      from "../../auth/[...nextauth]/route.js";
import { analyzePoint }     from "@/services/riskAnalysisService.js";
import { verifyAuth } from "@/lib/auth";

// ── Shared handler ────────────────────────────────────────────────────────────
async function handleRequest(lat, lng, highwayTag) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (isNaN(latNum) || isNaN(lngNum))
    return NextResponse.json({ success: false, error: "lat and lng must be valid numbers" }, { status: 400 });

  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180)
    return NextResponse.json({ success: false, error: "lat/lng out of valid range" }, { status: 400 });

  const report = await analyzePoint(latNum, lngNum, { highwayTag: highwayTag ?? "residential" });

  return NextResponse.json({ success: true, data: report }, { status: 200 });
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req) {
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

    const { searchParams } = new URL(req.url);
    return handleRequest(
      searchParams.get("lat"),
      searchParams.get("lng"),
      searchParams.get("highwayTag")
    );
  } catch (err) {
    console.error("[GET /api/safety/score]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
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
    return handleRequest(body.lat, body.lng, body.highwayTag);
  } catch (err) {
    console.error("[POST /api/safety/score]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}