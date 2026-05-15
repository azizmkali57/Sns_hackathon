import { NextResponse } from "next/server";
import { verifyAuth }   from "@/lib/auth";
import connectDB        from "@/lib/connectDB";
import Contact          from "@/Models/contact";
// import { addToVerifiedCallerIds } from "@/lib/twilio";

// POST /api/contacts/verify
// Body: { contactId }
// Marks contact as twilioVerified: true in our DB
export async function POST(req) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { contactId } = await req.json().catch(() => ({}));
    if (!contactId) {
      return NextResponse.json({ success: false, error: "contactId is required" }, { status: 400 });
    }

    const contact = await Contact.findById(contactId);
    if (!contact) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }
    if (contact.userId.toString() !== auth.user.id.toString()) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    contact.twilioVerified = true;
    await contact.save();

    return NextResponse.json({
      success: true,
      message: `${contact.name} is now verified. SOS messages will reach them.`,
      data: {
        id:             contact._id,
        twilioVerified: contact.twilioVerified,
      },
    });
  } catch (err) {
    console.error("[POST /api/contacts/verify]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/contacts/verify
// Body: { contactId }  
// Re-triggers the Twilio verification call (resend)
export async function PATCH(req) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { contactId } = await req.json().catch(() => ({}));
    if (!contactId) {
      return NextResponse.json({ success: false, error: "contactId is required" }, { status: 400 });
    }

    const contact = await Contact.findById(contactId);
    if (!contact) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }
    if (contact.userId.toString() !== auth.user.id.toString()) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Re-trigger Twilio call
    const verification = await addToVerifiedCallerIds(contact.phone, 0);

    if (verification.success) {
      contact.twilioValidationCode     = verification.validationCode;
      contact.twilioVerificationSentAt = new Date();
      contact.twilioVerified           = false;
      await contact.save();
    }

    return NextResponse.json({
      success: verification.success,
      message: verification.success
        ? `Verification call re-sent to ${contact.phone}. They'll receive a call with a 6-digit code.`
        : `Failed to re-send: ${verification.error}`,
      data: {
        id:                       contact._id,
        twilioValidationCode:     contact.twilioValidationCode,
        twilioVerificationSentAt: contact.twilioVerificationSentAt,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/contacts/verify]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}