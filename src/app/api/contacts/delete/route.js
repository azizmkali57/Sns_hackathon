import { NextResponse }    from "next/server";
import { deleteContact }   from "@/services/contactService.js";
import { verifyAuth } from "@/lib/auth";

export async function DELETE(req) {
  try {
        const auth = await verifyAuth(req);
        if (!auth.success || !auth.user?.id) {
          return NextResponse.json(
            {
              success: false,
              error: "Unauthorized — please sign in",
            },
            { status: 401 }
          );
        }

    const body = await req.json().catch(() => ({}));
    const { contactId } = body;

    if (!contactId)
      return NextResponse.json({ success: false, error: "contactId is required" }, { status: 400 });

    const result = await deleteContact(contactId, auth.user.id);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/contacts/delete]", err);
    const isUnauth   = err.message === "Unauthorized";
    const isNotFound = err.message.includes("not found");
    return NextResponse.json(
      { success: false, error: err.message },
      { status: isUnauth ? 403 : isNotFound ? 404 : 500 }
    );
  }
}