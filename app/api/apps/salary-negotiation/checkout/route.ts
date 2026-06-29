import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  APP_SLUG,
  APP_ROUTE,
  APP_NAME,
  APP_PRICE_CENTS,
  PRODUCT_TYPE,
} from "@/lib/apps/salary-negotiation/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

// Standalone checkout for the Salary Negotiation Coach Pro app ($29).
// Mirrors the Debt Escape pattern exactly: inline price_data, metadata-stamped
// session with product_type=app_standalone so the shared Stripe webhook grants
// an app_entitlements row (app_slug=salary_negotiation) instead of a download.
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to purchase." },
        { status: 401 }
      );
    }

    // If the user already owns this app, don't let them pay twice.
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("app_entitlements")
      .select("id")
      .eq("user_id", user.id)
      .eq("app_slug", APP_SLUG)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already own this app.", alreadyOwned: true },
        { status: 409 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: APP_PRICE_CENTS,
            product_data: {
              name: APP_NAME,
              description:
                "Lifetime access — market benchmark, AI counter-offer script, email template & rebuttals.",
            },
          },
        },
      ],
      metadata: {
        site: "yesbundles",
        user_id: user.id,
        // Branch key the webhook switches on. Do NOT remove.
        product_type: PRODUCT_TYPE,
        app_slug: APP_SLUG,
        yesbundles_product_id: APP_SLUG,
        total_cents: String(APP_PRICE_CENTS),
      },
      success_url: `${siteUrl}${APP_ROUTE}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${APP_ROUTE}?purchase=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("App checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
