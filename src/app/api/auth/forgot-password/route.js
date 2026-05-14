import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/connectDB";
import User from "@/Models/User";
import { sendResetEmail } from "@/lib/mailer";

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json(
        { message: "If this email exists, a reset link has been sent" },
        { status: 200 }
      );
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await User.findByIdAndUpdate(user._id, {
      resetToken: resetTokenHash,
      resetTokenExpiry,
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    await sendResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    return NextResponse.json(
      { message: "If this email exists, a reset link has been sent" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}