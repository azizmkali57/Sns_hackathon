import mongoose from "mongoose";

const sosSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    trackingLink: {
      type:    String,
      default: null,
    },

    contactsNotified: [
      {
        contactId:    { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
        phone:        { type: String },
        smsSent:      { type: Boolean, default: false },
        whatsappSent: { type: Boolean, default: false },
      },
    ],

    resolvedAt: {
      type:    Date,
      default: null,
    },

    triggeredAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

sosSchema.index({ userId: 1, triggeredAt: -1 });

export default mongoose.models.SOS || mongoose.model("SOS", sosSchema);