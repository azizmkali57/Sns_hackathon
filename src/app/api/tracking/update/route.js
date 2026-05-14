import { NextResponse } from "next/server";
import connectDB        from "@/lib/connectDB";
import Tracking         from "@/Models/Tracking";
import { verifyAuth }   from "@/lib/auth";

export async function POST(req) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please sign in" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { lat, lng, speedKmh = 0, heading = 0, sessionId = null } = body;

    if (lat == null || lng == null) {
      return NextResponse.json(
        { success: false, error: "lat and lng are required" },
        { status: 400 }
      );
    }

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { success: false, error: "lat and lng must be numbers" },
        { status: 400 }
      );
    }

    await connectDB();

    const tracking = await Tracking.findOneAndUpdate(
      { userId: auth.user.id },
      {
        $set: {
          liveLocation: { lat, lng },
          speedKmh,
          heading,
          ...(sessionId ? { sessionId } : {}),
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          lat:       tracking.liveLocation.lat,
          lng:       tracking.liveLocation.lng,
          updatedAt: tracking.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/tracking/update]", err);
    return NextResponse.json(
      { success: false, error: "Failed to update location" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const tracking = await Tracking.findOne({ userId: auth.user.id }).lean();

    if (!tracking) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          lat:       tracking.liveLocation.lat,
          lng:       tracking.liveLocation.lng,
          speedKmh:  tracking.speedKmh,
          heading:   tracking.heading,
          updatedAt: tracking.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/tracking/update]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch location" },
      { status: 500 }
    );
  }
}