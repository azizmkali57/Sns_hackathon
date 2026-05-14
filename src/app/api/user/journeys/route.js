import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import connectDB from "@/lib/connectDB";
import Route from "@/Models/Route";
import Incident from "@/Models/Incident";

// GET /api/user/journeys
export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const routes = await Route.find({ userId: auth.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("source destination safetyScore routes createdAt");

    const journeys = routes.map((r) => {
      // Pull distance from first route option if available
      const distanceRaw = r.routes?.[0]?.distance;
      let distanceLabel = "—";
      if (distanceRaw) {
        const km = parseFloat(distanceRaw);
        distanceLabel = isNaN(km) ? distanceRaw : `${km.toFixed(1)}km`;
      }

      const score = r.safetyScore ?? 0;
      const color = score >= 80 ? "#39D353" : score >= 50 ? "#FFC857" : "#FF4D4D";

      // Format date relative to now
      const date = new Date(r.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      let dateLabel;
      if (diffDays === 0) {
        dateLabel = `Today, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
      } else if (diffDays === 1) {
        dateLabel = `Yesterday, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
      } else {
        dateLabel = `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
      }

      return {
        id: r._id,
        from: r.source,
        to: r.destination,
        score,
        color,
        date: dateLabel,
        distance: distanceLabel,
      };
    });

    // Total journeys count
    const totalJourneys = await Route.countDocuments({ userId: auth.user.id });

    // Avg score across all journeys
    const scoreAgg = await Route.aggregate([
      { $match: { userId: auth.user.id } },
      { $group: { _id: null, avg: { $avg: "$safetyScore" } } },
    ]);
    const avgScore = scoreAgg[0] ? Math.round(scoreAgg[0].avg) : 0;

    // Reports filed by user
    const reportsCount = await Incident.countDocuments({ userId: auth.user.id });

    return NextResponse.json({
      success: true,
      journeys,
      stats: { totalJourneys, avgScore, reportsCount },
    });
  } catch (error) {
    console.error("GET /api/user/journeys error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}