// Models/SOS.js
import mongoose from "mongoose";

const SOSSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      "User",
    required: true,
    index:    true,
  },

  // Initial location captured at trigger time
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },

  // ── Live-tracking fields (new) ──────────────────────────────────────────
  trackingToken: {
    type:   String,
    unique: true,
    sparse: true,           // allow old records without a token
    index:  true,
  },
  liveTrackingUrl: {
    type: String,
    default: null,
  },
  locationUpdatedAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  active: {
    type:    Boolean,
    default: true,
    index:   true,
  },
  // ────────────────────────────────────────────────────────────────────────

  // Static Google Maps snapshot link (fallback)
  trackingLink: {
    type:    String,
    default: "unavailable",
  },

  contactsNotified: [
    {
      contactId:    { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
      phone:        String,
      smsSent:      { type: Boolean, default: false },
      whatsappSent: { type: Boolean, default: false },
    },
  ],

  triggeredAt: {
    type:    Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Auto-mark as inactive after expiry when queried
SOSSchema.pre("find",      function () { this.where({ expiresAt: { $gt: new Date() } }).or([{ expiresAt: null }]); });

export default mongoose.models.SOS || mongoose.model("SOS", SOSSchema);