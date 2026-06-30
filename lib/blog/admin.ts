// lib/blog/admin.ts
//
// Service-role Supabase client for the blog engine (cron agents + server reads).
//
// ⚠️ HAZARD (PawSignal post-mortem): Next.js will silently cache the underlying
// fetch() that supabase-js uses in its Data Cache, so freshly-written rows can
// appear stale even on routes marked `export const dynamic = 'force-dynamic'`.
// `force-dynamic` does NOT cover the Data Cache. The fix is to force every
// Supabase request through fetch with `{ cache: 'no-store' }` — done here via a
// custom global.fetch. Use THIS client for all blog DB access.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

export function createBlogAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin env missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: noStoreFetch },
  });
}
