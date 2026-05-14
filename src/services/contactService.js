import connectDB from "@/lib/connectDB";
import Contact   from "@/Models/contact";

const ALLOWED_RELATIONS = [
  "Mother", "Father", "Sister", "Brother",
  "Friend", "Spouse", "Partner", "Colleague", "Other",
];

function validatePhone(phone) {
  return /^\+[1-9]\d{6,14}$/.test(phone.trim());
}

const MAX_CONTACTS = 5;


/**
 * @param {string} userId
 * @param {{ name:string, phone:string, relation:string, isPrimary?:boolean }} data
 */
export async function addContact(userId, { name, phone, relation, isPrimary = false }) {
  await connectDB();

  if (!name?.trim())     throw new Error("Name is required");
  if (!phone?.trim())    throw new Error("Phone number is required");
  if (!relation?.trim()) throw new Error("Relation is required");

  if (!validatePhone(phone.trim())) {
    throw new Error(
      "Phone must be in E.164 format (e.g. +919876543210)"
    );
  }

  if (!ALLOWED_RELATIONS.includes(relation.trim())) {
    throw new Error(
      `Relation must be one of: ${ALLOWED_RELATIONS.join(", ")}`
    );
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
    phone:     phone.trim(),
    relation:  relation.trim(),
    isPrimary: !!isPrimary,
  });

  return contact;
}

/**
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getContacts(userId) {
  await connectDB();
  return Contact.find({ userId })
    .sort({ isPrimary: -1, createdAt: 1 })
    .lean();
}

/**
 * @param {string} contactId
 * @param {string} userId
 */
export async function deleteContact(contactId, userId) {
  await connectDB();

  const contact = await Contact.findById(contactId);
  if (!contact) throw new Error("Contact not found");
  if (contact.userId.toString() !== userId.toString())
    throw new Error("Unauthorized");

  await contact.deleteOne();
  return { deleted: true, contactId };
}

/**
 * @param {string} contactId
 * @param {string} userId
 * @param {Partial<{name,phone,relation,isPrimary}>} updates
 */
export async function updateContact(contactId, userId, updates) {
  await connectDB();

  const contact = await Contact.findById(contactId);
  if (!contact) throw new Error("Contact not found");
  if (contact.userId.toString() !== userId.toString())
    throw new Error("Unauthorized");

  const allowed = ["name", "phone", "relation", "isPrimary"];
  for (const key of Object.keys(updates)) {
    if (!allowed.includes(key)) {
      throw new Error(`Field '${key}' is not allowed`);
    }
  }

  if (updates.phone && !validatePhone(updates.phone.trim())) {
    throw new Error("Phone must be in E.164 format (e.g. +919876543210)");
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