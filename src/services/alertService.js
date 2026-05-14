import connectDB         from "@/lib/connectDB.js";
import NavigationSession from "@/Models/NavigationSession.js";
import {evaluateThresholds, RISK_THRESHOLDS } from "./riskAnalysisService.js";
import { triggerSOS }    from "./sosService.js";

/**
 * @param {object} ctx
 * @param {string}  ctx.userId
 * @param {string}  ctx.sessionId
 * @param {number}  ctx.lat
 * @param {number}  ctx.lng
 * @param {number}  ctx.locationScore   
 * @param {boolean} ctx.isOffRoute
 * @param {number}  ctx.remainingKm
 * @param {string}  ctx.userName        
 * @returns {Promise<Alert[]>}
 */
export async function evaluateLocation({
  userId,
  sessionId,
  lat,
  lng,
  locationScore,
  isOffRoute    = false,
  remainingKm   = 0,
  userName      = "A SafeRoute user",
}) {
  await connectDB();

  const alerts = evaluateThresholds(locationScore, { isOffRoute, remainingKm });

  if (alerts.length && sessionId) {
    const now = new Date();
    await NavigationSession.findByIdAndUpdate(sessionId, {
      $push: {
        alertsTriggered: {
          $each: alerts.map((a) => ({
            type:     a.type,
            message:  a.message,
            location: { lat, lng },
            firedAt:  now,
          })),
        },
      },
    });
  }

  if (locationScore <= RISK_THRESHOLDS.LOW_SCORE_SOS && sessionId) {
    try {
      await triggerSOS({
        userId,
        userName,
        location:     { lat, lng },
        sessionId,
        safetyScore:  locationScore,
        triggerMethod: "auto_low_score",
      });

      alerts.push({
        type:    "danger",
        title:   "Auto-SOS Triggered",
        message: "Safety score critically low. SOS automatically sent to your emergency contacts.",
      });
    } catch (err) {
      console.error("[alertService] Auto-SOS failed:", err.message);
    }
  }

  return alerts;
}

export async function triggerManualSOS({ userId, userName, location, sessionId, safetyScore }) {
  return triggerSOS({
    userId,
    userName,
    location,
    sessionId,
    safetyScore,
    triggerMethod: "manual",
  });
}