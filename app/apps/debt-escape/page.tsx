import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { APP_SLUG, APP_NAME } from "@/lib/apps/debt-escape/config";
import DebtEscapeClient from "./DebtEscapeClient";

export const metadata: Metadata = {
  title: `${APP_NAME} — YesBundles Pro`,
  description:
    "Compare the Snowball and Avalanche debt-payoff strategies side by side, model an extra monthly payment, and get your debt-free date and total interest saved.",
};

type SearchParams = Promise<{ purchase?: string }>;

export default async function DebtEscapePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { purchase } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unlocked = false;
  if (user) {
    // Use the admin client and verify user_id manually — avoids RLS races on
    // the row the Stripe webhook may have just written, mirroring /success.
    const admin = createAdminClient();
    const { data: entitlement } = await admin
      .from("app_entitlements")
      .select("id")
      .eq("user_id", user.id)
      .eq("app_slug", APP_SLUG)
      .limit(1)
      .maybeSingle();
    unlocked = !!entitlement;
  }

  return (
    <DebtEscapeClient
      signedIn={!!user}
      unlocked={unlocked}
      justPurchased={purchase === "success"}
    />
  );
}
