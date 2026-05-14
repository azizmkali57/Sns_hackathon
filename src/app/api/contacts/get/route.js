import { NextResponse } from "next/server";
import { getContacts }  from "@/services/contactService.js";
import { verifyAuth }   from "@/lib/auth";          // ← was missing

export async function GET(req) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please sign in" },
        { status: 401 }
      );
    }

    const contacts = await getContacts(auth.user.id);

    return NextResponse.json(
      { success: true, data: { contacts, total: contacts.length } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/contacts/get]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}