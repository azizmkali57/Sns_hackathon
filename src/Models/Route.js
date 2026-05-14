import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    source: {
      type: String,
      required: true,
    },

    destination: {
      type: String,
      required: true,
    },

    routes: [
      {
        distance: String,
        duration: String,
        geometry: Object,
        checkpoints: [
          {
            lat: Number,
            lng: Number,
          },
        ],
      },
    ],

    safetyScore: {
      type: Number,
      default: 0,
    },

    riskBreakdown: {
      trafficRisk: Number,
      crimeRisk: Number,
      weatherRisk: Number,
      timeRisk: Number,
      overallRisk: Number,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Route ||
  mongoose.model("Route", routeSchema);