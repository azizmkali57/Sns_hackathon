// services/contactService.js

import connectDB from "@/lib/connectDB";
import Contact   from "@/Models/contact";

const ALLOWED_RELATIONS = [
  "Mother", "Father", "Sister", "Brother",
  "Friend", "Spouse", "Partner", "Colleague", "Other",
];

function validatePhone(phone) {
  return /^\+[1-9]\d{6,14}$/.test(phone.trim());
}

function normalisePhone(phone) {
  const p = phone?.trim() ?? "";
  if (/^\d{10}$/.test(p))  return "+91" + p;
  if (/^0\d{10}$/.test(p)) return "+91" + p.slice(1);
  return p;
}

const MAX_CONTACTS = 5;

// ─── addContact ───────────────────────────────────────────────────────────────

export async function addContact(userId, { name, phone, email = null, relation, isPrimary = false }) {
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

  const contact = await Contact.create({
    userId,
    name:      name.trim(),
    phone:     normalisedPhone,
    email:     email?.trim()?.toLowerCase() || null,
    relation:  relation.trim(),
    isPrimary: !!isPrimary,
  });

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
  if (!contact)                                        throw new Error("Contact not found");
  if (contact.userId.toString() !== userId.toString()) throw new Error("Unauthorized");
  await contact.deleteOne();
  return { deleted: true, contactId };
}

// ─── updateContact ────────────────────────────────────────────────────────────

export async function updateContact(contactId, userId, updates) {
  await connectDB();
  const contact = await Contact.findById(contactId);
  if (!contact)                                        throw new Error("Contact not found");
  if (contact.userId.toString() !== userId.toString()) throw new Error("Unauthorized");

  const allowed = ["name", "phone", "email", "relation", "isPrimary"];
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