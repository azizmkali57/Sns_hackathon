import connectDB                  from "@/lib/connectDB";
import Contact                    from "@/Models/contact";
import { addToVerifiedCallerIds } from "@/lib/twilio";  

const ALLOWED_RELATIONS = [
  "Mother", "Father", "Sister", "Brother",
  "Friend", "Spouse", "Partner", "Colleague", "Other",
];

function validatePhone(phone) {
  return /^\+[1-9]\d{6,14}$/.test(phone.trim());
}

function normalisePhone(phone) {
  const p = phone?.trim() ?? "";
  if (/^\d{10}$/.test(p))  return "+91" + p;           // 9876543210   → +919876543210
  if (/^0\d{10}$/.test(p)) return "+91" + p.slice(1);  // 09876543210  → +919876543210
  return p;                                              // already E.164 or other
}

const MAX_CONTACTS = 5;

// ─── addContact ───────────────────────────────────────────────────────────────

export async function addContact(userId, { name, phone, relation, isPrimary = false }, userName = "") {
  await connectDB();

  if (!name?.trim())     throw new Error("Name is required");
  if (!phone?.trim())    throw new Error("Phone number is required");
  if (!relation?.trim()) throw new Error("Relation is required");

  const normalisedPhone = normalisePhone(phone);

  if (!validatePhone(normalisedPhone)) {
    throw new Error("Phone must be in E.164 format (e.g. +919876543210 or plain 10 digits)");
  }

  if (!ALLOWED_RELATIONS.includes(relation.trim())) {
    throw new Error(`Relation must be one of: ${ALLOWED_RELATIONS.join(", ")}`);
  }

  const count = await Contact.countDocuments({ userId });
  if (count >= MAX_CONTACTS) {
    throw new Error(`Maximum ${MAX_CONTACTS} emergency contacts allowed`);
  }

  if (isPrimary) {
    await Contact.updateMany({ userId }, { $set: { isPrimary: false } });
  }

  // ── Save contact first ─────────────────────────────────────────────────────
  const contact = await Contact.create({
    userId,
    name:                     name.trim(),
    phone:                    normalisedPhone,
    relation:                 relation.trim(),
    isPrimary:                !!isPrimary,
    twilioVerified:           false,
    twilioValidationCode:     null,
    twilioVerificationSentAt: null,
    sandboxJoined:            false,
    sandboxInviteSentAt:      null,
  });

  // ── Trigger Twilio Caller ID verification call (non-blocking) ──────────────
  // Twilio calls the contact's number and reads out a 6-digit code automatically.
  // Once they receive it, the user clicks "Mark Verified" on the Guardian page.
  addToVerifiedCallerIds(normalisedPhone)
    .then(async (verification) => {
      if (verification.success) {
        contact.twilioValidationCode     = verification.validationCode;
        contact.twilioVerificationSentAt = new Date();
        await contact.save();
        console.log(`[contactService] Verification call sent to ${normalisedPhone}, code: ${verification.validationCode}`);
      } else {
        console.warn(`[contactService] Verification call failed for ${normalisedPhone}:`, verification.error);
      }
    })
    .catch((err) => console.error("[contactService] addToVerifiedCallerIds error:", err.message));

  return contact;
}

// ─── getContacts ──────────────────────────────────────────────────────────────

export async function getContacts(userId) {
  await connectDB();
  return Contact.find({ userId })
    .sort({ isPrimary: -1, createdAt: 1 })
    .lean();
}

// ─── deleteContact ────────────────────────────────────────────────────────────

export async function deleteContact(contactId, userId) {
  await connectDB();
  const contact = await Contact.findById(contactId);
  if (!contact)                                          throw new Error("Contact not found");
  if (contact.userId.toString() !== userId.toString())   throw new Error("Unauthorized");
  await contact.deleteOne();
  return { deleted: true, contactId };
}

// ─── updateContact ────────────────────────────────────────────────────────────

export async function updateContact(contactId, userId, updates) {
  await connectDB();
  const contact = await Contact.findById(contactId);
  if (!contact)                                          throw new Error("Contact not found");
  if (contact.userId.toString() !== userId.toString())   throw new Error("Unauthorized");

  const allowed = ["name", "phone", "relation", "isPrimary", "sandboxJoined", "twilioVerified", "twilioValidationCode", "twilioVerificationSentAt"];
  for (const key of Object.keys(updates)) {
    if (!allowed.includes(key)) throw new Error(`Field '${key}' is not allowed`);
  }

  if (updates.phone) {
    updates.phone = normalisePhone(updates.phone);
    if (!validatePhone(updates.phone)) {
      throw new Error("Phone must be in E.164 format (e.g. +919876543210)");
    }
  }

  if (updates.relation && !ALLOWED_RELATIONS.includes(updates.relation.trim())) {
    throw new Error(`Relation must be one of: ${ALLOWED_RELATIONS.join(", ")}`);
  }

  if (updates.isPrimary === true) {
    await Contact.updateMany(
      { userId, _id: { $ne: contactId } },
      { $set: { isPrimary: false } }
    );
  }

  Object.assign(contact, updates);
  await contact.save();
  return contact;
}

// ─── resendVerificationCall ───────────────────────────────────────────────────

export async function resendVerificationCall(contactId, userId) {
  await connectDB();
  const contact = await Contact.findById(contactId);
  if (!contact)                                          throw new Error("Contact not found");
  if (contact.userId.toString() !== userId.toString())   throw new Error("Unauthorized");

  const verification = await addToVerifiedCallerIds(contact.phone, 0);

  if (verification.success) {
    contact.twilioValidationCode     = verification.validationCode;
    contact.twilioVerificationSentAt = new Date();
    contact.twilioVerified           = false;
    await contact.save();
  }

  return {
    success:             verification.success,
    error:               verification.error ?? null,
    twilioValidationCode: verification.validationCode ?? null,
  };
}

// ─── markTwilioVerified ───────────────────────────────────────────────────────

export async function markTwilioVerified(contactId, userId) {
  await connectDB();
  const contact = await Contact.findById(contactId);
  if (!contact)                                          throw new Error("Contact not found");
  if (contact.userId.toString() !== userId.toString())   throw new Error("Unauthorized");

  contact.twilioVerified = true;
  await contact.save();
  return contact;
}