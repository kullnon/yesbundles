// app/api/tica-rerun/route.ts — Tica's relay for "re-run a failed job once" (GET ?path=/api/<job>).
//
// Tica (tica-telegram) cannot hold this project's CRON_SECRET: it is a Sensitive Vercel var that
// nobody can read back. She has her own secret, RERUN_SECRET_YESBUNDLES (Sensitive here and on
// tica-telegram), and this function calls the job for her with the real CRON_SECRET.
// Only the jobs in RERUNNABLE: never the editor agent.
// Ported from tripmoney's api/tica-rerun.js; any method is handled, as there.
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RERUNNABLE = new Set(["/api/cron/writer-agent"]);

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handler(req: Request) {
  const relaySecret = process.env.RERUN_SECRET_YESBUNDLES || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if (!relaySecret || !cronSecret) {
    return NextResponse.json({ error: "RERUN_SECRET_YESBUNDLES or CRON_SECRET missing on server" }, { status: 500 });
  }
  if (!sameSecret(req.headers.get("authorization") || "", `Bearer ${relaySecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const path = String(url.searchParams.get("path") || "");
  if (!RERUNNABLE.has(path)) {
    return NextResponse.json({ error: `not a job Tica may re-run: ${path.slice(0, 100)}` }, { status: 400 });
  }
  const started = Date.now();
  try {
    const r = await fetch(`${url.origin}${path}`, {
      headers: { authorization: `Bearer ${cronSecret}`, "x-rerun-by": "tica" },
      cache: "no-store",
    });
    const body = (await r.text()).slice(0, 300);
    console.log(JSON.stringify({ route: "tica-rerun", path, status: r.status, ms: Date.now() - started }));
    return NextResponse.json({ path, status: r.status, ms: Date.now() - started, body }, { status: r.ok ? 200 : 502 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ route: "tica-rerun", path, error: msg }));
    return NextResponse.json({ path, error: msg }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
