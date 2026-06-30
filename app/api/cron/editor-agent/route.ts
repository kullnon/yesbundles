import { NextResponse } from "next/server";
import { createBlogAdminClient } from "@/lib/blog/admin";
import { runEditor } from "@/lib/blog/engine";

// Editor agent — runs daily at 09:00 UTC (vercel.json). Picks the highest
// priority pending topic and creates a draft (title + meta + outline).
export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error("[cron/editor-agent] CRON_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const admin = createBlogAdminClient();
    const result = await runEditor(admin);
    console.log("[cron/editor-agent] draft created:", result.slug);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const err = e as { message?: string; stack?: string; name?: string };
    console.error("[cron/editor-agent] CRASH:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
    });
    return NextResponse.json({ error: err?.message ?? "Editor failed." }, { status: 500 });
  }
}

// Vercel Cron sends GET; allow POST for manual triggering too.
export const GET = handle;
export const POST = handle;
