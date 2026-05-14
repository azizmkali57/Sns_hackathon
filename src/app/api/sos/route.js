import { NextResponse }  from "next/server";
import connectDB         from "@/lib/connectDB";
import SOS               from "@/Models/SOS";
import User              from "@/Models/User";
import Contact           from "@/Models/contact";
import Tracking          from "@/Models/Tracking";
import { sendSOSAlert }  from "@/lib/twilio";
import { verifyAuth }    from "@/lib/auth";

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

    const body = await req.json().catch(() => ({}));
    let { lat, lng } = body;

    if (lat == null || lng == null) {
      const tracking = await Tracking.findOne({ userId }).lean();
      if (!tracking?.liveLocation) {
        return NextResponse.json(
          { success: false, error: "No location available. Please enable location sharing." },
          { status: 400 }
        );
      }
      lat = tracking.liveLocation.lat;
      lng = tracking.liveLocation.lng;
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const contacts = await Contact.find({ userId }).lean();
    if (!contacts.length) {
      return NextResponse.json(
        { success: false, error: "No emergency contacts found. Please add contacts first." },
        { status: 400 }
      );
    }

    const trackingLink = `https://www.google.com/maps?q=${lat},${lng}`;

    const deliveryResults = await Promise.all(
      contacts.map(async (c) => {
        const result = await sendSOSAlert(c.phone, user.name, { lat, lng }, trackingLink);
        return {
          contactId:    c._id.toString(),
          contactName:  c.name,
          phone:        c.phone,
          smsSent:      result.smsSent,
          whatsappSent: result.whatsappSent,
          smsError:     result.smsError     ?? null,
          whatsappError: result.whatsappError ?? null,
        };
      })
    );

    const sosRecord = await SOS.create({
      userId,
      location:        { lat, lng },
      trackingLink,
      contactsNotified: deliveryResults.map((r) => ({
        contactId:    r.contactId,
        phone:        r.phone,
        smsSent:      r.smsSent,
        whatsappSent: r.whatsappSent,
      })),
      triggeredAt: new Date(),
    });

    const anySuccess = deliveryResults.some((r) => r.smsSent || r.whatsappSent);

    return NextResponse.json(
      {
        success:  true,
        sosId:    sosRecord._id,
        location: { lat, lng },
        results:  deliveryResults,
        message:  anySuccess
          ? `SOS sent to ${deliveryResults.length} contact(s)`
          : "SOS recorded but message delivery failed — check Twilio credentials",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/sos]", err);
    return NextResponse.json(
      { success: false, error: "SOS failed — internal server error" },
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

    const history = await SOS.find({ userId: auth.user.id })
      .sort({ triggeredAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({ success: true, data: history }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/sos]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch SOS history" },
      { status: 500 }
    );
  }
}