// lib/twilio.js

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const FROM_PHONE  = process.env.TWILIO_PHONE_NUMBER;
const FROM_WA     = process.env.TWILIO_WHATSAPP_NUMBER;

// ─── Core request ─────────────────────────────────────────────────────────────

async function twilioRequest(endpoint, body, method = "POST") {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    console.warn("[twilio] Missing credentials — skipped");
    return { success: false, error: "Twilio credentials not configured" };
  }

  const url         = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/${endpoint}`;
  const credentials = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");

  try {
    const res  = await fetch(url, {
      method,
      headers: {
        Authorization:  `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[twilio] API error:", data.message);
      return { success: false, error: data.message, sid: null, data };
    }
    return { success: true, sid: data.sid, data };
  } catch (err) {
    console.error("[twilio] Network error:", err.message);
    return { success: false, error: err.message, sid: null };
  }
}

// ─── SMS ──────────────────────────────────────────────────────────────────────

export async function sendSMS(to, body) {
  return twilioRequest("Messages.json", { From: FROM_PHONE, To: to, Body: body });
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

export async function sendWhatsApp(to, body) {
  if (!FROM_WA) {
    console.warn("[twilio] TWILIO_WHATSAPP_NUMBER not set — skipped");
    return { success: false, error: "WhatsApp sender not configured" };
  }
  const whatsappTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const from       = FROM_WA.startsWith("whatsapp:") ? FROM_WA : `whatsapp:${FROM_WA}`;
  return twilioRequest("Messages.json", { From: from, To: whatsappTo, Body: body });
}

// ─── Auto-add number to Twilio Verified Caller IDs ───────────────────────────
//
// This calls Twilio's OutgoingCallerIds API which:
// 1. Adds the number to your verified list
// 2. Automatically calls OR SMSes that number with a 6-digit OTP
// 3. Once user submits the OTP, the number becomes verified
//
// Returns: { success, validationCode, callSid, error }

export async function addToVerifiedCallerIds(phone, callDelay = 0) {
  const result = await twilioRequest("OutgoingCallerIds.json", {
    PhoneNumber: phone,
    FriendlyName: `SafeRoute Emergency Contact (${phone})`,
    CallDelay: callDelay,   // seconds before Twilio calls them (0 = immediate)
  });

  if (!result.success) {
    return { success: false, error: result.error, validationCode: null };
  }

  // Twilio returns a validation_code — this is the OTP the user must enter
  // when Twilio calls them. It's NOT the code they enter on your site;
  // it's what Twilio reads out in the automated call.
  const validationCode = result.data?.validation_code ?? null;

  console.log(`[twilio] Caller ID verification started for ${phone}, code: ${validationCode}`);

  return {
    success:        true,
    validationCode, // 6-digit code Twilio will read out during the call
    callSid:        result.data?.account_sid ?? null,
  };
}

// ─── SOS alert ────────────────────────────────────────────────────────────────

export async function sendSOSAlert(to, userName, location, trackingLink, sandboxJoined = false) {
  const coordsText = (location.lat !== 0 && location.lng !== 0)
    ? `🗺 Coordinates: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}\n\n`
    : "";

  const body =
    `🆘 *SOS ALERT — SafeRoute*\n\n` +
    `${userName} may be in danger and needs help immediately.\n\n` +
    `📍 Live Location:\n${trackingLink}\n\n` +
    coordsText +
    `Reply SAFE if everything is okay.\n` +
    `This alert was sent automatically by SafeRoute.`;

  const smsPromise = sendSMS(to, body);
  const whatsappPromise = sandboxJoined
    ? sendWhatsApp(to, body)
    : Promise.resolve({ success: false, error: "Contact has not joined WhatsApp sandbox" });

  const [sms, whatsapp] = await Promise.all([smsPromise, whatsappPromise]);

  return {
    smsSent:       sms.success,
    whatsappSent:  whatsapp.success,
    smsSid:        sms.sid        ?? null,
    whatsappSid:   whatsapp.sid   ?? null,
    smsError:      sms.error      ?? null,
    whatsappError: whatsapp.error ?? null,
  };
}

// ─── Safety warning ───────────────────────────────────────────────────────────

export async function sendSafetyWarning(to, userName, safetyScore, areaDescription) {
  const body =
    `⚠️ SafeRoute Safety Alert\n\n` +
    `${userName} has entered a low-safety area.\n` +
    `Safety Score: ${safetyScore}/100\n` +
    `Location: ${areaDescription}\n\n` +
    `They have been notified. Monitor their journey on SafeRoute.`;
  return sendSMS(to, body);
}