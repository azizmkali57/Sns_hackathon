import { NextResponse }  from "next/server";
import connectDB         from "@/lib/connectDB.js";
import Incident          from "@/Models/Incident.js";
import { verifyAuth } from "@/lib/auth";

const ALLOWED_TYPES = ["crime", "accident", "harassment", "unsafe_area", "lighting", "construction", "other"];
const ALLOWED_SEVER = ["low", "medium", "high"];

// ── GET — fetch nearby incidents ──────────────────────────────────────────────
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
    const lat    = parseFloat(searchParams.get("lat")    ?? "22.7196");
    const lng    = parseFloat(searchParams.get("lng")    ?? "75.8577");
    const radius = parseFloat(searchParams.get("radius") ?? "0.5");   // km
    const type   = searchParams.get("type");   // optional filter
    const limit  = parseInt(searchParams.get("limit")  ?? "50", 10);

    await connectDB();

    const delta = radius / 111; // degrees approximation
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const query = {
      active:    true,
      createdAt: { $gte: since },
      "location.lat": { $gte: lat - delta, $lte: lat + delta },
      "location.lng": { $gte: lng - delta, $lte: lng + delta },
    };
    if (type && ALLOWED_TYPES.includes(type)) query.type = type;

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .select("-votedBy -reportedBy") // hide sensitive fields
      .lean();

    // Anonymise if flagged
    const sanitized = incidents.map((inc) => ({
      ...inc,
      reportedBy: inc.anonymous ? null : inc.reportedBy,
    }));

    return NextResponse.json(
      { success: true, data: { incidents: sanitized, total: sanitized.length } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/incidents]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── POST — report a new incident ──────────────────────────────────────────────
export async function POST(req) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { type, lat, lng, description, severity = "medium", anonymous = false } = body;

    // Validation
    if (!type || !ALLOWED_TYPES.includes(type))
      return NextResponse.json({ success: false, error: `type must be one of: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });

    if (!description?.trim())
      return NextResponse.json({ success: false, error: "description is required" }, { status: 400 });

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum))
      return NextResponse.json({ success: false, error: "Valid lat and lng are required" }, { status: 400 });

    if (!ALLOWED_SEVER.includes(severity))
      return NextResponse.json({ success: false, error: `severity must be one of: ${ALLOWED_SEVER.join(", ")}` }, { status: 400 });

    await connectDB();

    const incident = await Incident.create({
      type,
      severity,
      location:    { lat: latNum, lng: lngNum },
      description: description.trim(),
      reportedBy:  anonymous ? null : auth.user.id,
      anonymous,
      active:      true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id:          incident._id,
          type:        incident.type,
          severity:    incident.severity,
          location:    incident.location,
          description: incident.description,
          createdAt:   incident.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/incidents]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}