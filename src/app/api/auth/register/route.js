import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/connectDB";
import User from "@/Models/User";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required" },
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

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { message: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (phone) {
      const phoneRegex = /^\+?[\d\s\-().]{7,15}$/;
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { message: "Invalid phone number format" },
          { status: 400 }
        );
      }
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      password: hashedPassword,
      role: "user",
    });

    const tokenPayload = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };

    const response = NextResponse.json(
      {
        message: "Account created successfully",
        user: safeUser,
        token,
      },
      { status: 201 }
    );

    response.cookies.set("sns_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}