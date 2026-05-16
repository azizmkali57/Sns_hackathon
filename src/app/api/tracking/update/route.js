// app/api/tracking/update/route.js
// Called every 10s from the user's browser/app to push their live GPS position

import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import SOS from "@/Models/SOS";
import Tracking from "@/Models/Tracking";
import { verifyAuth } from "@/lib/auth";

export async function POST(req) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { lat, lng, accuracy } = await req.json();
    if (lat == null || lng == null) {
      return NextResponse.json({ success: false, error: "lat and lng required" }, { status: 400 });
    }

    await connectDB();

    const now = new Date();

    // 1. Update the Tracking doc (used by dashboard live tracker)
    await Tracking.findOneAndUpdate(
      { userId: auth.user.id },
      {
        userId: auth.user.id,
        liveLocation: { lat, lng, accuracy: accuracy ?? null, updatedAt: now },
      },
      { upsert: true, new: true }
    );

    // 2. Also update ALL active SOS records for this user
    //    so /api/track/[token] always returns the freshest location
    await SOS.updateMany(
      { userId: auth.user.id, active: true },
      { $set: { "location.lat": lat, "location.lng": lng, "location.updatedAt": now } }
    );

    return NextResponse.json({ success: true, updatedAt: now });
  } catch (err) {
    console.error("[tracking/update]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}