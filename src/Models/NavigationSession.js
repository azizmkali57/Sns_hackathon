import mongoose from "mongoose";

const navigationSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "sos_triggered"],
      default: "active",
    },

    selectedRouteIndex: {
      type: Number,
      default: 0,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    startLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: "" },
    },

    endLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: "" },
    },

    breadcrumbs: [
      {
        lat:       { type: Number, required: true },
        lng:       { type: Number, required: true },
        timestamp: { type: Date,   default: Date.now },
      },
    ],

    safetyScore: {
      type: Number,
      default: 0,
    },

    alertsTriggered: [
      {
        type:      { type: String },   
        message:   { type: String },
        location:  {
          lat: Number,
          lng: Number,
        },
        firedAt:   { type: Date, default: Date.now },
      },
    ],

    sosDetails: {
      triggered:   { type: Boolean, default: false },
      triggeredAt: { type: Date,    default: null },
      location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
      smsSent:      { type: Boolean, default: false },
      whatsappSent: { type: Boolean, default: false },
      contactsNotified: [{ type: String }],
    },

    guardianContacts: [
      {
        name:  { type: String },
        phone: { type: String },
        notifiedAt: { type: Date, default: Date.now },
      },
    ],

    summary: {
      totalDistanceKm:   { type: Number, default: 0 },
      totalDurationMins: { type: Number, default: 0 },
      averageSafetyScore:{ type: Number, default: 0 },
      incidentsNearby:   { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

navigationSessionSchema.index({ userId: 1, status: 1 });
navigationSessionSchema.index({ userId: 1, startedAt: -1 });

export default mongoose.models.NavigationSession ||
  mongoose.model("NavigationSession", navigationSessionSchema);