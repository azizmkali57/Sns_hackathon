import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["crime", "accident", "harassment", "unsafe_area", "lighting", "construction", "other"],
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: "" },
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    anonymous: {
      type: Boolean,
      default: false,
    },

    votes: {
      type: Number,
      default: 0,
    },

    votedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    verified: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

incidentSchema.index({ "location.lat": 1, "location.lng": 1 });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ active: 1, expiresAt: 1 });
incidentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

export default mongoose.models.Incident ||
  mongoose.model("Incident", incidentSchema);