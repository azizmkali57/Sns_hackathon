import mongoose from "mongoose";

const trackingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NavigationSession",
      default: null,
    },

    liveLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      default: null,
    },

    distanceFromRoute: {
      type: Number,
      default: 0,
    },

    progressPercent: {
      type: Number,
      default: 0,
    },

    remainingKm: {
      type: Number,
      default: 0,
    },

    locationSafetyScore: {
      type: Number,
      default: null,
    },

    isOffRoute: {
      type: Boolean,
      default: false,
    },

    speedKmh: {
      type: Number,
      default: 0,
    },

    heading: {
      type: Number,
      default: 0,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

trackingSchema.index({ userId: 1 }, { unique: true });
trackingSchema.index({ sessionId: 1 });

export default mongoose.models.Tracking ||
  mongoose.model("Tracking", trackingSchema);