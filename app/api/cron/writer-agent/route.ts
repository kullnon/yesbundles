import { NextResponse } from "next/server";
import { createBlogAdminClient } from "@/lib/blog/admin";
import { runWriter } from "@/lib/blog/engine";

// Writer agent — runs daily at 11:00 UTC (vercel.json). Finds the oldest draft,
// writes the full body via Anthropic, sanitizes (sanitize-html), injects/validates
// internal links against the allowlist, and publishes.
export const maxDuration = 300;
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
    console.error("[cron/writer-agent] CRON_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const admin = createBlogAdminClient();
    const result = await runWriter(admin);
    console.log("[cron/writer-agent] published:", result.slug);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const err = e as { message?: string; stack?: string; name?: string };
    console.error("[cron/writer-agent] CRASH:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
    });
    return NextResponse.json({ error: err?.message ?? "Writer failed." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
