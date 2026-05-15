// Models/contact.js

import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    phone: {
      type:     String,
      required: true,
      trim:     true,
    },
    relation: {
      type:     String,
      required: true,
      trim:     true,
    },
    isPrimary: {
      type:    Boolean,
      default: false,
    },

    // ── Twilio Caller ID verification ─────────────────────────────────────
    twilioVerified: {
      type:    Boolean,
      default: false,       // true once they enter the OTP from Twilio's call
    },
    twilioValidationCode: {
      type:    String,
      default: null,        // 6-digit code Twilio reads out during the call
    },
    twilioVerificationSentAt: {
      type:    Date,
      default: null,        // when we triggered the Twilio verification call
    },

    // ── WhatsApp sandbox (kept for WA alerts) ─────────────────────────────
    sandboxJoined: {
      type:    Boolean,
      default: false,
    },
    sandboxInviteSentAt: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Contact ||
  mongoose.model("Contact", contactSchema);