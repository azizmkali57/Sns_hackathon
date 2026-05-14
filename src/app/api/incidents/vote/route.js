import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import Incident from "@/Models/Incident";
import { verifyAuth } from "@/lib/auth";

// POST /api/incidents/vote  { incidentId }
export async function POST(req) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success || !auth.user?.id)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { incidentId } = await req.json().catch(() => ({}));
    if (!incidentId)
      return NextResponse.json({ success: false, error: "incidentId required" }, { status: 400 });

    await connectDB();

    const incident = await Incident.findById(incidentId);
    if (!incident)
      return NextResponse.json({ success: false, error: "Incident not found" }, { status: 404 });

    const userId   = auth.user.id;
    const alreadyVoted = incident.votedBy.some((id) => id.toString() === userId);

    if (alreadyVoted) {
      // Toggle off
      incident.votedBy = incident.votedBy.filter((id) => id.toString() !== userId);
      incident.votes   = Math.max(0, incident.votes - 1);
    } else {
      // Toggle on
      incident.votedBy.push(userId);
      incident.votes += 1;
    }

    await incident.save();

    return NextResponse.json({
      success: true,
      voted:  !alreadyVoted,
      votes:  incident.votes,
    });
  } catch (err) {
    console.error("[POST /api/incidents/vote]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}