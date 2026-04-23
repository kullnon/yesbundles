// lib/supabase/client.ts
// Browser-side Supabase client. Safe to use in Client Components.
// Uses the anon key — RLS policies protect the data.

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
