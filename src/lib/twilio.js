const ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const FROM_PHONE   = process.env.TWILIO_PHONE_NUMBER;        
const FROM_WA      = process.env.TWILIO_WHATSAPP_NUMBER;    

async function twilioRequest(endpoint, body) {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    console.warn("[twilio] Missing credentials — message skipped");
    return { success: false, error: "Twilio credentials not configured" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/${endpoint}`;
  const credentials = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");

  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: {
        Authorization:  `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[twilio] API error:", data.message);
      return { success: false, error: data.message, sid: null };
    }

    return { success: true, sid: data.sid };
  } catch (err) {
    console.error("[twilio] Network error:", err.message);
    return { success: false, error: err.message, sid: null };
  }
}

/**
 * @param {string} to    
 * @param {string} body 
 * @returns {Promise<{success:boolean, sid?:string, error?:string}>}
 */
export async function sendSMS(to, body) {
  return twilioRequest("Messages.json", {
    From: FROM_PHONE,
    To:   to,
    Body: body,
  });
}

/**
 * @param {string} to    Phone number e.g. "+919876543210" (no whatsapp: prefix needed)
 * @param {string} body  Message text
 */
export async function sendWhatsApp(to, body) {
  const whatsappTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const from       = FROM_WA?.startsWith("whatsapp:") ? FROM_WA : `whatsapp:${FROM_WA}`;

  if (!FROM_WA) {
    console.warn("[twilio] TWILIO_WHATSAPP_NUMBER not set — WhatsApp skipped");
    return { success: false, error: "WhatsApp sender not configured" };
  }

  return twilioRequest("Messages.json", {
    From: from,
    To:   whatsappTo,
    Body: body,
  });
}

// ─── SOS blast ────────────────────────────────────────────────────────────────

/**
 * Send SOS via both SMS + WhatsApp to a single contact
 * Returns per-channel results
 *
 * @param {string} to            E.164 phone
 * @param {string} userName      Name of the person in distress
 * @param {{ lat:number, lng:number }} location
 * @param {string} trackingLink  Google Maps URL
 */
export async function sendSOSAlert(to, userName, location, trackingLink) {
  const body =
    `🆘 *SOS ALERT — SafeRoute*\n\n` +
    `${userName} may be in danger and needs help immediately.\n\n` +
    `📍 Live Location:\n${trackingLink}\n\n` +
    `🗺 Coordinates: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}\n\n` +
    `Reply SAFE if everything is okay. This alert was sent automatically by SafeRoute Navigation System.`;

  const [sms, whatsapp] = await Promise.all([
    sendSMS(to, body),
    sendWhatsApp(to, body),
  ]);

  return {
    smsSent:      sms.success,
    whatsappSent: whatsapp.success,
    smsSid:       sms.sid    ?? null,
    whatsappSid:  whatsapp.sid ?? null,
    smsError:     sms.error  ?? null,
    whatsappError: whatsapp.error ?? null,
  };
}

/**
 * @param {string} to
 * @param {string} userName
 * @param {number} safetyScore
 * @param {string} areaDescription
 */
export async function sendSafetyWarning(to, userName, safetyScore, areaDescription) {
  const body =
    `⚠️ SafeRoute Safety Alert\n\n` +
    `${userName} has entered a low-safety area.\n` +
    `Safety Score: ${safetyScore}/100\n` +
    `Location: ${areaDescription}\n\n` +
    `They have been notified. Monitor their journey on SafeRoute.`;

  return sendSMS(to, body);
}