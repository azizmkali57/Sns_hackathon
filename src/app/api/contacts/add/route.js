// app/api/contacts/add/route.js

import { NextResponse }              from "next/server";
import { verifyAuth }                from "@/lib/auth";
import connectDB                     from "@/lib/connectDB";
import User                          from "@/Models/User";
import Contact                       from "@/Models/contact";
import { addToVerifiedCallerIds }    from "@/lib/twilio";

const ALLOWED_RELATIONS = [
  "Mother", "Father", "Sister", "Brother",
  "Friend", "Spouse", "Partner", "Colleague", "Other",
];

function normalisePhone(phone) {
  const p = phone?.trim() ?? "";
  if (/^\d{10}$/.test(p))  return "+91" + p;
  if (/^0\d{10}$/.test(p)) return "+91" + p.slice(1);
  return p;
}

function validatePhone(phone) {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

export async function POST(req) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please sign in" },
        { status: 401 }
      );
    }

    await connectDB();

    const user     = await User.findById(auth.user.id).lean();
    const userName = user?.name ?? "A SafeRoute user";

    const body = await req.json().catch(() => ({}));
    const { name, phone, relation, isPrimary = false } = body;

    // ── Validate ───────────────────────────────────────────────────────────
    if (!name?.trim())     throw new Error("Name is required");
    if (!phone?.trim())    throw new Error("Phone number is required");
    if (!relation?.trim()) throw new Error("Relation is required");

    const normalisedPhone = normalisePhone(phone);
    if (!validatePhone(normalisedPhone)) {
      throw new Error("Phone must be in E.164 format (e.g. +919876543210 or 10 digits)");
    }
    if (!ALLOWED_RELATIONS.includes(relation.trim())) {
      throw new Error(`Relation must be one of: ${ALLOWED_RELATIONS.join(", ")}`);
    }

    const count = await Contact.countDocuments({ userId: auth.user.id });
    if (count >= 5) throw new Error("Maximum 5 emergency contacts allowed");

    if (isPrimary) {
      await Contact.updateMany({ userId: auth.user.id }, { $set: { isPrimary: false } });
    }

    // ── Step 1: Save contact immediately ──────────────────────────────────
    const contact = await Contact.create({
      userId:    auth.user.id,
      name:      name.trim(),
      phone:     normalisedPhone,
      relation:  relation.trim(),
      isPrimary: !!isPrimary,
      twilioVerified:           false,
      twilioValidationCode:     null,
      twilioVerificationSentAt: null,
      sandboxJoined:            false,
    });

    // ── Step 2: Trigger Twilio Caller ID verification call ────────────────
    // Twilio will CALL the contact's number and read out a 6-digit code.
    // We store that code so we can show it on the UI for the contact to confirm.
    const verification = await addToVerifiedCallerIds(normalisedPhone);

    if (verification.success) {
      // Store the validation code — show it on UI so contact knows what to expect
      contact.twilioValidationCode     = verification.validationCode;
      contact.twilioVerificationSentAt = new Date();
      await contact.save();

      console.log(`[contacts/add] Verification call triggered for ${normalisedPhone}, code: ${verification.validationCode}`);
    } else {
      console.warn(`[contacts/add] Verification call failed for ${normalisedPhone}:`, verification.error);
    }

    return NextResponse.json(
      {
        success: true,
        message: verification.success
          ? `Contact saved. Twilio is calling ${normalisedPhone} now with a 6-digit code to verify the number.`
          : `Contact saved. Auto-verification failed (${verification.error}) — verify manually in Twilio console.`,
        verificationTriggered: verification.success,
        data: {
          id:                       contact._id,
          name:                     contact.name,
          phone:                    contact.phone,
          relation:                 contact.relation,
          isPrimary:                contact.isPrimary,
          twilioVerified:           contact.twilioVerified,
          twilioValidationCode:     contact.twilioValidationCode,
          twilioVerificationSentAt: contact.twilioVerificationSentAt,
          sandboxJoined:            contact.sandboxJoined,
          createdAt:                contact.createdAt,
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