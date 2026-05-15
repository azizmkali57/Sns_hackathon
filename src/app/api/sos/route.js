// app/api/sos/route.js

import { NextResponse } from "next/server";
import connectDB        from "@/lib/connectDB";
import SOS              from "@/Models/SOS";
import User             from "@/Models/User";
import Contact          from "@/Models/contact";
import Tracking         from "@/Models/Tracking";
import { sendSOSAlert } from "@/lib/twilio";
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

    // ── Location ───────────────────────────────────────────────────────────
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

    console.log(`[SOS] userId:${userId} lat:${lat} lng:${lng}`);

    // ── User & contacts ────────────────────────────────────────────────────
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const contacts = await Contact.find({ userId }).lean();
    if (!contacts.length) {
      return NextResponse.json(
        { success: false, error: "No emergency contacts found. Please add contacts first." },
        { status: 400 }
      );
    }

    const hasRealLocation = lat !== 0 && lng !== 0;
    const trackingLink    = hasRealLocation
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : "Location unavailable at time of SOS";

    // ── Blast SOS ──────────────────────────────────────────────────────────
    const deliveryResults = await Promise.all(
      contacts.map(async (c) => {
        let phone = c.phone?.trim() ?? "";
        if (phone && !phone.startsWith("+")) phone = "+" + phone.replace(/^0+/, "");

        // SMS works once twilioVerified = true (number in Twilio verified list)
        // WhatsApp works if sandboxJoined = true
        console.log(`[SOS] → ${c.name} (${phone}) verified:${c.twilioVerified} sandbox:${c.sandboxJoined}`);

        const result = await sendSOSAlert(
          phone,
          user.name,
          { lat, lng },
          trackingLink,
          c.sandboxJoined ?? false
        );

        console.log(`[SOS] ${c.name}: SMS=${result.smsSent} WA=${result.whatsappSent}`,
          result.smsError ?? "", result.whatsappError ?? "");

        return {
          contactId:      c._id.toString(),
          contactName:    c.name,
          phone,
          twilioVerified: c.twilioVerified ?? false,
          sandboxJoined:  c.sandboxJoined  ?? false,
          smsSent:        result.smsSent,
          whatsappSent:   result.whatsappSent,
          smsError:       result.smsError      ?? null,
          whatsappError:  result.whatsappError ?? null,
        };
      })
    );

    // ── Persist ────────────────────────────────────────────────────────────
    const sosRecord = await SOS.create({
      userId,
      location:         { lat, lng },
      trackingLink,
      contactsNotified: deliveryResults.map((r) => ({
        contactId:    r.contactId,
        phone:        r.phone,
        smsSent:      r.smsSent,
        whatsappSent: r.whatsappSent,
      })),
      triggeredAt: new Date(),
    });

    const smsCount = deliveryResults.filter((r) => r.smsSent).length;
    const waCount  = deliveryResults.filter((r) => r.whatsappSent).length;

    return NextResponse.json({
      success:  true,
      sosId:    sosRecord._id,
      location: { lat, lng },
      results:  deliveryResults,
      summary:  { total: deliveryResults.length, smsSent: smsCount, whatsappSent: waCount },
      message:  smsCount > 0
        ? `SOS SMS sent to ${smsCount} contact(s)${waCount > 0 ? `, WhatsApp to ${waCount}` : ""}`
        : "SOS recorded — SMS failed. Ensure contacts are Twilio-verified.",
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