import { NextResponse }    from "next/server";
import { updateContact }   from "@/services/contactService.js";
import { verifyAuth } from "@/lib/auth";

export async function PATCH(req) {
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
    const { contactId, ...updates } = body;

    if (!contactId)
      return NextResponse.json({ success: false, error: "contactId is required" }, { status: 400 });

    if (!Object.keys(updates).length)
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });

    const contact = await updateContact(contactId, auth.user.id, updates);

    return NextResponse.json(
      {
        success: true,
        data: {
          id:        contact._id,
          name:      contact.name,
          phone:     contact.phone,
          relation:  contact.relation,
          isPrimary: contact.isPrimary,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[PATCH /api/contacts/update]", err);
    const isUnauth   = err.message === "Unauthorized";
    const isNotFound = err.message.includes("not found");
    return NextResponse.json(
      { success: false, error: err.message },
      { status: isUnauth ? 403 : isNotFound ? 404 : 500 }
    );
  }
}