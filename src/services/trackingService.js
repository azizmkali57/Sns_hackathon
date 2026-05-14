import Tracking from "@/Models/Tracking.js";
import NavigationSession from "@/Models/NavigationSession.js";
import Route from "@/Models/Route.js";
import { geojsonToLatLng, routeProgress, bearing, haversineDistance } from "../lib/mapUtils.js";
import { scoreLocation } from "@/lib/routeAnalyzer.js";
import { evaluateLocation } from "./alertService.js";
import dbConnect from "@/lib/connectDB.js";

const OFF_ROUTE_THRESHOLD_KM = 0.2;

/**
 * @param {string} userId
 * @param {string} sessionId
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<TrackingUpdateResult>}
 */
export async function updateLiveLocation(userId, sessionId, lat, lng) {
  await dbConnect();

  const session = await NavigationSession.findById(sessionId);
  if (!session || session.status !== "active") {
    throw new Error("No active navigation session found");
  }

  const routeDoc = await Route.findById(session.routeId).lean();
  const planned  = routeDoc?.routes?.[session.selectedRouteIndex ?? 0];
  const routeCoords = planned?.geometry
    ? geojsonToLatLng(planned.geometry)
    : [];

  let progress = {
    closestIdx: 0,
    distanceToRoute: 0,
    remainingKm: 0,
    traveledKm: 0,
    progressPercent: 0,
  };

  if (routeCoords.length) {
    progress = routeProgress(lat, lng, routeCoords);
  }

  const isOffRoute = progress.distanceToRoute > OFF_ROUTE_THRESHOLD_KM;

  let speedKmh = 0;
  let headingDeg = 0;
  const prevTracking = await Tracking.findOne({ userId }).lean();

  if (prevTracking?.liveLocation) {
    const { lat: pLat, lng: pLng } = prevTracking.liveLocation;
    const distKm = haversineDistance(pLat, pLng, lat, lng);
    const timeDiffMs = Date.now() - new Date(prevTracking.updatedAt).getTime();
    const timeDiffHr = timeDiffMs / 3_600_000;
    if (timeDiffHr > 0) speedKmh = Math.round(distKm / timeDiffHr);
    headingDeg = Math.round(bearing(pLat, pLng, lat, lng));
  }

  const locationScorePromise = scoreLocation(lat, lng);

  const tracking = await Tracking.findOneAndUpdate(
    { userId },
    {
      userId,
      sessionId,
      routeId: session.routeId,
      liveLocation: { lat, lng },
      distanceFromRoute: progress.distanceToRoute,
      progressPercent:   progress.progressPercent,
      remainingKm:       progress.remainingKm,
      isOffRoute,
      speedKmh,
      heading: headingDeg,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  if (session.breadcrumbs.length < 500) {
    session.breadcrumbs.push({ lat, lng, timestamp: new Date() });
  }

  const dest = session.endLocation;
  const distToDest = haversineDistance(lat, lng, dest.lat, dest.lng);
  let journeyCompleted = false;

  if (distToDest < 0.05) {
    session.status  = "completed";
    session.endedAt = new Date();
    journeyCompleted = true;
  }

  await session.save();

  const { score: locationScore } = await locationScorePromise;
  tracking.locationSafetyScore = locationScore;
  await tracking.save();

  const alerts = await evaluateLocation({
  userId,
  sessionId,
  lat,
  lng,
  locationScore,
  isOffRoute,
  remainingKm: progress.remainingKm,
});

  return {
    success: true,
    progressPercent:   progress.progressPercent,
    remainingKm:       parseFloat(progress.remainingKm.toFixed(2)),
    distanceFromRoute: parseFloat(progress.distanceToRoute.toFixed(3)),
    isOffRoute,
    speedKmh,
    heading: headingDeg,
    locationScore,
    journeyCompleted,
    alerts,
  };
}

export async function getLastKnownLocation(userId) {
  await dbConnect();
  const record = await Tracking.findOne({ userId }).lean();
  if (!record) return null;

  return {
    lat:             record.liveLocation?.lat,
    lng:             record.liveLocation?.lng,
    progressPercent: record.progressPercent,
    remainingKm:     record.remainingKm,
    isOffRoute:      record.isOffRoute,
    speedKmh:        record.speedKmh,
    heading:         record.heading,
    locationScore:   record.locationSafetyScore,
    updatedAt:       record.updatedAt,
  };
}

export async function clearTracking(userId) {
  await dbConnect();
  await Tracking.deleteOne({ userId });
}