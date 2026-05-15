// app/api/contacts/add/route.js

import { NextResponse } from "next/server";
import { addContact }   from "@/services/contactService.js";
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
    const { name, phone, email = null, relation, isPrimary = false } = body;

    const contact = await addContact(auth.user.id, { name, phone, email, relation, isPrimary });

    return NextResponse.json(
      {
        success: true,
        data: {
          id:        contact._id,
          name:      contact.name,
          phone:     contact.phone,
          email:     contact.email,
          relation:  contact.relation,
          isPrimary: contact.isPrimary,
          createdAt: contact.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/contacts/add]", err);
    const isValidation = ["required", "Maximum", "allowed", "E.164", "format"].some(
      (w) => err.message.includes(w)
    );
    return NextResponse.json(
      { success: false, error: err.message },
      { status: isValidation ? 400 : 500 }
    );
  }
}