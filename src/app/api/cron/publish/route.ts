import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { runPublishBatch } from "@/lib/publish/publisher";

export const runtime = "nodejs";
export const maxDuration = 60; // seconds; raise with your Vercel plan if a batch needs more headroom.

/** Vercel Cron invokes this with GET and automatically supplies `Bearer CRON_SECRET` (implementation.MD correction #5). */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runPublishBatch();
  return NextResponse.json(summary);
}
