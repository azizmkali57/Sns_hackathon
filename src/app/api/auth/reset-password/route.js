import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/connectDB";
import User from "@/Models/User";

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, token, newPassword } = body;

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { message: "Email, token, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetToken: tokenHash,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}