// app/api/sos/route.js
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import connectDB        from "@/lib/connectDB";
import SOS              from "@/Models/SOS";
import User             from "@/Models/User";
import Contact          from "@/Models/contact";
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

    const userId = auth.user.id;
    await connectDB();

    // ── Location ──────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    let { lat, lng } = body;

    if (lat == null || lng == null) {
      const tracking = await Tracking.findOne({ userId }).lean();
      if (tracking?.liveLocation?.lat != null) {
        lat = tracking.liveLocation.lat;
        lng = tracking.liveLocation.lng;
      } else {
        lat = 0; lng = 0;
      }
    }

    // ── User ──────────────────────────────────────────────────────────────
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // ── Contacts ──────────────────────────────────────────────────────────
    const contacts = await Contact.find({ userId }).lean();
    if (!contacts.length) {
      return NextResponse.json(
        { success: false, error: "No emergency contacts found. Please add contacts first." },
        { status: 400 }
      );
    }

    const hasRealLocation = lat !== 0 && lng !== 0;

    // ── Generate unique tracking token (live link) ────────────────────────
    const trackingToken   = randomUUID();
    const expiresAt       = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
    const baseUrl         = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const liveTrackingUrl = `${baseUrl}/track/${trackingToken}`;

    // Static snapshot as fallback (opens Google Maps immediately)
    const snapshotLink = hasRealLocation
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : null;

    // ── Persist SOS record ────────────────────────────────────────────────
    const sosRecord = await SOS.create({
      userId,
      location:         { lat, lng },
      trackingToken,
      liveTrackingUrl,
      trackingLink:     snapshotLink ?? "unavailable",
      expiresAt,
      active:           true,
      contactsNotified: contacts.map((c) => ({
        contactId:    c._id,
        phone:        c.phone,
        smsSent:      false,
        whatsappSent: false,
      })),
      triggeredAt: new Date(),
    });

    // ── Return everything frontend needs ──────────────────────────────────
    return NextResponse.json({
      success:         true,
      sosId:           sosRecord._id,
      userName:        user.name,
      userPhone:       user.phone ?? null,
      location:        { lat, lng },
      trackingToken,
      liveTrackingUrl, // ← share THIS link in WhatsApp / email
      snapshotLink,    // ← fallback static map link
      expiresAt,
      triggeredAt:     sosRecord.triggeredAt,
      contacts:        contacts.map((c) => ({
        id:       c._id,
        name:     c.name,
        phone:    c.phone,
        email:    c.email ?? null,
        relation: c.relation,
      })),
    }, { status: 200 });

  } catch (err) {
    console.error("[POST /api/sos] FATAL:", err);
    return NextResponse.json(
      { success: false, error: err.message || "SOS failed" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const history = await SOS.find({ userId: auth.user.id })
      .sort({ triggeredAt: -1 }).limit(10).lean();
    return NextResponse.json({ success: true, data: history }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Failed to fetch SOS history" }, { status: 500 });
  }
}