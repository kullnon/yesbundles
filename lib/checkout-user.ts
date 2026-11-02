import type { User } from "@supabase/supabase-js";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isSynthetic } from "@/lib/synthetic";

/**
 * The buyer for a checkout route. Normally the cookie session. For a Flow Watchdog probe (valid
 * signed x-maestro-synthetic header, lib/synthetic.ts) the synthetic test user arrives with a
 * bearer token instead, and the session it gets is tagged and short-lived (see SYNTHETIC_SESSION).
 * A synthetic header alone grants nothing: the bearer token must still be a real user's.
 */
export async function checkoutUser(request: Request): Promise<{ user: User | null; synthetic: boolean }> {
  if (isSynthetic(request.headers, "yesbundles")) {
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return { user: null, synthetic: true };
    const { data, error } = await createAdminClient().auth.getUser(token);
    return { user: error ? null : data.user, synthetic: true };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, synthetic: false };
}

/** Extra Checkout Session params for a probe: the webhook ignores it; it expires in 31 min. */
export function syntheticSessionParams(synthetic: boolean): { expires_at?: number } {
  return synthetic ? { expires_at: Math.floor(Date.now() / 1000) + 31 * 60 } : {};
}
