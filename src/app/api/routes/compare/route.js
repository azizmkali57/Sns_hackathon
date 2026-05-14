import { NextResponse } from "next/server";
import { compareRoutes } from "@/services/routeService.js";
import { verifyAuth } from "@/lib/auth";

export async function POST(req) {
  try {
            const auth = await verifyAuth(req);
            if (!auth.success || !auth.user?.id) {
              return NextResponse.json(
                {
                  success: false,
                  error: "Unauthorized — please sign in",
                },
                { status: 401 }
              );
            }
    
    const body = await req.json().catch(() => ({}));
    const { routeAId, routeBId } = body;

    if (!routeAId || !routeBId) {
      return NextResponse.json(
        { success: false, error: "Both routeAId and routeBId are required" },
        { status: 400 }
      );
    }

    if (routeAId === routeBId) {
      return NextResponse.json(
        { success: false, error: "routeAId and routeBId must be different" },
        { status: 400 }
      );
    }

    const result = await compareRoutes(routeAId, routeBId, auth.user.id);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/routes/compare]", err);
    const isUnauth = err.message === "Unauthorized";
    const isNotFound = err.message?.includes("not found");
    return NextResponse.json(
      { success: false, error: err.message ?? "Internal server error" },
      { status: isUnauth ? 403 : isNotFound ? 404 : 500 }
    );
  }
}