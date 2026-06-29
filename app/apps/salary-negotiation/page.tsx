import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { APP_SLUG, APP_NAME } from "@/lib/apps/salary-negotiation/config";
import SalaryCoachClient from "./SalaryCoachClient";

export const metadata: Metadata = {
  title: `${APP_NAME} — YesBundles Pro`,
  description:
    "See how your job offer compares to the market, then get an AI-generated counter-offer script, email template, and rebuttals to common recruiter pushbacks.",
};

type SearchParams = Promise<{ purchase?: string }>;

export default async function SalaryNegotiationPage({
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
    // Admin client + manual user_id check — avoids RLS races on the row the
    // Stripe webhook may have just written (mirrors debt-escape & /success).
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
    <SalaryCoachClient
      signedIn={!!user}
      unlocked={unlocked}
      justPurchased={purchase === "success"}
    />
  );
}
