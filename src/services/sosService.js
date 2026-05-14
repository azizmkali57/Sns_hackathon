import connectDB         from "@/lib/connectDB.js";
import SOS               from "@/Models/SOS.js";
import Contact           from "@/Models/contact.js";
import NavigationSession from "@/Models/NavigationSession.js";
import { sendSOSAlert }  from "@/lib/twilio.js";

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res  = await fetch(url, {
      headers: { "User-Agent": "SafeRouteNavigationSystem/1.0" },
      signal:  AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return data?.display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/**
 * @param {object} p
 * @param {string}  p.userId
 * @param {string}  p.userName           — for the SMS message
 * @param {{ lat:number, lng:number }} p.location
 * @param {string}  p.sessionId          — optional
 * @param {number}  p.safetyScore        — score at trigger time
 * @param {string}  p.triggerMethod      — "manual" | "auto_low_score" etc.
 *
 * @returns {Promise<SOSResult>}
 */
export async function triggerSOS({
  userId,
  userName,
  location,
  sessionId     = null,
  safetyScore   = null,
  triggerMethod = "manual",
}) {
  await connectDB();

  const contacts = await Contact.find({ userId }).lean();

  if (!contacts.length) {
    console.warn(`[sosService] No contacts for user ${userId} — SOS logged only`);
  }

  const address       = await reverseGeocode(location.lat, location.lng);
  const trackingLink  = `https://maps.google.com/?q=${location.lat},${location.lng}`;

  const notifiedContacts = await Promise.all(
    contacts.map(async (c) => {
      const result = await sendSOSAlert(
        c.phone,
        userName,
        location,
        trackingLink
      );

      return {
        contactId:    c._id,
        name:         c.name,
        phone:        c.phone,
        smsSent:      result.smsSent,
        whatsappSent: result.whatsappSent,
        sentAt:       new Date(),
        smsSid:       result.smsSid,
        whatsappSid:  result.whatsappSid,
      };
    })
  );

  const allSmsSent      = notifiedContacts.every((c) => c.smsSent);
  const allWhatsappSent = notifiedContacts.every((c) => c.whatsappSent);
  const twilioSids      = notifiedContacts
    .flatMap((c) => [c.smsSid, c.whatsappSid])
    .filter(Boolean);

  const sosDoc = await SOS.create({
    userId,
    sessionId:            sessionId ?? null,
    location:             { lat: location.lat, lng: location.lng, address },
    safetyScoreAtTrigger: safetyScore,
    smsStatus:            allSmsSent      ? "sent" : notifiedContacts.some((c) => c.smsSent)      ? "sent" : "failed",
    whatsappStatus:       allWhatsappSent ? "sent" : notifiedContacts.some((c) => c.whatsappSent) ? "sent" : "failed",
    notifiedContacts:     notifiedContacts.map(({ smsSid, whatsappSid, ...rest }) => rest),
    trackingLink,
    triggerMethod,
    twilioSids,
  });

  if (sessionId) {
    await NavigationSession.findByIdAndUpdate(sessionId, {
      status: "sos_triggered",
      "sosDetails.triggered":        true,
      "sosDetails.triggeredAt":      new Date(),
      "sosDetails.location":         location,
      "sosDetails.smsSent":          allSmsSent,
      "sosDetails.whatsappSent":     allWhatsappSent,
      "sosDetails.contactsNotified": contacts.map((c) => c.phone),
    });
  }

  return {
    success:          true,
    sosId:            sosDoc._id,
    contactsNotified: notifiedContacts.length,
    smsSent:          allSmsSent,
    whatsappSent:     allWhatsappSent,
    trackingLink,
    address,
    notifiedContacts: notifiedContacts.map((c) => ({
      name:         c.name,
      smsSent:      c.smsSent,
      whatsappSent: c.whatsappSent,
    })),
  };
}

export async function resolveSOS(sosId, userId) {
  await connectDB();

  const doc = await SOS.findById(sosId);
  if (!doc)                                      throw new Error("SOS record not found");
  if (String(doc.userId) !== String(userId))     throw new Error("Unauthorized");
  if (doc.resolved)                              throw new Error("SOS already resolved");

  doc.resolved   = true;
  doc.resolvedAt = new Date();
  await doc.save();

  return { success: true, sosId, resolvedAt: doc.resolvedAt };
}

export async function getSOSHistory(userId, limit = 10) {
  await connectDB();
  return SOS.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("-twilioSids")
    .lean();
}