// app/api/track/[token]/route.js
// PUBLIC endpoint — no auth required (guardian has no account)
import { NextResponse } from "next/server";
import connectDB        from "@/lib/connectDB";
import SOS              from "@/Models/SOS";
import User             from "@/Models/User";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { token } = await params; // ✅ Next.js 15 — await the Promise

    if (!token) {
      return NextResponse.json({ success: false, error: "Token required" }, { status: 400 });
    }

    const sos = await SOS.findOne({ trackingToken: token }).lean();

    if (!sos) {
      return NextResponse.json({ success: false, error: "Invalid or expired tracking link" }, { status: 404 });
    }

    if (sos.expiresAt && new Date() > new Date(sos.expiresAt)) {
      return NextResponse.json({ success: false, error: "This tracking link has expired" }, { status: 410 });
    }

    const user = await User.findById(sos.userId).select("name phone").lean();

    return NextResponse.json({
      success:     true,
      userName:    user?.name ?? "Unknown",
      userPhone:   user?.phone ?? null,
      location:    sos.location,
      triggeredAt: sos.triggeredAt,
      updatedAt:   sos.locationUpdatedAt ?? sos.triggeredAt,
      expiresAt:   sos.expiresAt,
      active:      sos.active,
    }, { status: 200 });

  } catch (err) {
    console.error("[GET /api/track/:token]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch location" }, { status: 500 });
  }
}