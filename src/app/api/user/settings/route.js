import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import connectDB from "@/lib/connectDB";
import User from "@/Models/User";

// GET /api/user/settings
export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(auth.user.id).select("settings");
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      settings: user.settings ?? {
        notifications: true,
        guardian: true,
        sosAuto: true,
        whatsapp: true,
        crowdsource: false,
      },
    });
  } catch (error) {
    console.error("GET /api/user/settings error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/user/settings
export async function PUT(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await request.json();

    const allowed = ["notifications", "guardian", "sosAuto", "whatsapp", "crowdsource"];
    const settings = {};
    for (const key of allowed) {
      if (typeof body[key] === "boolean") settings[key] = body[key];
    }

    const user = await User.findByIdAndUpdate(
      auth.user.id,
      { $set: { settings } },
      { new: true, select: "settings" }
    );

    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json({ success: true, settings: user.settings });
  } catch (error) {
    console.error("PUT /api/user/settings error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}